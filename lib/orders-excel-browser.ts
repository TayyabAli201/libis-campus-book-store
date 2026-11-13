import {
  orderSheet,
  bookSummarySheet,
  BOOK_SUMMARY_SHEET_COLUMNS,
} from "./orders-spreadsheet";

export async function exportOrdersExcel(
  orders: any[],
  filename = "orders.xlsx",
  options?: {
    includeAddress?: boolean;
    includeMobile?: boolean;
    sheetName?: string;
    includeBookSummary?: boolean;
  },
) {
  const includeAddress = Boolean(options?.includeAddress);
  const includeMobile =
    options?.includeMobile !== undefined
      ? Boolean(options.includeMobile)
      : includeAddress;
  const rawSheet = options?.sheetName || "Orders";
  const sheetName =
    rawSheet.replace(/[\\/?*\[\]:]/g, "").slice(0, 31) || "Orders";
  const { default: writeExcelFile } = await import("write-excel-file/browser");

  const orderColumns = [
    { width: 10 }, // Sr No
    { width: 24 }, // Order Number
    { width: 26 }, // Student Name
    ...(includeMobile ? [{ width: 18 }] : []), // Mobile Number
    ...(includeAddress ? [{ width: 36 }] : []), // Address
    { width: 16 }, // Book Code
    { width: 46 }, // Book Name
    { width: 12 }, // Quantity
    { width: 14 }, // Total Books
  ];

  if (options?.includeBookSummary) {
    await writeExcelFile(
      [
        {
          sheet: sheetName,
          data: orderSheet(orders, options),
          columns: orderColumns,
          stickyRowsCount: 1,
        },
        {
          sheet: "Books Summary",
          data: bookSummarySheet(orders),
          columns: BOOK_SUMMARY_SHEET_COLUMNS,
          stickyRowsCount: 1,
        },
      ],
      {},
    ).toFile(filename);
  } else {
    await writeExcelFile(orderSheet(orders, options), {
      sheet: sheetName,
      columns: orderColumns,
      stickyRowsCount: 1,
    }).toFile(filename);
  }
}

