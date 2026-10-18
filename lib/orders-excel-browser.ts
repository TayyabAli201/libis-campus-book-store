import {
  orderSheet,
  bookSummarySheet,
  BOOK_SUMMARY_SHEET_COLUMNS,
} from "./orders-spreadsheet";

export async function exportOrdersExcel(
  orders: any[],
  filename = "orders.xlsx",
  options?: {
    includeAddress?: boolean;
    includeMobile?: boolean;
    sheetName?: string;
    includeBookSummary?: boolean;
  },
) {
  const includeAddress = Boolean(options?.includeAddress);
  const includeMobile =
    options?.includeMobile !== undefined
      ? Boolean(options.includeMobile)
      : includeAddress;
  const rawSheet = options?.sheetName || "Orders";
  const sheetName =
    rawSheet.replace(/[\\/?*\[\]:]/g, "").slice(0, 31) || "Orders";
  const { default: writeExcelFile } = await import("write-excel-file/browser");

  const orderColumns = [
    { width: 10 }, // Sr No
    { width: 24 }, // Order Number
    { width: 26 }, // Student Name
    ...(includeMobile ? [{ width: 18 }] : []), // Mobile Number
    ...(includeAddress ? [{ width: 36 }] : []), // Address
    { width: 16 }, // Book Code
    { width: 46 }, // Book Name
    { width: 12 }, // Quantity
    { width: 14 }, // Total Books
  ];

  if (options?.includeBookSummary) {
    await writeExcelFile(
      [
        {
          sheet: sheetName,
          data: orderSheet(orders, options),
          columns: orderColumns,
          stickyRowsCount: 1,
        },
        {
          sheet: "Books Summary",
          data: bookSummarySheet(orders),
          columns: BOOK_SUMMARY_SHEET_COLUMNS,
          stickyRowsCount: 1,
        },
      ],
      {},
    ).toFile(filename);
  } else {
    await writeExcelFile(orderSheet(orders, options), {
      sheet: sheetName,
      columns: orderColumns,
      stickyRowsCount: 1,
    }).toFile(filename);
  }
}

