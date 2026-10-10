import { orderSheet } from "./orders-spreadsheet";

export async function exportOrdersExcel(
  orders: any[],
  filename = "orders.xlsx",
  options?: { includeAddress?: boolean },
) {
  const includeAddress = Boolean(options?.includeAddress);
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(orderSheet(orders, options), {
    sheet: "Orders",
    columns: [
      { width: 10 }, // Sr No
      { width: 24 }, // Order Number
      { width: 26 }, // Student Name
      { width: 18 }, // Date
      ...(includeAddress ? [{ width: 36 }] : []), // Address
      { width: 16 }, // Book Code
      { width: 46 }, // Book Name
      { width: 12 }, // Quantity
    ],
    stickyRowsCount: 1,
  }).toFile(filename);
}