export async function exportFullStoreBackup(
  backupData: { orders: any[]; items: any[]; vendor_payments: any[] },
  filename = `Store_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`,
) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");

  const headerStyle = {
    fontWeight: "bold" as const,
    backgroundColor: "#1F65A8",
    textColor: "#FFFFFF",
    align: "center" as const,
    alignVertical: "center" as const,
  };

  const cell = (val: any, align: "left" | "center" | "right" = "left", bold = false) => ({
    value: val ?? "—",
    align,
    fontWeight: bold ? ("bold" as const) : undefined,
  });

  // Sheet 1: Orders
  const orderCols = [
    { width: 8 },  // Sr
    { width: 16 }, // Reference
    { width: 24 }, // Student
    { width: 16 }, // Phone
    { width: 16 }, // City
    { width: 14 }, // Delivery Type
    { width: 34 }, // Address
    { width: 14 }, // Status
    { width: 16 }, // Payment Status
    { width: 14 }, // Total (Rs)
    { width: 18 }, // Vendor
    { width: 22 }, // Created At
  ];
  const orderHeaders = [
    "Sr", "Order Ref", "Student Name", "Phone", "City", 
    "Delivery", "Address", "Status", "Payment", "Total (Rs)", "Vendor", "Created At"
  ].map((v) => ({ ...headerStyle, value: v }));

  const orderRows = (backupData.orders || []).map((o, idx) => [
    cell(idx + 1, "center"),
    cell(o.reference, "center", true),
    cell(o.name),
    cell(o.phone, "center"),
    cell(o.city),
    cell(o.delivery_type),
    cell(o.address),
    cell(o.status, "center"),
    cell(o.payment_status, "center"),
    cell(Math.round(Number(o.total || 0) / 100), "right"),
    cell(o.vendor_name || "Unassigned"),
    cell(o.created_at ? new Date(o.created_at).toLocaleString() : "—"),
  ]);

  // Sheet 2: Order Items
  const itemCols = [
    { width: 8 },  // Sr
    { width: 16 }, // Order Ref
    { width: 16 }, // Book Code
    { width: 38 }, // Book Title
    { width: 10 }, // Pages
    { width: 10 }, // Qty
    { width: 14 }, // Unavailable
    { width: 14 }, // Office Stock
  ];
  const itemHeaders = [
    "Sr", "Order Ref", "Book Code", "Book Title", "Pages", "Quantity", "Unavailable", "Office Stock"
  ].map((v) => ({ ...headerStyle, value: v }));

  const itemRows = (backupData.items || []).map((it, idx) => [
    cell(idx + 1, "center"),
    cell(it.order_reference, "center", true),
    cell(it.code, "center"),
    cell(it.title),
    cell(Number(it.pages || 0), "right"),
    cell(Number(it.quantity || 1), "right"),
    cell(it.is_unavailable ? "YES" : "NO", "center"),
    cell(it.in_office_stock ? "YES" : "NO", "center"),
  ]);

  // Sheet 3: Vendor Payments
  const vpCols = [
    { width: 8 },  // Sr
    { width: 22 }, // Vendor Name
    { width: 16 }, // Amount (Rs)
    { width: 16 }, // Payment Date
    { width: 16 }, // Method
    { width: 30 }, // Reference / Note
    { width: 22 }, // Recorded At
  ];
  const vpHeaders = [
    "Sr", "Vendor", "Amount (Rs)", "Payment Date", "Method", "Reference / Note", "Recorded At"
  ].map((v) => ({ ...headerStyle, value: v }));

  const vpRows = (backupData.vendor_payments || []).map((vp, idx) => [
    cell(idx + 1, "center"),
    cell(vp.vendor_name || "Vendor"),
    cell(Math.round(Number(vp.amount || 0)), "right", true),
    cell(vp.payment_date || "—", "center"),
    cell(vp.payment_method || "Bank Transfer", "center"),
    cell(vp.reference || vp.note || "—"),
    cell(vp.created_at ? new Date(vp.created_at).toLocaleString() : "—"),
  ]);

  // Sheet 4: Summary
  const summaryCols = [{ width: 30 }, { width: 26 }];
  const summaryHeaders = ["Summary Metric", "Value"].map((v) => ({ ...headerStyle, value: v }));
  const totalSalesRs = (backupData.orders || []).reduce(
    (sum, o) => sum + Math.round(Number(o.total || 0) / 100),
    0,
  );
  const totalPaidVendorRs = (backupData.vendor_payments || []).reduce(
    (sum, vp) => sum + Math.round(Number(vp.amount || 0)),
    0,
  );

  const summaryRows = [
    [cell("Total Orders"), cell(backupData.orders?.length || 0, "right", true)],
    [cell("Total Books / Items Ordered"), cell(backupData.items?.length || 0, "right", true)],
    [cell("Gross Sales (Rs.)"), cell(totalSalesRs.toLocaleString(), "right", true)],
    [cell("Total Vendor Payments Made (Rs.)"), cell(totalPaidVendorRs.toLocaleString(), "right", true)],
    [cell("Backup Export Date"), cell(new Date().toLocaleString(), "right")],
  ];

  await writeExcelFile(
    [
      { sheet: "Orders", data: [orderHeaders, ...orderRows], columns: orderCols, stickyRowsCount: 1 },
      { sheet: "Order Items", data: [itemHeaders, ...itemRows], columns: itemCols, stickyRowsCount: 1 },
      { sheet: "Vendor Payments", data: [vpHeaders, ...vpRows], columns: vpCols, stickyRowsCount: 1 },
      { sheet: "Summary", data: [summaryHeaders, ...summaryRows], columns: summaryCols, stickyRowsCount: 1 },
    ],
    {},
  ).toFile(filename);
}


