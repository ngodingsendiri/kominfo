export interface Employee {
  id: string;
  name: string;
  nip: string;
  pangkatGol: string;
  jabatan: string;
  order?: number;
}

export interface LetterData {
  nomor: string;
  dasar: string;
  untuk: string;
  tanggalSurat: string; // YYYY-MM-DD
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  waktuMulai: string; // HH:mm
  waktuSelesai: string; // HH:mm
  isWaktuSelesai: boolean; // true if "s.d. selesai"
  tempat: string;
  selectedEmployeeIds: string[];
  logoBase64?: string;
  tteIconBase64?: string;
}

export interface Signatory {
  name: string;
  pangkatGol: string;
  nip: string;
  jabatan: string;
}

export interface LetterHistory {
  id: string;
  timestamp: number;
  formData: string; // JSON stringified LetterData
}
