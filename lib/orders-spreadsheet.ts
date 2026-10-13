export const ORDER_EXPORT_COLUMNS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Book Code",
  "Book Name",
  "Quantity",
  "Total Books",
] as const;

export const ORDER_EXPORT_COLUMNS_WITH_ADDRESS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Address",
  "Book Code",
  "Book Name",
  "Quantity",
  "Total Books",
] as const;

export function orderSheet(
  orders: any[],
  options?: { includeAddress?: boolean },
) {
  const includeAddress = Boolean(options?.includeAddress);

  const headerCols = [
    { value: "Sr No", width: 10 },
    { value: "Order Number", width: 24 },
    { value: "Student Name", width: 26 },
    ...(includeAddress ? [{ value: "Address", width: 36 }] : []),
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 46 },
    { value: "Quantity", width: 12 },
    { value: "Total Books", width: 14 },
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
  let grandTotalBooks = 0;

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

    const orderTotalBooks = items.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 1),
      0,
    );
    grandTotalBooks += orderTotalBooks;

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
          {
            value: orderTotalBooks,
            type: Number,
            rowSpan: N,
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
          null,
        ]);
      }
    });
  });

  const prefixCount = includeAddress ? 6 : 5;
  const grandTotalRow = [
    ...Array(prefixCount).fill(null),
    {
      value: `(Total Books: ${grandTotalBooks})`,
      colSpan: 2,
      fontWeight: "bold" as const,
      backgroundColor: "#1F65A8",
      textColor: "#FFFFFF",
      align: "center" as const,
      alignVertical: "center" as const,
      borderColor: "#1E3A8A",
      borderStyle: "thin" as const,
    },
    null,
  ];

  return [headerRow, ...dataRows, grandTotalRow];
}
