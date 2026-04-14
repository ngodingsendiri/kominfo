import fs from 'fs';

let content = fs.readFileSync('src/lib/generateDoc.ts', 'utf8');

// Fix KOP_SURAT
content = content.replace(/text: KOP_SURAT\.pemda, size: \d+/g, 'text: KOP_SURAT.pemda, size: 26'); // 12 -> 13
content = content.replace(/text: KOP_SURAT\.dinas, bold: true, size: \d+/g, 'text: KOP_SURAT.dinas, bold: true, size: 30'); // 14 -> 15
content = content.replace(/text: KOP_SURAT\.alamat, size: \d+/g, 'text: KOP_SURAT.alamat, size: 22'); // 10 -> 11
content = content.replace(/text: KOP_SURAT\.kontak, size: \d+/g, 'text: KOP_SURAT.kontak, size: 22'); // 10 -> 11

// Fix SURAT TUGAS
content = content.replace(/text: "SURAT TUGAS", bold: true, underline: \{\}, size: \d+/g, 'text: "SURAT TUGAS", bold: true, underline: {}, size: 26'); // 12 -> 13

// Fix Nomor
content = content.replace(/text: `Nomor: \$\{data\.nomor\}`, size: \d+/g, 'text: `Nomor: ${data.nomor}`, size: 24'); // 11 -> 12

// Fix Dasar, Kepada, Untuk
content = content.replace(/text: "Dasar", size: \d+/g, 'text: "Dasar", size: 24');
content = content.replace(/text: ":", size: \d+/g, 'text: ":", size: 24');
content = content.replace(/text: data\.dasar, size: \d+/g, 'text: data.dasar, size: 24');
content = content.replace(/text: "MEMERINTAHKAN", bold: true, size: \d+/g, 'text: "MEMERINTAHKAN", bold: true, size: 24');
content = content.replace(/text: "Kepada", size: \d+/g, 'text: "Kepada", size: 24');
content = content.replace(/text: "Nama", size: \d+/g, 'text: "Nama", size: 24');
content = content.replace(/text: "Terlampir", size: \d+/g, 'text: "Terlampir", size: 24');
content = content.replace(/text: "Pangkat \/ Gol", size: \d+/g, 'text: "Pangkat / Gol", size: 24');
content = content.replace(/text: "NIP", size: \d+/g, 'text: "NIP", size: 24');
content = content.replace(/text: "Jabatan", size: \d+/g, 'text: "Jabatan", size: 24');
content = content.replace(/text: selectedEmployees\[0\]\.name, size: \d+/g, 'text: selectedEmployees[0].name, size: 24');
content = content.replace(/text: selectedEmployees\[0\]\.pangkatGol, size: \d+/g, 'text: selectedEmployees[0].pangkatGol, size: 24');
content = content.replace(/text: selectedEmployees\[0\]\.nip, size: \d+/g, 'text: selectedEmployees[0].nip, size: 24');
content = content.replace(/text: selectedEmployees\[0\]\.jabatan, size: \d+/g, 'text: selectedEmployees[0].jabatan, size: 24');
content = content.replace(/text: "Untuk", size: \d+/g, 'text: "Untuk", size: 24');
content = content.replace(/text: data\.untuk, size: \d+/g, 'text: data.untuk, size: 24');
content = content.replace(/text: ", yang dilaksanakan pada:", size: \d+/g, 'text: ", yang dilaksanakan pada:", size: 24');
content = content.replace(/text: "Hari, Tanggal", size: \d+/g, 'text: "Hari, Tanggal", size: 24');
content = content.replace(/text: hariTanggalStr, size: \d+/g, 'text: hariTanggalStr, size: 24');
content = content.replace(/text: "Pukul", size: \d+/g, 'text: "Pukul", size: 24');
content = content.replace(/text: waktuStr, size: \d+/g, 'text: waktuStr, size: 24');
content = content.replace(/text: "Tempat", size: \d+/g, 'text: "Tempat", size: 24');
content = content.replace(/text: data\.tempat, size: \d+/g, 'text: data.tempat, size: 24');
content = content.replace(/size: \d+,\n\s*children: \[new TextRun\(\{ text: "Surat tugas ini dibuat/g, 'size: 24,\n                                children: [new TextRun({ text: "Surat tugas ini dibuat');

// Fix Tanda Tangan
content = content.replace(/text: `Jember, \$\{format\(tglSurat, "d MMMM yyyy", \{ locale: id \}\)\}`, size: \d+/g, 'text: `Jember, ${format(tglSurat, "d MMMM yyyy", { locale: id })}`, size: 24');
content = content.replace(/text: "#", size: \d+/g, 'text: "#", size: 24');

// Fix Lampiran
content = content.replace(/text: "Lampiran", size: \d+/g, 'text: "Lampiran", size: 24');
content = content.replace(/text: "", size: \d+/g, 'text: "", size: 24');
content = content.replace(/text: "Nomor", size: \d+/g, 'text: "Nomor", size: 24');
content = content.replace(/text: "Tanggal", size: \d+/g, 'text: "Tanggal", size: 24');
content = content.replace(/text: format\(tglSurat, "d MMMM yyyy", \{ locale: id \}\), size: \d+/g, 'text: format(tglSurat, "d MMMM yyyy", { locale: id }), size: 24');

// Fix Lampiran Table Header
content = content.replace(/text: "NO", bold: true, size: \d+/g, 'text: "NO", bold: true, size: 22');
content = content.replace(/text: "NAMA", bold: true, size: \d+/g, 'text: "NAMA", bold: true, size: 22');
content = content.replace(/text: "NIP", bold: true, size: \d+/g, 'text: "NIP", bold: true, size: 22');
content = content.replace(/text: "PANGKAT \/ GOL", bold: true, size: \d+/g, 'text: "PANGKAT / GOL", bold: true, size: 22');
content = content.replace(/text: "JABATAN", bold: true, size: \d+/g, 'text: "JABATAN", bold: true, size: 22');

// Fix Lampiran Table Content
content = content.replace(/text: \(index \+ 1\)\.toString\(\), size: \d+/g, 'text: (index + 1).toString(), size: 22');
content = content.replace(/text: emp\.name, size: \d+/g, 'text: emp.name, size: 22');
content = content.replace(/text: emp\.nip, size: \d+/g, 'text: emp.nip, size: 22');
content = content.replace(/text: emp\.pangkatGol, size: \d+/g, 'text: emp.pangkatGol, size: 22');
content = content.replace(/text: emp\.jabatan, size: \d+/g, 'text: emp.jabatan, size: 22');

fs.writeFileSync('src/lib/generateDoc.ts', content);
console.log('Done fixing generateDoc.ts');
