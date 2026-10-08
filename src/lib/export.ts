export type Cell = string | number;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCSV(filename: string, headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  download(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportPDF(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: Cell[][],
  summary: string[],
) {
  // jsPDF's built-in fonts only cover Latin-1; map or strip anything else
  // (e.g. "→" renders as a broken glyph otherwise).
  const pdfSafe = (v: Cell | string) =>
    String(v)
      .replace(/→/g, "->")
      .replace(/[^\u0000-\u00ff]/g, "");
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(pdfSafe("Masibambane Spaza Shop"), 14, 16);
  doc.setFontSize(12);
  doc.text(pdfSafe(title), 14, 24);
  doc.setFontSize(9);
  doc.text(pdfSafe(subtitle), 14, 30);
  autoTable(doc, {
    startY: 35,
    head: [headers.map(pdfSafe)],
    body: rows.map((r) => r.map(pdfSafe)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = ((doc as any).lastAutoTable?.finalY ?? 40) + 8;
  doc.setFontSize(10);
  for (const line of summary) {
    if (y > 285) {
      doc.addPage();
      y = 16;
    }
    doc.text(pdfSafe(line), 14, y);
    y += 6;
  }
  doc.save(`${filename}.pdf`);
}
