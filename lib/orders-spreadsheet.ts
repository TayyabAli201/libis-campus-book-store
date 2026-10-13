export const ORDER_EXPORT_COLUMNS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Date",
  "Book Code",
  "Book Name",
  "Quantity",
] as const;

export const ORDER_EXPORT_COLUMNS_WITH_ADDRESS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Date",
  "Address",
  "Book Code",
  "Book Name",
  "Quantity",
] as const;

export function orderSheet(
  orders: any[],
  options?: { includeAddress?: boolean },
) {
  const includeAddress = Boolean(options?.includeAddress);

  // Total Books Calculation across all exported orders
  let totalBooks = 0;
  orders.forEach((o) => {
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
    items.forEach((item: any) => {
      totalBooks += Number(item.quantity) || 1;
    });
  });

  const quantityHeading = `Quantity (Total Books: ${totalBooks})`;

  const headerCols = [
    { value: "Sr No", width: 10 },
    { value: "Order Number", width: 24 },
    { value: "Student Name", width: 26 },
    { value: "Date", width: 18 },
    ...(includeAddress ? [{ value: "Address", width: 36 }] : []),
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 46 },
    { value: quantityHeading, width: 24 },
  ];

  // Theme Header Style: Royal Blue matching Bookstore Brand Theme
  const headerRow = headerCols.map((col) => ({
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

    const d = o.created_at ? new Date(o.created_at) : null;
    const orderDate =
      d && !isNaN(d.getTime())
        ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
        : "—";

    const N = items.length;
    const srNo = orderIdx + 1;

    const fullAddress = o.address
      ? o.city && !o.address.toLowerCase().includes(o.city.toLowerCase())
        ? `${o.address}, ${o.city}`
        : o.address
      : (o.city || "—");

    const addressCell = {
      value: fullAddress,
      rowSpan: N,
      align: "left" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
      wrap: true,
    };

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
          ...(includeAddress ? [addressCell] : []),
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
        // Subsequent rows of the order: merged cells are null (covered by rowSpan)
        dataRows.push([
          null,
          null,
          null,
          null,
          ...(includeAddress ? [null] : []),
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
