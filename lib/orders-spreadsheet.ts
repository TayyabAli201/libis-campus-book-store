export const ORDER_EXPORT_COLUMNS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Date",
  "Book Code",
  "Book Name",
  "Quantity",
] as const;

export function orderSheet(orders: any[]) {
  // Theme Header Style: Royal Blue matching Bookstore Brand Theme
  const headerRow = [
    { value: "Sr No", width: 10 },
    { value: "Order Number", width: 24 },
    { value: "Student Name", width: 26 },
    { value: "Date", width: 18 },
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 46 },
    { value: "Quantity", width: 12 },
  ].map((col) => ({
    value: col.value,
    fontWeight: "bold" as const,
    backgroundColor: "#1F65A8",
    textColor: "#FFFFFF",
    align: "center" as const,
    alignVertical: "center" as const,
    borderColor: "#1E3A8A",
    borderStyle: "thin" as const,
  }));

  const dataRows: any[] = [];
  const border = "#475569";

  orders.forEach((o, orderIdx) => {
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

    const N = items.length;
    const srNo = orderIdx + 1;

    items.forEach((item: any, idx: number) => {
      if (idx === 0) {
        // First row of the order: contains merged cells spanning N rows
        dataRows.push([
          {
            value: srNo,
            type: Number,
            rowSpan: N,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: o.reference || "—",
            rowSpan: N,
            fontWeight: "bold" as const,
            textColor: "#1E40AF",
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: o.name || "Student",
            rowSpan: N,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: orderDate,
            rowSpan: N,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: item.code || "—",
            fontWeight: "bold" as const,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: item.title || "—",
            align: "left" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: Number(item.quantity) || 1,
            type: Number,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
        ]);
      } else {
        // Subsequent rows of the order: first 4 cells are null (covered by rowSpan)
        dataRows.push([
          null,
          null,
          null,
          null,
          {
            value: item.code || "—",
            fontWeight: "bold" as const,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: item.title || "—",
            align: "left" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: Number(item.quantity) || 1,
            type: Number,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
        ]);
      }
    });
  });

  return [headerRow, ...dataRows];
}
