import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { LetterData, Employee } from "../types";
import { KOP_SURAT, TTE_ICON_BASE64 } from "../constants";

export async function generateSuratTugasPDF(
  data: LetterData,
  employees: Employee[]
) {
  const selectedEmployees = employees
    .filter((e) => data.selectedEmployeeIds.includes(e.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const isKolektif = selectedEmployees.length > 1;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Helper for text wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * lineHeight);
  };

  const drawPage = (pageDoc: jsPDF) => {
    // Kop Surat
    let currentY = 12.7;
    
    // Logo
    if (data.logoBase64) {
      try {
        const format = data.logoBase64.includes("image/jpeg") || data.logoBase64.includes("image/jpg") ? "JPEG" : "PNG";
        pageDoc.addImage(data.logoBase64, format, 12.7, currentY, 18, 22);
      } catch (e) {
        console.error("Failed to add logo to PDF", e);
      }
    }

    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(13);
    pageDoc.text(KOP_SURAT.pemda, 105, currentY + 4, { align: "center" });
    
    pageDoc.setFont("helvetica", "bold");
    pageDoc.setFontSize(15);
    pageDoc.text(KOP_SURAT.dinas, 105, currentY + 10, { align: "center" });
    
    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(11);
    pageDoc.text(KOP_SURAT.alamat, 105, currentY + 15, { align: "center" });
    pageDoc.text(KOP_SURAT.kontak, 105, currentY + 19, { align: "center" });

    // Line
    pageDoc.setLineWidth(0.5);
    pageDoc.line(12.7, currentY + 23, 197.3, currentY + 23);
    pageDoc.setLineWidth(0.2);
    pageDoc.line(12.7, currentY + 24, 197.3, currentY + 24);

    currentY += 34;

    // Judul
    pageDoc.setFont("helvetica", "bold");
    pageDoc.setFontSize(13);
    pageDoc.text("SURAT TUGAS", 105, currentY, { align: "center" });
    pageDoc.setLineWidth(0.3);
    const titleWidth = pageDoc.getTextWidth("SURAT TUGAS");
    pageDoc.line(105 - titleWidth/2, currentY + 1, 105 + titleWidth/2, currentY + 1);
    
    currentY += 7;
    pageDoc.setFont("helvetica", "normal");
    pageDoc.setFontSize(12);
    pageDoc.text(`Nomor: ${data.nomor}`, 105, currentY, { align: "center" });

    currentY += 15;

    // Dasar
    pageDoc.text("Dasar", 12.7, currentY);
    pageDoc.text(":", 45, currentY);
    pageDoc.text(data.dasar, 50, currentY, { maxWidth: 147.3, align: "justify" });
    const dasarLines = pageDoc.splitTextToSize(data.dasar, 147.3);
    currentY += (dasarLines.length * 5);

    currentY += 5;
    pageDoc.setFont("helvetica", "bold");
    pageDoc.text("MEMERINTAHKAN", 105, currentY, { align: "center" });
    
    currentY += 10;
    pageDoc.setFont("helvetica", "normal");
    pageDoc.text("Kepada", 12.7, currentY);
    pageDoc.text(":", 45, currentY);

    if (isKolektif) {
      pageDoc.text("Nama", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text("Terlampir", 83, currentY);
      currentY += 5;
      pageDoc.text("Pangkat / Gol", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text("Terlampir", 83, currentY);
      currentY += 5;
      pageDoc.text("NIP", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text("Terlampir", 83, currentY);
      currentY += 5;
      pageDoc.text("Jabatan", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text("Terlampir", 83, currentY);
    } else if (selectedEmployees.length > 0) {
      const emp = selectedEmployees[0];
      pageDoc.text("Nama", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text(emp.name, 83, currentY);
      currentY += 5;
      pageDoc.text("Pangkat / Gol", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text(emp.pangkatGol, 83, currentY);
      currentY += 5;
      pageDoc.text("NIP", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text(emp.nip, 83, currentY);
      currentY += 5;
      pageDoc.text("Jabatan", 50, currentY);
      pageDoc.text(":", 80, currentY);
      pageDoc.text(emp.jabatan, 83, currentY);
    }

    currentY += 10;
    pageDoc.text("Untuk", 12.7, currentY);
    pageDoc.text(":", 45, currentY);
    
    const fullUntuk = `${data.untuk}, yang dilaksanakan pada:`;
    pageDoc.text(fullUntuk, 50, currentY, { maxWidth: 147.3, align: "justify" });
    const untukLines = pageDoc.splitTextToSize(fullUntuk, 147.3);
    currentY += (untukLines.length * 5);
    
    currentY += 5;
    const tglMulai = parseISO(data.tanggalMulai);
    const tglSelesai = parseISO(data.tanggalSelesai);
    let hariTanggalStr = "";
    if (data.tanggalMulai === data.tanggalSelesai) {
      hariTanggalStr = format(tglMulai, "EEEE, d MMMM yyyy", { locale: id });
    } else {
      hariTanggalStr = `${format(tglMulai, "EEEE, d MMMM", { locale: id })} - ${format(tglSelesai, "EEEE, d MMMM yyyy", { locale: id })}`;
    }
    pageDoc.text("Hari, Tanggal", 50, currentY);
    pageDoc.text(":", 80, currentY);
    pageDoc.text(hariTanggalStr, 83, currentY);

    currentY += 5;
    const waktuStr = data.isWaktuSelesai
      ? `${data.waktuMulai} WIB s.d. selesai`
      : `${data.waktuMulai} - ${data.waktuSelesai} WIB`;
    pageDoc.text("Pukul", 50, currentY);
    pageDoc.text(":", 80, currentY);
    pageDoc.text(waktuStr, 83, currentY);

    currentY += 5;
    pageDoc.text("Tempat", 50, currentY);
    pageDoc.text(":", 80, currentY);
    pageDoc.text(data.tempat, 83, currentY);

    currentY += 15;
    currentY = addWrappedText("Surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan dipergunakan sebagaimana mestinya.", 12.7, currentY, 184.6, 5);

    currentY += 20;
    const tglSurat = parseISO(data.tanggalSurat);
    pageDoc.text(`Jember, ${format(tglSurat, "d MMMM yyyy", { locale: id })}`, 140, currentY, { align: "center" });
    
    currentY += 25;
    pageDoc.text("#", 140, currentY, { align: "center" });

    // Footer
    pageDoc.setFontSize(8);
    pageDoc.setFont("helvetica", "italic");
    
    const tteIcon = data.tteIconBase64 || "data:image/png;base64," + TTE_ICON_BASE64;
    try {
      const format = tteIcon.includes("image/jpeg") || tteIcon.includes("image/jpg") ? "JPEG" : "PNG";
      pageDoc.addImage(tteIcon, format, 12.7, 280, 8, 8);
    } catch (e) {
      console.error("Failed to add TTE icon to PDF", e);
    }
    
    addWrappedText("Dokumen ini telah ditandatangani secara elektronik dengan menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE) Badan Siber dan Sandi Negara.", 23, 283, 174.3, 3);
  };

  drawPage(doc);

  if (isKolektif) {
    doc.addPage("a4", "l");
    let currentY = 12.7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const lampiranX = 200; 
    const colonX = 218;
    const valueX = 221;

    doc.text("Lampiran", lampiranX, currentY);
    currentY += 5;
    
    doc.text("Nomor", lampiranX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(data.nomor, valueX, currentY);
    
    currentY += 5;
    const tglSurat = parseISO(data.tanggalSurat);
    doc.text("Tanggal", lampiranX, currentY);
    doc.text(":", colonX, currentY);
    doc.text(format(tglSurat, "d MMMM yyyy", { locale: id }), valueX, currentY);

    currentY += 15;
    
    // Table using jspdf-autotable
    autoTable(doc, {
      startY: currentY,
      head: [['NO', 'NAMA', 'NIP', 'PANGKAT / GOL', 'JABATAN']],
      body: selectedEmployees.map((emp, index) => [
        (index + 1).toString(),
        emp.name,
        emp.nip,
        emp.pangkatGol,
        emp.jabatan
      ]),
      theme: 'grid',
      showHead: 'everyPage',
      styles: { fontSize: 12 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        cellPadding: 3
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: 'middle',
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 13 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 50 },
        3: { halign: 'center', cellWidth: 55 },
        4: { cellWidth: 'auto' }
      },
      margin: { left: 12.7, right: 12.7 }
    });

    // Get the Y position after the table
    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    
    const tteIcon = data.tteIconBase64 || "data:image/png;base64," + TTE_ICON_BASE64;
    try {
      const format = tteIcon.includes("image/jpeg") || tteIcon.includes("image/jpg") ? "JPEG" : "PNG";
      doc.addImage(tteIcon, format, 12.7, 192.3, 8, 8);
    } catch (e) {
      console.error("Failed to add TTE icon to PDF", e);
    }
    
    addWrappedText("Dokumen ini telah ditandatangani secara elektronik dengan menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE) Badan Siber dan Sandi Negara.", 23, 195.3, 261.3, 3);
  }

  doc.save(`Surat Tugas - ${data.nomor.replace(/\//g, "-")}.pdf`);
}
