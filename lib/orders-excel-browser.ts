import { orderSheet } from "./orders-spreadsheet";

export async function exportOrdersExcel(
  orders: any[],
  filename = "orders.xlsx",
) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  await writeExcelFile(orderSheet(orders), {
    sheet: "Orders",
    columns: [
      { width: 22 },
      { width: 24 },
      { width: 18 },
      { width: 16 },
      { width: 44 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
      { width: 20 },
      { width: 18 },
      { width: 18 },
    ],
    stickyRowsCount: 1,
  }).toFile(filename);
}
