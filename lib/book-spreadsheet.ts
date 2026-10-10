import type { Book } from "./contracts";
export const BOOK_COLUMNS = ["Book Code", "Book Name", "Pages"] as const;
export const EXCEL_MAX_ROWS = 2000;
export const EXCEL_MAX_BYTES = 4 * 1024 * 1024;
export type BookImportRow = { row: number; book: Record<string, unknown> };
export function bookSheet(books: Book[]) {
  return [
    BOOK_COLUMNS.map((value) => ({
      value,
      fontWeight: "bold" as const,
      backgroundColor: "#146B58",
      textColor: "#FFFFFF",
    })),
    ...books.map((b) => [b.code, b.title, b.pages]),
  ];
}
const text = (value: unknown) =>
  value === null || value === undefined ? "" : String(value).trim();
const aliases: Record<string, string> = {
  code: "code",
  bookcode: "code",
  bookscode: "code",
  title: "title",
  bookname: "title",
  booksname: "title",
  pages: "pages",
  pagecount: "pages",
  numberofpages: "pages",
};
export function parseBookSheet(sheet: unknown[][]): BookImportRow[] {
  if (!sheet.length)
    throw new Error(
      "The workbook is empty. Export an Excel file to get the format.",
    );
  const headers = sheet[0].map(
    (value) => aliases[text(value).toLowerCase().replace(/[ _-]/g, "")] || "",
  );
  const missing = ["code", "title"].filter((key) => !headers.includes(key));
  if (missing.length)
    throw new Error("Missing columns: Book Code and Book Name are required.");
  const recognized = headers.filter(Boolean);
  if (new Set(recognized).size !== recognized.length)
    throw new Error("The workbook has duplicate column names.");
  const rows = sheet
    .slice(1)
    .map((cells, i) => ({
      row: i + 2,
      values: Object.fromEntries(
        headers.flatMap((header, index) =>
          header ? [[header, cells[index]]] : [],
        ),
      ),
    }))
    .filter(
      ({ values }) =>
        text(values.code) || text(values.title) || text(values.pages),
    );
  if (!rows.length) throw new Error("There are no books to import.");
  if (rows.length > EXCEL_MAX_ROWS)
    throw new Error("Import up to 2,000 books at a time.");
  const counts = new Map<string, number>();
  for (const { values } of rows) {
    const key = text(values.code).toUpperCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return rows.map(({ row, values }) => {
    const code = text(values.code).toUpperCase();
    const pageText = text(values.pages);
    const pages = !pageText
      ? null
      : /^\d+$/.test(pageText)
        ? Number(pageText)
        : "Enter a whole-number page count";
    return {
      row,
      book: {
        code,
        title: text(values.title),
        course_code: code,
        course_name: "",
        author: "",
        description: "",
        cover: null,
        pages,
        category: "D",
        fixed_price: null,
        campus_id: null,
        active: pages !== null,
        ...(counts.get(code)! > 1
          ? {
              import_error:
                "Duplicate book code " +
                code +
                " appears more than once in this file. Give each edition a unique code before importing.",
            }
          : {}),
      },
    };
  });
}
