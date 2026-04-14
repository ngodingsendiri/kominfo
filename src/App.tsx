import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, FileText, Download, Users, Calendar, MapPin, Clock, Hash, Info, Upload, Edit2, X, ChevronRight, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { format, parseISO, parse } from "date-fns";
import { id } from "date-fns/locale";
import DatePicker, { registerLocale } from "react-datepicker";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
import { Employee, LetterData, LetterHistory } from "./types";
import { DEFAULT_EMPLOYEES } from "./constants";
import { generateSuratTugas } from "./lib/generateDoc";
import { generateSuratTugasPDF } from "./lib/generatePdf";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, setDoc, deleteDoc, getDoc, query, orderBy } from "firebase/firestore";

registerLocale("id", id);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [history, setHistory] = useState<LetterHistory[]>([]);
  const [todayStr] = useState(format(new Date(), "yyyy-MM-dd"));

  const [formData, setFormData] = useState<LetterData>({
    nomor: "",
    dasar: "",
    untuk: "",
    tanggalSurat: todayStr,
    tanggalMulai: todayStr,
    tanggalSelesai: todayStr,
    waktuMulai: "08:00",
    waktuSelesai: "16:00",
    isWaktuSelesai: true,
    tempat: "",
    selectedEmployeeIds: [],
  });

  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setEmployees([]);
      return;
    }

    const employeesPath = `users/${user.uid}/employees`;
    const unsubscribeEmployees = onSnapshot(collection(db, employeesPath), (snapshot) => {
      const emps: Employee[] = [];
      snapshot.forEach((doc) => {
        emps.push(doc.data() as Employee);
      });
      setEmployees(emps.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, employeesPath);
    });

    const historyPath = `users/${user.uid}/history`;
    const q = query(collection(db, historyPath), orderBy("timestamp", "desc"));
    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const hist: LetterHistory[] = [];
      snapshot.forEach((doc) => {
        hist.push(doc.data() as LetterHistory);
      });
      setHistory(hist);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, historyPath);
    });

    const settingsPath = `users/${user.uid}/settings/general`;
    const unsubscribeSettings = onSnapshot(doc(db, settingsPath), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(prev => ({
          ...prev,
          logoBase64: data.logoBase64 || prev.logoBase64,
          tteIconBase64: data.tteIconBase64 || prev.tteIconBase64
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, settingsPath);
    });

    return () => {
      unsubscribeEmployees();
      unsubscribeHistory();
      unsubscribeSettings();
    };
  }, [user, isAuthReady]);

  const updateSettings = async (updates: Partial<LetterData>) => {
    if (!user) return;
    const settingsPath = `users/${user.uid}/settings/general`;
    try {
      const payload: Record<string, string> = {};
      if (updates.logoBase64 !== undefined) payload.logoBase64 = updates.logoBase64;
      if (updates.tteIconBase64 !== undefined) payload.tteIconBase64 = updates.tteIconBase64;
      
      await setDoc(doc(db, settingsPath), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, settingsPath);
    }
  };

  const handleSaveEmployee = async () => {
    if (editingEmployee?.name && editingEmployee?.nip && user) {
      const employeeId = editingEmployee.id || crypto.randomUUID();
      const employee: Employee = {
        id: employeeId,
        name: editingEmployee.name!,
        nip: editingEmployee.nip!,
        pangkatGol: editingEmployee.pangkatGol || "-",
        jabatan: editingEmployee.jabatan || "-",
        order: editingEmployee.order || Date.now(),
      };
      
      const path = `users/${user.uid}/employees/${employeeId}`;
      try {
        await setDoc(doc(db, path), employee);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
      
      setEditingEmployee(null);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/employees/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
    setFormData((prev) => ({
      ...prev,
      selectedEmployeeIds: prev.selectedEmployeeIds.filter((eid) => eid !== id),
    }));
  };

  const toggleEmployeeSelection = (id: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedEmployeeIds.includes(id);
      return {
        ...prev,
        selectedEmployeeIds: isSelected
          ? prev.selectedEmployeeIds.filter((eid) => eid !== id)
          : [...prev.selectedEmployeeIds, id],
      };
    });
  };

  const saveHistory = async () => {
    if (!user) return;
    const historyId = crypto.randomUUID();
    const historyItem: LetterHistory = {
      id: historyId,
      timestamp: Date.now(),
      formData: JSON.stringify(formData),
    };
    const path = `users/${user.uid}/history/${historyId}`;
    try {
      await setDoc(doc(db, path), historyItem);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleGenerate = async () => {
    if (formData.selectedEmployeeIds.length === 0) {
      alert("Pilih setidaknya satu pegawai!");
      return;
    }
    await generateSuratTugas(formData, employees);
    await saveHistory();
  };

  const handleGeneratePDF = async () => {
    if (formData.selectedEmployeeIds.length === 0) {
      alert("Pilih setidaknya satu pegawai!");
      return;
    }
    await generateSuratTugasPDF(formData, employees);
    await saveHistory();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ Nama: "", NIP: "", "Pangkat / Gol": "", Jabatan: "" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Pegawai");
    XLSX.writeFile(wb, "Template_Pegawai.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newEmployees: Employee[] = json.map((row, index) => ({
          id: crypto.randomUUID(),
          name: row.Nama || row.nama || row.NAME || "",
          nip: String(row.NIP || row.nip || ""),
          pangkatGol: row["Pangkat / Gol"] || row.Pangkat || row.Golongan || "-",
          jabatan: row.Jabatan || row.jabatan || "-",
          order: Date.now() + index, // Preserve order using timestamp + index
        })).filter(e => e.name && e.nip);

        if (newEmployees.length > 0 && user) {
          newEmployees.forEach(async (emp) => {
            const path = `users/${user.uid}/employees/${emp.id}`;
            try {
              await setDoc(doc(db, path), emp);
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, path);
            }
          });
        }
      } catch (error) {
        console.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isKolektif = formData.selectedEmployeeIds.length > 1;

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="bg-primary-900 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-900/20">
            <FileText size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">DIGITAL TUGAS</h1>
          <p className="text-slate-500 mb-8">Dinas Komunikasi dan Informatika Jember</p>
          <button
            onClick={handleLogin}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <LogIn size={20} />
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 relative overflow-x-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200 flex flex-row items-center justify-between gap-2 md:gap-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-primary-900 p-2 md:p-2.5 rounded-lg shadow-lg shadow-primary-900/10 shrink-0">
              <FileText size={20} className="text-white md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold tracking-tight text-slate-900 uppercase">
                DIGITAL TUGAS
              </h1>
              <p className="hidden md:block text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em]">
                Dinas Komunikasi dan Informatika Jember
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 md:gap-4">
            {/* Simple Logo Uploads in Header */}
            <div className="flex items-center gap-3 md:gap-4 pl-0 md:pl-4 md:border-l border-slate-100">
              {/* Logo Instansi */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Logo Instansi</p>
                  <input
                    type="file"
                    id="header-logo"
                    accept="image/png, image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const base64 = evt.target?.result as string;
                          setFormData({ ...formData, logoBase64: base64 });
                          updateSettings({ logoBase64: base64 });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="header-logo" className="text-[9px] md:text-[10px] font-bold text-primary-600 hover:text-primary-700 cursor-pointer transition-colors">
                    {formData.logoBase64 ? "Ganti" : "Unggah"}
                  </label>
                </div>
                
                <label htmlFor="header-logo" className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 relative group cursor-pointer shrink-0">
                  {formData.logoBase64 ? (
                    <>
                      <img src={formData.logoBase64} alt="Logo" className="max-w-[80%] max-h-[80%] object-contain" />
                      <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setFormData({...formData, logoBase64: undefined}); 
                          updateSettings({ logoBase64: "" });
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={8} />
                      </button>
                    </>
                  ) : (
                    <Upload size={14} className="text-slate-400" />
                  )}
                </label>
              </div>

              {/* Logo TTE */}
              <div className="flex items-center gap-2 pl-2 md:pl-4 border-l border-slate-100">
                <div className="hidden sm:block text-right">
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 md:mb-1">Logo TTE</p>
                  <input
                    type="file"
                    id="header-tte-logo"
                    accept="image/png, image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const base64 = evt.target?.result as string;
                          setFormData({ ...formData, tteIconBase64: base64 });
                          updateSettings({ tteIconBase64: base64 });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="header-tte-logo" className="text-[9px] md:text-[10px] font-bold text-primary-600 hover:text-primary-700 cursor-pointer transition-colors">
                    {formData.tteIconBase64 ? "Ganti" : "Unggah"}
                  </label>
                </div>
                
                <label htmlFor="header-tte-logo" className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 relative group cursor-pointer shrink-0">
                  {formData.tteIconBase64 ? (
                    <>
                      <img src={formData.tteIconBase64} alt="TTE Logo" className="max-w-[80%] max-h-[80%] object-contain" />
                      <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          setFormData({...formData, tteIconBase64: undefined}); 
                          updateSettings({ tteIconBase64: "" });
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={8} />
                      </button>
                    </>
                  ) : (
                    <Upload size={14} className="text-slate-400" />
                  )}
                </label>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 md:ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </motion.header>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm border border-slate-200 w-full md:w-fit mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === "form"
                ? "bg-primary-900 text-white shadow-md shadow-primary-900/20"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Buat Surat
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === "history"
                ? "bg-primary-900 text-white shadow-md shadow-primary-900/20"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            History Cetak
          </button>
        </div>

        {activeTab === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Form Section */}
            <div className="lg:col-span-8 space-y-6 md:space-y-8">
              <motion.section 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-slate-200"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-3 uppercase">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Info size={18} className="text-primary-700" />
                  </div>
                  DETAIL SURAT
                </h2>
                <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Administrasi
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Hash size={12} className="text-primary-500" /> Nomor Surat
                  </label>
                  <input
                    type="text"
                    value={formData.nomor}
                    onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                    className="input-field"
                    placeholder={`Contoh: 800.1.11.1/${Math.floor(Math.random() * 1000)}/35.09.323/${new Date().getFullYear()}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} className="text-primary-500" /> Tanggal Surat
                  </label>
                  <DatePicker
                    selected={formData.tanggalSurat ? parseISO(formData.tanggalSurat) : null}
                    onChange={(date) => setFormData({ ...formData, tanggalSurat: date ? format(date, "yyyy-MM-dd") : "" })}
                    dateFormat="dd MMMM yyyy"
                    locale="id"
                    className="input-field"
                    wrapperClassName="w-full"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dasar Penugasan</label>
                  <textarea
                    rows={2}
                    value={formData.dasar}
                    onChange={(e) => setFormData({ ...formData, dasar: e.target.value })}
                    className="input-field resize-none"
                    placeholder="Contoh: Pelaksanaan rencana kerja Sekretariat Dinas Komunikasi dan Informatika Kabupaten Jember..."
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tujuan Penugasan (Untuk)</label>
                  <textarea
                    rows={2}
                    value={formData.untuk}
                    onChange={(e) => setFormData({ ...formData, untuk: e.target.value })}
                    className="input-field resize-none"
                    placeholder="Contoh: Rapat Koordinasi Manajemen Talenta Aparatur Sipil Negara"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} className="text-primary-500" /> Tanggal Mulai
                  </label>
                  <DatePicker
                    selected={formData.tanggalMulai ? parseISO(formData.tanggalMulai) : null}
                    onChange={(date) => setFormData({ ...formData, tanggalMulai: date ? format(date, "yyyy-MM-dd") : "" })}
                    dateFormat="dd MMMM yyyy"
                    locale="id"
                    className="input-field"
                    wrapperClassName="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} className="text-primary-500" /> Tanggal Selesai
                  </label>
                  <DatePicker
                    selected={formData.tanggalSelesai ? parseISO(formData.tanggalSelesai) : null}
                    minDate={formData.tanggalMulai ? parseISO(formData.tanggalMulai) : null}
                    onChange={(date) => setFormData({ ...formData, tanggalSelesai: date ? format(date, "yyyy-MM-dd") : "" })}
                    dateFormat="dd MMMM yyyy"
                    locale="id"
                    className="input-field"
                    wrapperClassName="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={12} className="text-primary-500" /> Waktu Mulai
                  </label>
                  <DatePicker
                    selected={formData.waktuMulai ? parse(formData.waktuMulai, "HH:mm", new Date()) : null}
                    onChange={(date) => setFormData({ ...formData, waktuMulai: date ? format(date, "HH:mm") : "" })}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Waktu"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm"
                    className="input-field"
                    wrapperClassName="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Clock size={12} className="text-primary-500" /> Waktu Selesai
                    </label>
                    <label className="flex items-center gap-2 text-[9px] font-bold text-primary-700 cursor-pointer bg-primary-50 px-2 py-0.5 rounded-md border border-primary-100 uppercase tracking-wider">
                      <input 
                        type="checkbox" 
                        checked={formData.isWaktuSelesai}
                        onChange={(e) => setFormData({ ...formData, isWaktuSelesai: e.target.checked })}
                        className="accent-primary-600 w-3 h-3"
                      />
                      s.d. Selesai
                    </label>
                  </div>
                  <DatePicker
                    selected={formData.waktuSelesai ? parse(formData.waktuSelesai, "HH:mm", new Date()) : null}
                    onChange={(date) => setFormData({ ...formData, waktuSelesai: date ? format(date, "HH:mm") : "" })}
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption="Waktu"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm"
                    disabled={formData.isWaktuSelesai}
                    className={`input-field ${formData.isWaktuSelesai ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}`}
                    wrapperClassName="w-full"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={12} className="text-primary-500" /> Lokasi Penugasan
                  </label>
                  <input
                    type="text"
                    value={formData.tempat}
                    onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
                    className="input-field"
                    placeholder="Contoh: BKPSDM Kabupaten Jember"
                  />
                </div>
              </div>
            </motion.section>

            {/* Minimalist Summary Section */}
            <motion.section 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900 px-6 py-4 rounded-xl shadow-sm text-white flex flex-wrap items-center justify-between gap-4 border border-white/5"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-xs font-bold">
                    {isKolektif ? "K" : "P"}
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Format</p>
                    <p className="text-[11px] md:text-xs font-bold">{isKolektif ? "Kolektif" : "Perseorangan"}</p>
                  </div>
                </div>
                
                <div className="w-px h-8 bg-white/10" />
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold">
                    {formData.selectedEmployeeIds.length}
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Personel</p>
                    <p className="text-[11px] md:text-xs font-bold">Terpilih</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                <CheckCircle2 size={14} className="text-primary-400" />
                Siap Cetak A4
              </div>
            </motion.section>
          </div>

          {/* Employee Side Panel */}
          <div className="lg:col-span-4">
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:sticky lg:top-8 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col lg:h-[calc(100vh-6rem)] overflow-hidden"
            >
              <div className="p-4 md:p-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold flex items-center gap-2 text-slate-800 uppercase">
                    <Users size={16} className="text-primary-600" />
                    DATA PEGAWAI
                  </h2>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {employees.length} Total
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditingEmployee({ name: "", nip: "", pangkatGol: "", jabatan: "" })}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Plus size={14} /> Tambah
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-[10px] font-bold border border-slate-200 uppercase tracking-wider"
                  >
                    <Upload size={14} /> Import
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={downloadTemplate}
                    className="text-[9px] text-slate-400 hover:text-primary-600 transition-colors font-bold uppercase tracking-widest"
                  >
                    Template Excel
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportExcel} 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Editing Form Overlay */}
              <AnimatePresence>
                {editingEmployee && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50 border-b border-slate-200 overflow-hidden"
                  >
                    <div className="p-4 md:p-5 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{editingEmployee.id ? "Edit Pegawai" : "Pegawai Baru"}</h3>
                        <button onClick={() => setEditingEmployee(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      </div>
                      <input
                        placeholder="Nama Lengkap & Gelar"
                        value={editingEmployee.name}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                        className="input-field"
                      />
                      <input
                        placeholder="NIP"
                        value={editingEmployee.nip}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, nip: e.target.value })}
                        className="input-field"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Pangkat/Gol"
                          value={editingEmployee.pangkatGol}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, pangkatGol: e.target.value })}
                          className="input-field"
                        />
                        <input
                          placeholder="Jabatan"
                          value={editingEmployee.jabatan}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, jabatan: e.target.value })}
                          className="input-field"
                        />
                      </div>
                      <button
                        onClick={handleSaveEmployee}
                        className="btn-primary w-full bg-primary-700 hover:bg-primary-800 py-2.5"
                      >
                        Simpan Data
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Employee List */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar bg-slate-50/30 max-h-[400px] lg:max-h-none">
                {employees.map((emp) => {
                  const isSelected = formData.selectedEmployeeIds.includes(emp.id);
                  return (
                    <motion.div 
                      layout
                      key={emp.id} 
                      className={`group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
                        isSelected 
                          ? "bg-white border-primary-500 shadow-sm ring-1 ring-primary-500/10" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => toggleEmployeeSelection(emp.id)}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${
                        isSelected ? "bg-primary-600 border-primary-600" : "border-slate-300 group-hover:border-slate-400"
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-[11px] truncate leading-tight ${isSelected ? "text-primary-800" : "text-slate-900"}`}>
                          {emp.name}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 truncate tracking-wider uppercase mt-0.5">NIP. {emp.nip}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingEmployee(emp); }}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                {employees.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <Users size={32} className="opacity-20 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest italic">Database Kosong</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 md:p-5 border-t border-slate-100 bg-white">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={formData.selectedEmployeeIds.length === 0}
                    className={`btn-primary w-full py-3 tracking-wider uppercase text-[10px] ${
                      formData.selectedEmployeeIds.length === 0 
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                        : "bg-primary-700 hover:bg-primary-800"
                    }`}
                  >
                    <Download size={16} />
                    CETAK DOC
                  </button>
                  <button
                    onClick={handleGeneratePDF}
                    disabled={formData.selectedEmployeeIds.length === 0}
                    className={`btn-primary w-full py-3 tracking-wider uppercase text-[10px] ${
                      formData.selectedEmployeeIds.length === 0 
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                        : "bg-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <FileText size={16} />
                    CETAK PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
        ) : (
          <div className="bg-white p-5 md:p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-3 uppercase">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <Clock size={18} className="text-primary-700" />
                </div>
                HISTORY CETAK
              </h2>
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock size={48} className="mx-auto mb-4 text-slate-300" />
                <p>Belum ada history cetak surat.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => {
                  let data: LetterData;
                  try {
                    data = JSON.parse(item.formData);
                  } catch (e) {
                    return null;
                  }
                  
                  return (
                    <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-primary-200 transition-colors gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">
                            {format(new Date(item.timestamp), "dd MMM yyyy HH:mm", { locale: id })}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {data.nomor || "Tanpa Nomor"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          Untuk: {data.untuk}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {data.selectedEmployeeIds.length} Pegawai
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setFormData(data);
                            setActiveTab("form");
                          }}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Edit2 size={14} />
                          Edit & Cetak Ulang
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm("Hapus history ini?")) {
                              try {
                                await deleteDoc(doc(db, `users/${user!.uid}/history/${item.id}`));
                              } catch (error) {
                                handleFirestoreError(error, OperationType.DELETE, `users/${user!.uid}/history/${item.id}`);
                              }
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus History"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
