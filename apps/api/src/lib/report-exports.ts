import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

export function buildXlsxBuffer(input: {
  workbookTitle: string;
  sheets: Array<{
    name: string;
    rows: Array<Record<string, unknown>>;
  }>;
}) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of input.sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ message: "No data" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    Props: {
      Title: input.workbookTitle,
      Author: "Nextlib",
      Company: "Nextlib",
    },
  }) as Buffer;
}

export async function buildPdfBuffer(input: {
  title: string;
  subtitle?: string;
  summary: Array<{ label: string; value: string }>;
  tables: Array<{
    title: string;
    rows: Array<Record<string, unknown>>;
  }>;
}) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  doc.fontSize(20).text(input.title, { align: "left" });
  if (input.subtitle) {
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#555555").text(input.subtitle);
    doc.fillColor("#000000");
  }

  doc.moveDown();
  doc.fontSize(12).text("Summary", { underline: true });
  doc.moveDown(0.4);
  for (const item of input.summary) {
    doc.fontSize(10).text(`${item.label}: ${item.value}`);
  }

  for (const table of input.tables) {
    doc.addPage();
    doc.fontSize(14).text(table.title, { underline: true });
    doc.moveDown(0.5);
    const rows = table.rows.length > 0 ? table.rows : [{ message: "No data" }];
    for (const row of rows.slice(0, 40)) {
      doc.fontSize(9).text(
        Object.entries(row)
          .map(([key, value]) => `${key}: ${String(value ?? "")}`)
          .join(" | "),
      );
      doc.moveDown(0.25);
    }
  }

  doc.end();

  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  return Buffer.concat(chunks);
}
