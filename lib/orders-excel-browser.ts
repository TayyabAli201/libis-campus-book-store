import { orderSheet } from "./orders-spreadsheet";

export async function exportOrdersExcel(
  orders: any[],
  filename = "orders.xlsx",
) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(orderSheet(orders), {
    sheet: "Orders",
    columns: [
      { width: 10 }, // Sr No
      { width: 24 }, // Order Number
      { width: 26 }, // Student Name
      { width: 18 }, // Date
      { width: 16 }, // Book Code
      { width: 46 }, // Book Name
      { width: 12 }, // Quantity
    ],
    stickyRowsCount: 1,
  }).toFile(filename);
}
