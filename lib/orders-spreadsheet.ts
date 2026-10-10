export const ORDER_EXPORT_COLUMNS = [
  "Order Number",
  "Student Name",
  "Date",
  "Book Code",
  "Book Name",
  "Quantity",
] as const;

export function orderSheet(orders: any[]) {
  // Theme Header Style: Royal Blue (#2563A6) matching the Bookstore Brand Theme
  const headerRow = [
    { value: "Order Number", width: 22 },
    { value: "Student Name", width: 26 },
    { value: "Date", width: 18 },
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 44 },
    { value: "Quantity", width: 12 },
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
            },
          ];

    const orderDate = o.created_at
      ? new Date(o.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

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
      ]);
    }
  }

  return [headerRow, ...dataRows];
}
