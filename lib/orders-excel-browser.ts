import { orderSheet } from "./orders-spreadsheet";

export async function exportOrdersExcel(
  orders: any[],
  filename = "orders.xlsx",
  options?: { includeAddress?: boolean; includeMobile?: boolean },
) {
  const includeAddress = Boolean(options?.includeAddress);
  const includeMobile =
    options?.includeMobile !== undefined
      ? Boolean(options.includeMobile)
      : includeAddress;
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(orderSheet(orders, options), {
    sheet: "Orders",
    columns: [
      { width: 10 }, // Sr No
      { width: 24 }, // Order Number
      { width: 26 }, // Student Name
      ...(includeMobile ? [{ width: 18 }] : []), // Mobile Number
      ...(includeAddress ? [{ width: 36 }] : []), // Address
      { width: 16 }, // Book Code
      { width: 46 }, // Book Name
      { width: 12 }, // Quantity
      { width: 14 }, // Total Books
    ],
    stickyRowsCount: 1,
  }).toFile(filename);
}
