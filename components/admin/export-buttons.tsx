"use client";

import ExcelJS from "exceljs";
import { Download, FileText } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function ExportButtons({ rows, filename }: { rows: Record<string, unknown>[]; filename: string }) {
  async function exportExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bengtech");
    worksheet.columns = Object.keys(rows[0] || {}).map((key) => ({ header: key, key, width: 20 }));
    rows.forEach((row) => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    download(blob, `${filename}.xlsx`);
  }

  async function exportPdf() {
    const pdf = await PDFDocument.create();
    let page = pdf.addPage([842, 595]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const headers = Object.keys(rows[0] || {});
    let y = 555;
    page.drawText(filename, { x: 32, y, size: 16, font, color: rgb(0.06, 0.48, 0.29) });
    y -= 28;
    page.drawText(headers.join(" | ").slice(0, 160), { x: 32, y, size: 8, font });
    y -= 16;

    rows.forEach((row) => {
      if (y < 32) {
        page = pdf.addPage([842, 595]);
        y = 555;
      }
      const line = headers.map((key) => String(row[key] ?? "")).join(" | ").slice(0, 190);
      page.drawText(line, { x: 32, y, size: 8, font });
      y -= 14;
    });

    const bytes = await pdf.save();
    const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    download(new Blob([pdfBuffer], { type: "application/pdf" }), `${filename}.pdf`);
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-secondary" type="button" onClick={exportExcel} disabled={!rows.length}>
        <Download size={18} />
        Excel
      </button>
      <button className="btn-secondary" type="button" onClick={exportPdf} disabled={!rows.length}>
        <FileText size={18} />
        PDF
      </button>
    </div>
  );
}
