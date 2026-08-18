import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ExportCell = string | number | Date | null | undefined;
export type ExportTable = {
  title: string;
  headers: string[];
  rows: ExportCell[][];
};

export function safeSpreadsheetText(value: unknown) {
  const text = String(value ?? "");
  return /^(?:[\t\r\n]|\s*[=+\-@])/.test(text) ? `'${text}` : text;
}

export function csvExport(table: ExportTable) {
  const cell = (value: ExportCell) => {
    const normalized = value instanceof Date
      ? value.toISOString()
      : typeof value === "number"
        ? String(value)
        : safeSpreadsheetText(value);
    return `"${String(normalized).replaceAll('"', '""')}"`;
  };
  return `\uFEFF${[
    table.headers.map(cell).join(","),
    ...table.rows.map((row) => row.map(cell).join(",")),
  ].join("\r\n")}`;
}

export async function xlsxExport(table: ExportTable) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Smart Kids Education Care";
  const sheet = workbook.addWorksheet(table.title.slice(0, 31));
  sheet.addRow(table.headers);
  for (const row of table.rows) {
    sheet.addRow(
      row.map((value) =>
        typeof value === "string" ? safeSpreadsheetText(value) : value ?? "",
      ),
    );
  }
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const widths = table.headers.map((header) => Math.max(12, header.length + 2));
  sheet.eachRow((row) => {
    row.eachCell((cell, columnIndex) => {
      widths[columnIndex - 1] = Math.max(
        widths[columnIndex - 1] ?? 12,
        String(cell.value ?? "").length + 2,
      );
    });
  });
  sheet.columns.forEach((column, index) => {
    column.width = Math.min(widths[index] ?? 12, 40);
  });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

function ascii(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?");
}

export async function pdfTableExport(table: ExportTable) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 32;
  const fontSize = 7;
  const columnWidth = (pageWidth - margin * 2) / table.headers.length;
  let page = document.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawRow = (values: ExportCell[], header = false) => {
    values.forEach((value, index) => {
      page.drawText(ascii(value).slice(0, 34), {
        x: margin + index * columnWidth,
        y,
        size: fontSize,
        font: header ? bold : regular,
        color: rgb(0.08, 0.16, 0.27),
        maxWidth: columnWidth - 4,
      });
    });
    y -= 12;
  };

  page.drawText(ascii(table.title), {
    x: margin,
    y,
    size: 15,
    font: bold,
    color: rgb(0.08, 0.16, 0.27),
  });
  y -= 24;
  drawRow(table.headers, true);
  for (const row of table.rows) {
    if (y < margin) {
      page = document.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawRow(table.headers, true);
    }
    drawRow(row);
  }
  return new Uint8Array(await document.save());
}
