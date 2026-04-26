import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

export async function buildXlsxBuffer(input: {
  workbookTitle: string;
  sheets: Array<{
    name: string;
    rows: Array<Record<string, unknown>>;
  }>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LibraryPro";
  workbook.company = "LibraryPro";
  workbook.title = input.workbookTitle;

  for (const sheet of input.sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ message: "No data" }];
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

    worksheet.columns = columns.map((column) => ({
      header: column,
      key: column,
      width: Math.min(40, Math.max(column.length + 4, 16)),
    }));

    for (const row of rows) {
      worksheet.addRow(
        Object.fromEntries(columns.map((column) => [column, row[column] ?? ""])),
      );
    }

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
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
