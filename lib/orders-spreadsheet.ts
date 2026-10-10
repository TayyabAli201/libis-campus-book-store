import { statuses } from "./contracts";

export const ORDER_EXPORT_COLUMNS = [
  "Order Number",
  "Student Name",
  "Date",
  "Book Code",
  "Book Name",
  "Quantity",
  "Unit Price",
  "Item Total",
  "Order Status",
  "WhatsApp",
  "City",
] as const;

export function orderSheet(orders: any[]) {
  // Theme Header Style: Royal Blue (#2563A6) matching the Bookstore Brand Theme
  const headerRow = [
    { value: "Order Number", width: 22 },
    { value: "Student Name", width: 24 },
    { value: "Date", width: 20 },
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 44 },
    { value: "Quantity", width: 12 },
    { value: "Unit Price (Rs)", width: 16 },
    { value: "Item Total (Rs)", width: 16 },
    { value: "Order Status", width: 20 },
    { value: "WhatsApp", width: 18 },
    { value: "City", width: 18 },
  ].map((col) => ({
    value: col.value,
    fontWeight: "bold" as const,
    backgroundColor: "#2563A6",
    textColor: "#FFFFFF",
    align: "center" as const,
    borderColor: "#1D4ED8",
    borderStyle: "thin" as const,
  }));

  const dataRows: any[] = [];
  let rowIndex = 0;

  for (const o of orders) {
    const items =
      o.items && o.items.length > 0
        ? o.items
        : [
            {
              code: "—",
              title: "Order Record",
              quantity: 1,
              unit_price: o.total || 0,
            },
          ];

    const orderDate = o.created_at
      ? new Date(o.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

    const orderStatus = statuses[o.status] || o.status || "—";

    for (const item of items) {
      rowIndex++;
      const isAlt = rowIndex % 2 === 0;
      const bg = isAlt ? "#F8FAFC" : "#FFFFFF";
      const border = "#E2E8F0";

      dataRows.push([
        {
          value: o.reference || "—",
          fontWeight: "bold" as const,
          textColor: "#1E40AF",
          backgroundColor: bg,
          align: "center" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: o.name || "Student",
          textColor: "#0F172A",
          backgroundColor: bg,
          align: "left" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: orderDate,
          textColor: "#475569",
          backgroundColor: bg,
          align: "center" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: item.code || "—",
          fontWeight: "bold" as const,
          textColor: "#0F172A",
          backgroundColor: bg,
          align: "center" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: item.title || "—",
          textColor: "#0F172A",
          backgroundColor: bg,
          align: "left" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: Number(item.quantity) || 1,
          type: Number,
          textColor: "#0F172A",
          backgroundColor: bg,
          align: "right" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: item.unit_price ? `Rs. ${item.unit_price}` : "—",
          textColor: "#475569",
          backgroundColor: bg,
          align: "right" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value:
            item.unit_price && item.quantity
              ? `Rs. ${item.unit_price * item.quantity}`
              : o.total
                ? `Rs. ${o.total}`
                : "—",
          fontWeight: "bold" as const,
          textColor: "#166534",
          backgroundColor: bg,
          align: "right" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: orderStatus,
          fontWeight: "bold" as const,
          textColor: "#1E3A8A",
          backgroundColor: bg,
          align: "center" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: o.phone || "—",
          textColor: "#475569",
          backgroundColor: bg,
          align: "center" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
        {
          value: o.city || "—",
          textColor: "#475569",
          backgroundColor: bg,
          align: "left" as const,
          borderColor: border,
          borderStyle: "thin" as const,
        },
      ]);
    }
  }

  return [headerRow, ...dataRows];
}
