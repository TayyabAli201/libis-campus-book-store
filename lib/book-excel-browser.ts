import type { Book } from "./contracts";
import { bookSheet, parseBookSheet, EXCEL_MAX_BYTES } from "./book-spreadsheet";

export async function exportBookExcel(books: Book[]) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(bookSheet(books), {
    sheet: "Books",
    columns: [{ width: 18 }, { width: 70 }, { width: 14 }],
    stickyRowsCount: 1,
  }).toFile("books.xlsx");
}

export async function readBookExcel(file: File) {
  if (!/\.xlsx$/i.test(file.name))
    throw new Error("Choose an Excel .xlsx file.");
  if (file.size > EXCEL_MAX_BYTES)
    throw new Error("Use an Excel file smaller than 5 MB.");
  const { readSheet } = await import("read-excel-file/browser");
  let sheet;
  try {
    sheet = await readSheet(file, 1);
  } catch {
    throw new Error(
      "This file could not be read. Save it as an Excel .xlsx workbook and try again.",
    );
  }
  return parseBookSheet(sheet);
}
