import { jsPDF } from "jspdf";
import { rand } from "./format";

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  stockAfter: number;
};

export type ReceiptData = {
  lines: ReceiptLine[];
  total: number;
  paymentMethod: string;
  tendered?: number;
  change?: number;
  cashier: string;
  date: Date;
};

// Builds a narrow till-slip PDF (80mm wide) and returns it as a Blob.
export function buildReceiptPdf(d: ReceiptData): Blob {
  const width = 80;
  const lineH = 5;
  let y = 10;
  const height = 60 + d.lines.length * 3 * lineH;
  const doc = new jsPDF({ unit: "mm", format: [width, height] });
  const cx = width / 2;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Masibambane Spaza", cx, y, { align: "center" });
  y += lineH;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("123 Masibambane Lane, New Brighton, Gqeberha", cx, y, { align: "center" });
  y += lineH;
  doc.text(`${d.date.toLocaleDateString("en-ZA")} ${d.date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`, cx, y, { align: "center" });
  y += lineH - 1;
  doc.setFontSize(7);
  doc.text(`Cashier: ${d.cashier}`, cx, y, { align: "center" });
  y += lineH;
  doc.line(4, y, width - 4, y);
  y += lineH;

  doc.setFontSize(9);
  for (const l of d.lines) {
    doc.setFont("helvetica", "normal");
    doc.text(`${l.quantity} x ${l.name}`, 4, y);
    doc.text(rand(l.quantity * l.unitPrice), width - 4, y, { align: "right" });
    y += lineH;
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`@ ${rand(l.unitPrice)}  -  stock now ${l.stockAfter}`, 6, y);
    doc.setTextColor(0);
    doc.setFontSize(9);
    y += lineH;
  }

  doc.line(4, y, width - 4, y);
  y += lineH + 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", 4, y);
  doc.text(rand(d.total), width - 4, y, { align: "right" });
  y += lineH + 1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Paid by: ${d.paymentMethod}`, 4, y);
  y += lineH;
  if (d.tendered !== undefined) {
    doc.text(`Cash given: ${rand(d.tendered)}`, 4, y);
    y += lineH;
    doc.setFont("helvetica", "bold");
    doc.text(`Change: ${rand(d.change ?? 0)}`, 4, y);
    doc.setFont("helvetica", "normal");
    y += lineH;
  }

  y += 2;
  doc.setFontSize(8);
  doc.text("Thank you for shopping with us!", cx, y, { align: "center" });

  return doc.output("blob");
}

// Downloads the PDF and opens it in a new tab so it can be printed physically.
export function printReceipt(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
