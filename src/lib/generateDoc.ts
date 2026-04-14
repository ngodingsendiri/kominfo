import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  ImageRun,
  PageOrientation,
  SectionType,
  LineRuleType,
} from "docx";
import { saveAs } from "file-saver";
import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { LetterData, Employee } from "../types";
import { KOP_SURAT, TTE_ICON_BASE64 } from "../constants";

export async function generateSuratTugas(
  data: LetterData,
  employees: Employee[]
) {
  const selectedEmployees = employees
    .filter((e) => data.selectedEmployeeIds.includes(e.id))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const isKolektif = selectedEmployees.length > 1;

  // Format Dates
  const tglMulai = parseISO(data.tanggalMulai);
  const tglSelesai = parseISO(data.tanggalSelesai);
  const tglSurat = parseISO(data.tanggalSurat);

  let hariTanggalStr = "";
  if (data.tanggalMulai === data.tanggalSelesai) {
    hariTanggalStr = format(tglMulai, "EEEE, d MMMM yyyy", { locale: id });
  } else {
    hariTanggalStr = `${format(tglMulai, "EEEE, d MMMM", { locale: id })} - ${format(tglSelesai, "EEEE, d MMMM yyyy", { locale: id })}`;
  }

  const waktuStr = data.isWaktuSelesai
    ? `${data.waktuMulai} WIB s.d. selesai`
    : `${data.waktuMulai} - ${data.waktuSelesai} WIB`;

  // Convert Logo Base64 to Uint8Array
  let logoData: Uint8Array | undefined;
  let logoType: "png" | "jpg" = "png";
  if (data.logoBase64) {
    try {
      logoType = data.logoBase64.includes("image/jpeg") || data.logoBase64.includes("image/jpg") ? "jpg" : "png";
      const base64String = data.logoBase64.split(',')[1] || data.logoBase64;
      const binaryString = atob(base64String);
      const len = binaryString.length;
      logoData = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        logoData[i] = binaryString.charCodeAt(i);
      }
    } catch (error) {
      console.error("Failed to parse logo base64:", error);
    }
  }

  // Convert TTE Icon Base64 to Uint8Array
  let tteIconData: Uint8Array | undefined;
  let tteType: "png" | "jpg" = "png";
  try {
    const tteBase64Full = data.tteIconBase64 || "data:image/jpeg;base64," + TTE_ICON_BASE64;
    tteType = tteBase64Full.includes("image/jpeg") || tteBase64Full.includes("image/jpg") ? "jpg" : "png";
    const tteBase64 = tteBase64Full.split(',')[1] || tteBase64Full;
    const binaryString = atob(tteBase64);
    const len = binaryString.length;
    tteIconData = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      tteIconData[i] = binaryString.charCodeAt(i);
    }
  } catch (error) {
    console.error("Failed to parse TTE icon base64:", error);
  }

  const noBorders = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
            },
            orientation: PageOrientation.PORTRAIT,
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: noBorders,
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 10, type: WidthType.PERCENTAGE },
                        verticalAlign: "center",
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.LEFT,
                            children: tteIconData ? [
                              new ImageRun({
                                data: tteIconData,
                                transformation: { width: 30, height: 30 },
                                type: tteType,
                              }),
                            ] : [],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 90, type: WidthType.PERCENTAGE },
                        verticalAlign: "center",
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: "Dokumen ini telah ditandatangani secara elektronik dengan menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE) Badan Siber dan Sandi Negara.",
                                italics: true,
                                size: 18,
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Kop Surat with Logo
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            margins: { top: 0, bottom: 0 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: "center",
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 0 },
                        children: logoData
                          ? [
                              new ImageRun({
                                data: logoData,
                                transformation: { width: 55, height: 68 },
                                type: logoType,
                              }),
                            ]
                          : [],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    verticalAlign: "center",
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [new TextRun({ text: KOP_SURAT.pemda, size: 26 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [new TextRun({ text: KOP_SURAT.dinas, bold: true, size: 30 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [new TextRun({ text: KOP_SURAT.alamat, size: 22 })],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0, before: 0 },
                        children: [new TextRun({ text: KOP_SURAT.kontak, size: 22 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
            border: {
              bottom: { color: "000000", space: 1, style: BorderStyle.DOUBLE, size: 18 },
            },
            children: [new TextRun({ text: "", size: 1 })],
          }),
          new Paragraph({ spacing: { before: 100, after: 0 }, children: [] }),

          // Judul
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "SURAT TUGAS", bold: true, underline: {}, size: 26 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Nomor: ${data.nomor}`, size: 24 }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

          // Dasar
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Dasar", size: 24 })] })],
                  }),
                  new TableCell({
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })],
                  }),
                  new TableCell({
                    width: { size: 83, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: data.dasar, size: 24 })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

          // Memerintahkan
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "MEMERINTAHKAN", bold: true, size: 24 })],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

          // Kepada
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Kepada", size: 24 })] })],
                  }),
                  new TableCell({
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })],
                  }),
                  new TableCell({
                    width: { size: 83, type: WidthType.PERCENTAGE },
                    children: [
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        rows: [
                          ...(isKolektif
                            ? [
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Terlampir", size: 24 })] })] }),
                                  ]
                                }),
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pangkat / Gol", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Terlampir", size: 24 })] })] }),
                                  ]
                                }),
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "NIP", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Terlampir", size: 24 })] })] }),
                                  ]
                                }),
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Terlampir", size: 24 })] })] }),
                                  ]
                                }),
                              ]
                            : selectedEmployees.length > 0
                            ? [
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nama", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: selectedEmployees[0].name, size: 24 })] })] }),
                                  ]
                                }),
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pangkat / Gol", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: selectedEmployees[0].pangkatGol, size: 24 })] })] }),
                                  ]
                                }),
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "NIP", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: selectedEmployees[0].nip, size: 24 })] })] }),
                                  ]
                                }),
                                new TableRow({
                                  children: [
                                    new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Jabatan", size: 24 })] })] }),
                                    new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                                    new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: selectedEmployees[0].jabatan, size: 24 })] })] }),
                                  ]
                                }),
                              ]
                            : []),
                        ]
                      })
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

          // Untuk
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: "Untuk", size: 24 })] })],
                  }),
                  new TableCell({
                    width: { size: 2, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })],
                  }),
                  new TableCell({
                    width: { size: 83, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({ 
                        alignment: AlignmentType.JUSTIFIED, 
                        children: [
                          new TextRun({ text: data.untuk, size: 24 }),
                          new TextRun({ text: ", yang dilaksanakan pada:", size: 24 })
                        ] 
                      }),
                      new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        rows: [
                          new TableRow({
                            children: [
                              new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Hari, Tanggal", size: 24 })] })] }),
                              new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                              new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: hariTanggalStr, size: 24 })] })] }),
                            ]
                          }),
                          new TableRow({
                            children: [
                              new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Pukul", size: 24 })] })] }),
                              new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                              new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: waktuStr, size: 24 })] })] }),
                            ]
                          }),
                          new TableRow({
                            children: [
                              new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tempat", size: 24 })] })] }),
                              new TableCell({ width: { size: 2, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                              new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: data.tempat, size: 24 })] })] }),
                            ]
                          }),
                        ]
                      })
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

          // Penutup
          new Paragraph({
            children: [
              new TextRun({
                text: "Surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan dipergunakan sebagaimana mestinya.",
                size: 26,
              }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 2 })] }),

          // Tanda Tangan (Hanya Tanggal dan #)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [] }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: `Jember, ${format(tglSurat, "d MMMM yyyy", { locale: id })}`, size: 24 })],
                      }),
                      new Paragraph({ children: [new TextRun({ text: "", break: 4 })] }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "#", size: 24 })], // Pagar untuk TTE
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
      // Lampiran Section (If Kolektif)
      ...(isKolektif
        ? [
            {
              properties: {
                type: SectionType.NEXT_PAGE,
                page: {
                  size: {
                    width: 16838,
                    height: 11906,
                  },
                  orientation: PageOrientation.LANDSCAPE,
                  margin: {
                    top: 720,
                    right: 720,
                    bottom: 720,
                    left: 720,
                  },
                },
              },
              footers: {
                default: new Footer({
                  children: [
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      borders: noBorders,
                      rows: [
                        new TableRow({
                          children: [
                            new TableCell({
                              width: { size: 10, type: WidthType.PERCENTAGE },
                              verticalAlign: "center",
                              children: [
                                new Paragraph({
                                  alignment: AlignmentType.LEFT,
                                  children: tteIconData ? [
                                    new ImageRun({
                                      data: tteIconData,
                                      transformation: { width: 30, height: 30 },
                                      type: tteType,
                                    }),
                                  ] : [],
                                }),
                              ],
                            }),
                            new TableCell({
                              width: { size: 90, type: WidthType.PERCENTAGE },
                              verticalAlign: "center",
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: "Dokumen ini telah ditandatangani secara elektronik dengan menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE) Badan Siber dan Sandi Negara.",
                                      italics: true,
                                      size: 16,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              },
              children: [
                new Table({
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  alignment: AlignmentType.RIGHT,
                  borders: noBorders,
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Lampiran", size: 24 })] })] }),
                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "", size: 24 })] })] }),
                        new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "", size: 24 })] })] }),
                      ]
                    }),
                    new TableRow({
                      children: [
                        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Nomor", size: 24 })] })] }),
                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                        new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: data.nomor, size: 24 })] })] }),
                      ]
                    }),
                    new TableRow({
                      children: [
                        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: "Tanggal", size: 24 })] })] }),
                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: ":", size: 24 })] })] }),
                        new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: format(tglSurat, "d MMMM yyyy", { locale: id }), size: 24 })] })] }),
                      ]
                    }),
                  ]
                }),
                new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),

                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      tableHeader: true,
                      children: [
                        new TableCell({
                          width: { size: 4, type: WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 50, right: 50 },
                          verticalAlign: "center",
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NO", bold: true, size: 22 })] })],
                        }),
                        new TableCell({
                          width: { size: 31, type: WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 50, right: 50 },
                          verticalAlign: "center",
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NAMA", bold: true, size: 22 })] })],
                        }),
                        new TableCell({
                          width: { size: 15, type: WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 50, right: 50 },
                          verticalAlign: "center",
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NIP", bold: true, size: 22 })] })],
                        }),
                        new TableCell({
                          width: { size: 18, type: WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 50, right: 50 },
                          verticalAlign: "center",
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PANGKAT / GOL", bold: true, size: 22 })] })],
                        }),
                        new TableCell({
                          width: { size: 32, type: WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 50, right: 50 },
                          verticalAlign: "center",
                          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "JABATAN", bold: true, size: 22 })] })],
                        }),
                      ],
                    }),
                    ...selectedEmployees.map(
                      (emp, index) =>
                        new TableRow({
                          children: [
                            new TableCell({ 
                              margins: { top: 100, bottom: 100, left: 50, right: 50 },
                              verticalAlign: "center",
                              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (index + 1).toString(), size: 22 })] })] 
                            }),
                            new TableCell({ 
                              margins: { top: 100, bottom: 100, left: 50, right: 50 },
                              verticalAlign: "center",
                              children: [new Paragraph({ children: [new TextRun({ text: emp.name, size: 22 })] })] 
                            }),
                            new TableCell({ 
                              margins: { top: 100, bottom: 100, left: 50, right: 50 },
                              verticalAlign: "center",
                              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: emp.nip, size: 22 })] })] 
                            }),
                            new TableCell({ 
                              margins: { top: 100, bottom: 100, left: 50, right: 50 },
                              verticalAlign: "center",
                              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: emp.pangkatGol, size: 22 })] })] 
                            }),
                            new TableCell({ 
                              margins: { top: 100, bottom: 100, left: 50, right: 50 },
                              verticalAlign: "center",
                              children: [new Paragraph({ children: [new TextRun({ text: emp.jabatan, size: 22 })] })] 
                            }),
                          ],
                        })
                    ),
                  ],
                }),
              ],
            },
          ]
        : []),
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat Tugas - ${data.nomor.replace(/\//g, "-")}.docx`);
}
