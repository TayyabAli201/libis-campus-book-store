export const ORDER_EXPORT_COLUMNS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Book Code",
  "Book Name",
  "Quantity",
  "Total Books",
] as const;

export const ORDER_EXPORT_COLUMNS_WITH_MOBILE = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Mobile Number",
  "Book Code",
  "Book Name",
  "Quantity",
  "Total Books",
] as const;

export const ORDER_EXPORT_COLUMNS_WITH_ADDRESS = [
  "Sr No",
  "Order Number",
  "Student Name",
  "Mobile Number",
  "Address",
  "Book Code",
  "Book Name",
  "Quantity",
  "Total Books",
] as const;

export function orderSheet(
  orders: any[],
  options?: { includeAddress?: boolean; includeMobile?: boolean },
) {
  const includeAddress = Boolean(options?.includeAddress);
  const includeMobile =
    options?.includeMobile !== undefined
      ? Boolean(options.includeMobile)
      : includeAddress;

  const ROW_HEIGHT = 22.5;
  const FONT_FAMILY = "Lora";

  const headerCols = [
    { value: "Sr No", width: 10 },
    { value: "Order Number", width: 24 },
    { value: "Student Name", width: 26 },
    ...(includeMobile ? [{ value: "Mobile Number", width: 18 }] : []),
    ...(includeAddress ? [{ value: "Address", width: 36 }] : []),
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 46 },
    { value: "Quantity", width: 12 },
    { value: "Total Books", width: 14 },
  ];

  // Theme Header Style: Royal Blue matching Bookstore Brand Theme with Lora font and 22.5pt height
  const headerRow = headerCols.map((col) => ({
    value: col.value,
    fontFamily: FONT_FAMILY,
    height: ROW_HEIGHT,
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

    const hasAnyReceivedOrDispatched =
      items.some((it: any) => Boolean(it.received_from_vendor)) ||
      Boolean(o.vendor_dispatched_at) ||
      ["SHIPPED", "DELIVERED"].includes(o.status);

    const hasShortage =
      hasAnyReceivedOrDispatched &&
      items.some((it: any) => !it.received_from_vendor);

    // Option A: If order has shortages / missing books, only export the missing books
    const exportItems = hasShortage
      ? items.filter((it: any) => !it.received_from_vendor)
      : items;

    const orderTotalBooks = exportItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 1),
      0,
    );
    grandTotalBooks += orderTotalBooks;

    const N = exportItems.length;
    const srNo = orderIdx + 1;

    const fullAddress = o.address
      ? o.city && !o.address.toLowerCase().includes(o.city.toLowerCase())
        ? `${o.address}, ${o.city}`
        : o.address
      : (o.city || "—");

    const mobileCell = {
      value: o.phone || "—",
      rowSpan: N,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
      align: "center" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
    };

    const addressCell = {
      value: fullAddress,
      rowSpan: N,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
      align: "left" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
      wrap: true,
    };

    exportItems.forEach((item: any, idx: number) => {
      const isMissing = hasShortage && !item.received_from_vendor;
      const missingBg = "#FEE2E2"; // soft red highlight for missing book
      const missingText = "#991B1B"; // dark red text

      if (idx === 0) {
        // First row of the order: contains merged cells spanning N rows
        dataRows.push([
          {
            value: srNo,
            type: Number,
            rowSpan: N,
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          {
            value: o.reference || "—",
            rowSpan: N,
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
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
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
          },
          ...(includeMobile ? [mobileCell] : []),
          ...(includeAddress ? [addressCell] : []),
          {
            value: item.code || "—",
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            fontWeight: "bold" as const,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
            ...(isMissing ? { backgroundColor: missingBg, textColor: missingText } : {}),
          },
          {
            value: item.title || "—",
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            fontWeight: isMissing ? ("bold" as const) : undefined,
            align: "left" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
            ...(isMissing ? { backgroundColor: missingBg, textColor: missingText } : {}),
          },
          {
            value: Number(item.quantity) || 1,
            type: Number,
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            fontWeight: isMissing ? ("bold" as const) : undefined,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
            ...(isMissing ? { backgroundColor: missingBg, textColor: missingText } : {}),
          },
          {
            value: orderTotalBooks,
            type: Number,
            rowSpan: N,
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
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
          ...(includeMobile ? [null] : []),
          ...(includeAddress ? [null] : []),
          {
            value: item.code || "—",
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            fontWeight: "bold" as const,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
            ...(isMissing ? { backgroundColor: missingBg, textColor: missingText } : {}),
          },
          {
            value: item.title || "—",
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            fontWeight: isMissing ? ("bold" as const) : undefined,
            align: "left" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
            ...(isMissing ? { backgroundColor: missingBg, textColor: missingText } : {}),
          },
          {
            value: Number(item.quantity) || 1,
            type: Number,
            fontFamily: FONT_FAMILY,
            height: ROW_HEIGHT,
            fontWeight: isMissing ? ("bold" as const) : undefined,
            align: "center" as const,
            alignVertical: "center" as const,
            borderColor: border,
            borderStyle: "thin" as const,
            ...(isMissing ? { backgroundColor: missingBg, textColor: missingText } : {}),
          },
          null,
        ]);
      }
    });
  });

  const prefixCount = (includeMobile ? 1 : 0) + (includeAddress ? 1 : 0) + 5;
  const grandTotalRow = [
    ...Array(prefixCount).fill(null),
    {
      value: `(Total Books: ${grandTotalBooks})`,
      columnSpan: 2,
      span: 2,
      colSpan: 2,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
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

export const BOOK_SUMMARY_COLUMNS = [
  "Sr No",
  "Book Code",
  "Book Name",
  "Quantity",
] as const;

export const BOOK_SUMMARY_SHEET_COLUMNS = [
  { width: 10 }, // Sr No
  { width: 16 }, // Book Code
  { width: 48 }, // Book Name
  { width: 14 }, // Quantity
];

export function bookSummarySheet(orders: any[]) {
  const ROW_HEIGHT = 22.5;
  const FONT_FAMILY = "Lora";
  const border = "#475569";

  const headerCols = [
    { value: "Sr No", width: 10 },
    { value: "Book Code", width: 16 },
    { value: "Book Name", width: 48 },
    { value: "Quantity", width: 14 },
  ];

  // Theme Header Style: Royal Blue matching Bookstore Brand Theme with Lora font and 22.5pt height
  const headerRow = headerCols.map((col) => ({
    value: col.value,
    fontFamily: FONT_FAMILY,
    height: ROW_HEIGHT,
    fontWeight: "bold" as const,
    backgroundColor: "#1F65A8",
    textColor: "#FFFFFF",
    align: "center" as const,
    alignVertical: "center" as const,
    borderColor: "#1E3A8A",
    borderStyle: "thin" as const,
  }));

  const bookMap = new Map<
    string,
    { code: string; title: string; quantity: number }
  >();

  orders.forEach((o) => {
    const rawItems =
      o.items && o.items.length > 0
        ? o.items
        : [
            {
              code: "—",
              title: "Order Record",
              quantity: 1,
            },
          ];

    const hasAnyReceivedOrDispatched =
      rawItems.some((it: any) => Boolean(it.received_from_vendor)) ||
      Boolean(o.vendor_dispatched_at) ||
      ["SHIPPED", "DELIVERED"].includes(o.status);

    const hasShortage =
      hasAnyReceivedOrDispatched &&
      rawItems.some((it: any) => !it.received_from_vendor);

    // Only summarize missing books for shortage orders
    const items = hasShortage
      ? rawItems.filter((it: any) => !it.received_from_vendor)
      : rawItems;

    items.forEach((item: any) => {
      const rawCode = String(item.code || "").trim();
      const rawTitle = String(item.title || "").trim();
      const code = rawCode || "—";
      const title = rawTitle || "—";
      const qty = Number(item.quantity) || 1;

      // Grouping key: normalize book code to uppercase; if no code, use title lowercase
      const key =
        (rawCode ? rawCode.toUpperCase() : rawTitle.toLowerCase()) || "—";

      const existing = bookMap.get(key);
      if (existing) {
        existing.quantity += qty;
        if (
          (!existing.title || existing.title === "—") &&
          title &&
          title !== "—"
        ) {
          existing.title = title;
        }
        if ((!existing.code || existing.code === "—") && code && code !== "—") {
          existing.code = code;
        }
      } else {
        bookMap.set(key, {
          code,
          title,
          quantity: qty,
        });
      }
    });
  });

  const sortedBooks = Array.from(bookMap.values()).sort((a, b) => {
    if (a.code === "—" && b.code !== "—") return 1;
    if (b.code === "—" && a.code !== "—") return -1;
    const cmp = a.code.localeCompare(b.code, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (cmp !== 0) return cmp;
    return a.title.localeCompare(b.title, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const grandTotalBooks = sortedBooks.reduce((sum, b) => sum + b.quantity, 0);

  const dataRows = sortedBooks.map((b, idx) => [
    {
      value: idx + 1,
      type: Number,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
      align: "center" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
    },
    {
      value: b.code,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
      fontWeight: "bold" as const,
      align: "center" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
    },
    {
      value: b.title,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
      align: "left" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
    },
    {
      value: b.quantity,
      type: Number,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
      align: "center" as const,
      alignVertical: "center" as const,
      borderColor: border,
      borderStyle: "thin" as const,
    },
  ]);

  const grandTotalRow = [
    null,
    null,
    {
      value: `(Total Books: ${grandTotalBooks})`,
      columnSpan: 2,
      span: 2,
      colSpan: 2,
      fontFamily: FONT_FAMILY,
      height: ROW_HEIGHT,
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

