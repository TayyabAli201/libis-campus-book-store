import {
  checkoutInput,
  transitions,
  statuses,
  type Quote,
  type User,
  type Book,
  STUDENT_CATEGORY,
  isOtherCityOrder,
  money,
} from "../contracts";
import {
  all,
  one,
  stmt,
  batch,
  now,
  uid,
  AppError,
  guard,
  auditStmt,
} from "./db";
import { getBookSql, getSettings } from "./catalog";
import { guest, hash, token, scope } from "./security";
import { compareAmount } from "./ocr";
export async function pendingOrderCount() {
  const row = await one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM orders WHERE status='PAYMENT_PENDING'",
  );
  return row?.count || 0;
}
export async function priceCart(input: unknown) {
  const c = checkoutInput.parse(input);
  const { settings, version } = await getSettings();
  if (!settings.store_open)
    throw new AppError(409, "The store is temporarily closed for new orders.");
  let pricingCategory = STUDENT_CATEGORY;
  if (c.campus_id) {
    const campusRow = await one<{ category: string; active: number }>(
      "SELECT category, active FROM campuses WHERE id=?",
      c.campus_id,
    );
    if (!campusRow || !campusRow.active)
      throw new AppError(400, "Select an active campus.");
    if (campusRow.category) pricingCategory = campusRow.category;
  }
  const bookSql = getBookSql(pricingCategory);
  const items = [];
  for (const item of c.items) {
    const b = await one<Book>(
      bookSql + " WHERE b.id=? AND b.deleted_at IS NULL",
      item.id,
    );
    if (!b || !b.active || b.pages === null || b.price === null)
      throw new AppError(
        409,
        `${b?.code || "A book"} is no longer available for sale.`,
      );
    if (b.campus_id && b.campus_id !== c.campus_id)
      throw new AppError(400, `${b.code} belongs to another campus.`);
    items.push({
      ...b,
      pages: b.pages,
      price: b.price,
      quantity: item.quantity,
    });
  }
  const subtotal = items.reduce((sum, b) => sum + b.price * b.quantity, 0);
  const delivery =
    c.delivery_type === "campus"
      ? settings.delivery_campus ?? 10000
      : c.delivery_type === "lahore"
        ? settings.delivery_lahore
        : settings.delivery_other;
  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(subtotal + delivery)
  )
    throw new AppError(
      400,
      "The order total is too large. Please reduce the quantities.",
    );
  return {
    customer: c,
    items,
    subtotal,
    delivery,
    total: subtotal + delivery,
    settings,
    settingsVersion: version,
  };
}
export async function quote(req: Request, input: unknown) {
  const data = await priceCart(input);
  const id = uid(),
    expires = Date.now() + 30 * 60000;
  await stmt(
    "INSERT INTO quotes(id,owner,data,expires_at,created_at) VALUES(?,?,?,?,?)",
    id,
    guest(req),
    JSON.stringify(data),
    expires,
    now(),
  ).run();
  return { ...data, id, expires_at: expires };
}
export async function submitOrder(
  req: Request,
  quoteId: string,
  slipId: string,
) {
  const owner = guest(req);
  const existing = await one<any>(
    "SELECT id,reference FROM orders WHERE quote_id=? AND owner=?",
    quoteId,
    owner,
  );
  if (existing) return { ...existing, replayed: true };
  const q = await one<any>(
    "SELECT * FROM quotes WHERE id=? AND owner=?",
    quoteId,
    owner,
  );
  if (!q || q.expires_at < Date.now())
    throw new AppError(
      409,
      "Your price quote has expired. Review checkout again.",
    );
  const data = JSON.parse(q.data);
  const current = await priceCart(data.customer);
  if (
    current.total !== data.total ||
    current.items.some((b: any, i: number) => b.price !== data.items[i].price)
  )
    throw new AppError(
      409,
      "Prices changed. Review the updated total before submitting payment.",
    );
  const slip = await one<any>(
    "SELECT * FROM payment_slips WHERE id=? AND owner=? AND order_id IS NULL",
    slipId,
    owner,
  );
  if (!slip)
    throw new AppError(
      400,
      "Upload payment proof before submitting the order.",
    );
  const id = uid(),
    at = now();
  let dd = "01",
    mm = "01";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "2-digit",
    }).formatToParts(new Date());
    dd = parts.find((p) => p.type === "day")?.value || "01";
    mm = parts.find((p) => p.type === "month")?.value || "01";
  } catch {
    const [, m, d] = at.slice(0, 10).split("-");
    dd = d || "01";
    mm = m || "01";
  }
  const dateKey = `${dd}${mm}`;
  const prefix =
    data.settings?.order_prefix && data.settings.order_prefix !== "CBS"
      ? data.settings.order_prefix
      : "VU";
  const basePrefix = `${prefix}-${dateKey}-`;

  const latestOrder = await one<{ reference: string }>(
    "SELECT reference FROM orders WHERE reference LIKE ? OR reference LIKE ? ORDER BY rowid DESC LIMIT 1",
    `${prefix}-%`,
    `${prefix.toLowerCase()}-%`,
  );

  let nextSeq = 1;
  if (latestOrder?.reference) {
    const match = latestOrder.reference.match(/(\d+)$/);
    const parsed = match
      ? parseInt(match[1], 10)
      : parseInt(latestOrder.reference.slice(-4), 10);
    if (!isNaN(parsed) && parsed >= 1) {
      nextSeq = parsed + 1;
    }
  }

  let reference = `${basePrefix}${String(nextSeq).padStart(4, "0")}`;
  let attempts = 0;
  while (attempts < 20) {
    const existing = await one<{ id: string }>(
      "SELECT id FROM orders WHERE reference=?",
      reference,
    );
    if (!existing) break;
    nextSeq++;
    reference = `${basePrefix}${String(nextSeq).padStart(4, "0")}`;
    attempts++;
  }
  const c = data.customer;
  const result = compareAmount(slip.detected_amount, data.total);
  const statements = [
    guard(
      "EXISTS(SELECT 1 FROM settings WHERE id=1 AND version=?)",
      current.settingsVersion,
    ),
    guard(
      "EXISTS(SELECT 1 FROM payment_slips WHERE id=? AND owner=? AND order_id IS NULL)",
      slipId,
      owner,
    ),
    stmt(
      "INSERT INTO orders(id,reference,owner,tracking_hash,quote_id,campus_id,name,phone,city,address,instructions,delivery_type,subtotal,delivery,total,currency,store_snapshot,status,inventory_state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      reference,
      owner,
      // Retained for the existing schema; this value no longer grants access.
      hash(token()),
      quoteId,
      c.campus_id,
      c.name,
      c.phone,
      c.city,
      c.address,
      c.instructions,
      c.delivery_type,
      data.subtotal,
      data.delivery,
      data.total,
      data.settings.currency,
      JSON.stringify(data.settings),
      "PAYMENT_PENDING",
      "RELEASED",
      at,
      at,
    ),
  ];
  if (c.campus_id)
    statements.push(
      guard(
        "EXISTS(SELECT 1 FROM campuses WHERE id=? AND active=1)",
        c.campus_id,
      ),
    );
  let pricingCategory = STUDENT_CATEGORY;
  if (c.campus_id) {
    const campusRow = await one<{ category: string }>(
      "SELECT category FROM campuses WHERE id=?",
      c.campus_id,
    );
    if (campusRow?.category) pricingCategory = campusRow.category;
  }
  for (const b of current.items) {
    statements.push(
      guard(
        "EXISTS(SELECT 1 FROM books b JOIN pricing_categories p ON p.id=? WHERE b.id=? AND b.active=1 AND b.deleted_at IS NULL AND b.version=? AND (CASE WHEN b.fixed_price IS NOT NULL OR b.pages IS NOT NULL THEN CAST(CEIL((COALESCE(b.fixed_price,b.pages*p.rate)+COALESCE(p.binding_rate,0))/500.0)*500 AS INTEGER) ELSE NULL END)=?)",
        pricingCategory,
        b.id,
        b.version,
        b.price,
      ),
      stmt(
        "INSERT INTO order_items(id,order_id,book_id,code,title,pages,category,rate,unit_price,quantity) VALUES(?,?,?,?,?,?,?,?,?,?)",
        uid(),
        id,
        b.id,
        b.code,
        b.title,
        b.pages,
        pricingCategory,
        b.rate,
        b.price,
        b.quantity,
      ),
    );
  }
  statements.push(
    stmt(
      "UPDATE payment_slips SET order_id=?,ocr_status=?,ocr_message=? WHERE id=?",
      id,
      result.status,
      result.message,
      slipId,
    ),
    stmt(
      "INSERT INTO payments(id,order_id,slip_id,status,updated_at) VALUES(?,?,?,?,?)",
      uid(),
      id,
      slipId,
      "PENDING",
      at,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
      uid(),
      id,
      "PAYMENT_PENDING",
      "Payment proof uploaded. Awaiting admin verification.",
      "student",
      at,
    ),
  );
  await batch(statements);
  return { id, reference, ocr: result };
}
export async function getOrder(
  req: Request,
  id: string,
  u?: User,
  access: "private" | "tracking" = "private",
) {
  const identifier = id.trim();
  if (!/^[a-zA-Z0-9-+\s()]{1,100}$/.test(identifier))
    throw new AppError(
      404,
      "Order not found. Check your Order ID or Phone Number and try again.",
    );
  const digits = identifier.replace(/\D/g, "");
  let o: any;
  if (digits.length >= 7) {
    const phoneWildcard = `%${digits.slice(-10)}%`;
    o = await one<any>(
      "SELECT o.*,p.status AS payment_status,p.slip_id,p.note AS payment_note,s.ocr_status,s.detected_amount,s.ocr_message,s.mime,(SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id=o.id) AS total_books,(SELECT name FROM vendors v WHERE v.id=o.vendor_id) AS vendor_name,(SELECT phone FROM vendors v WHERE v.id=o.vendor_id) AS vendor_phone FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE o.id=? OR o.reference=? OR o.phone=? OR o.phone LIKE ? ORDER BY o.created_at DESC LIMIT 1",
      identifier.toLowerCase(),
      identifier.toUpperCase(),
      identifier,
      phoneWildcard,
    );
  } else {
    o = await one<any>(
      "SELECT o.*,p.status AS payment_status,p.slip_id,p.note AS payment_note,s.ocr_status,s.detected_amount,s.ocr_message,s.mime,(SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id=o.id) AS total_books,(SELECT name FROM vendors v WHERE v.id=o.vendor_id) AS vendor_name,(SELECT phone FROM vendors v WHERE v.id=o.vendor_id) AS vendor_phone FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE o.id=? OR o.reference=?",
      identifier.toLowerCase(),
      identifier.toUpperCase(),
    );
  }
  if (!o)
    throw new AppError(
      404,
      "Order not found. Check your Order ID and try again.",
    );
  const staffAccess =
    !!u &&
    (u.role === "SUPER_ADMIN" ||
      (u.role === "CAMPUS_ADMIN" && o.campus_id === u.campus_id) ||
      (u.role === "VENDOR" && o.vendor_id === (u.vendor_id || u.id)));
  if (u && !staffAccess && access === "private")
    throw new AppError(404, "Order not found.");
  let owned = false;
  try {
    owned = guest(req) === o.owner;
  } catch {}
  const privateAccess = staffAccess || owned;
  if (!privateAccess && access === "private")
    throw new AppError(404, "Order not found.");
  const items = await all("SELECT * FROM order_items WHERE order_id=?", o.id);
  const history = await all(
    `SELECT status,note,created_at,actor,internal FROM order_history WHERE order_id=? ${u?.role === "SUPER_ADMIN" ? "" : "AND internal=0"} ORDER BY created_at`,
    o.id,
  );
  if (!privateAccess) {
    // Public tracking has an explicit allowlist: no customer details, proofs or internal notes.
    return {
      reference: o.reference,
      delivery_type: o.delivery_type,
      status: o.status,
      payment_status: o.payment_status,
      subtotal: o.subtotal,
      delivery: o.delivery,
      total: o.total,
      currency: o.currency,
      ...(Number(o.due_amount || 0) > 0 || Number(o.amount_paid || 0) > 0
        ? {
            amount_paid: Number(o.amount_paid || 0),
            due_amount: Number(o.due_amount || 0),
            due_status: o.due_status || "NONE",
          }
        : {}),
      ...(Number(o.refund_due || 0) > 0 || Number(o.refund_amount || 0) > 0
        ? {
            refund_due: Number(o.refund_due || 0),
            refund_amount: Number(o.refund_amount || 0),
            refund_status: o.refund_status || "NONE",
          }
        : {}),
      created_at: o.created_at,
      updated_at: o.updated_at,
      ...(o.courier_name ? { courier_name: o.courier_name } : {}),
      ...(o.courier_tracking_id
        ? { courier_tracking_id: o.courier_tracking_id }
        : {}),
      tracking_only: true,
      items: items.map(({ code, title, pages, quantity, unit_price }) => ({
        code,
        title,
        pages,
        quantity,
        unit_price,
      })),
      history: history
        .filter(
          ({ status }) =>
            status !== "READY" && status !== "READY_FOR_DISPATCH",
        )
        .map(({ status, created_at, note }) => {
          const isCourierNote =
            typeof note === "string" && note.startsWith("Shipped via ");
          return {
            status,
            created_at,
            ...(isCourierNote ? { note } : {}),
          };
        }),
      ...(o.payment_status === "NEW_SLIP_REQUESTED" && o.payment_note
        ? { payment_note: o.payment_note }
        : {}),
    };
  }
  delete o.owner;
  delete o.tracking_hash;
  delete o.quote_id;
  try {
    o.store = JSON.parse(o.store_snapshot);
  } catch {
    o.store = {};
  }
  delete o.store_snapshot;
  if (!o.store.logo_url) {
    try {
      const { settings: curSettings } = await getSettings();
      if (curSettings?.logo_url) o.store.logo_url = curSettings.logo_url;
      if (!o.store.store_name && curSettings?.store_name)
        o.store.store_name = curSettings.store_name;
      if (!o.store.header_tagline && curSettings?.header_tagline)
        o.store.header_tagline = curSettings.header_tagline;
    } catch {}
  }

  if (u?.role === "VENDOR") {
    const v = await one<any>(
      "SELECT per_page_rate, binding_rate FROM vendors WHERE id = ?",
      u.vendor_id || u.id,
    );
    const perPageRate = Number(v?.per_page_rate ?? 1.60);
    const bindingRate = Number(v?.binding_rate ?? 30.00);

    const orderPages = items.reduce(
      (sum: number, it: any) => sum + (Number(it.pages) || 0) * (it.quantity || 1),
      0,
    );
    const orderBooks = items.reduce(
      (sum: number, it: any) => sum + (it.quantity || 1),
      0,
    );
    const vendorPrice = Math.round(
      (orderPages * perPageRate) + (orderBooks * bindingRate),
    );

    const courierCharge = Number(o.actual_courier_charges || 0);
    o.vendor_price = vendorPrice;
    o.actual_courier_charges = courierCharge;
    o.vendor_total_credit = vendorPrice + courierCharge;
    o.vendor_pages = orderPages;
    o.vendor_books = orderBooks;
    o.vendor_rate_breakdown = {
      per_page_rate: perPageRate,
      binding_rate: bindingRate,
      total_pages: orderPages,
      total_books: orderBooks,
      pages_amount: Math.round(orderPages * perPageRate),
      binding_amount: Math.round(orderBooks * bindingRate),
      total_printing_cost: vendorPrice,
      actual_courier_charges: courierCharge,
      total_vendor_credit: vendorPrice + courierCharge,
      formula: courierCharge > 0
        ? `(${orderPages} pages × Rs. ${perPageRate}) + (${orderBooks} books × Rs. ${bindingRate}) + (Courier Rs. ${courierCharge}) = Rs. ${vendorPrice + courierCharge}`
        : `(${orderPages} pages × Rs. ${perPageRate}) + (${orderBooks} books × Rs. ${bindingRate}) = Rs. ${vendorPrice}`,
    };

    delete o.subtotal;
    delete o.total;
    delete o.delivery;
    delete o.slip_id;
    delete o.detected_amount;
    delete o.ocr_status;
    for (const it of items) {
      delete (it as any).unit_price;
    }
  }

  if (u?.role === "SUPER_ADMIN") {
    const paymentLogs = await all(
      "SELECT * FROM order_payment_logs WHERE order_id=? ORDER BY created_at ASC",
      o.id,
    );
    o.amount_paid = Number(o.amount_paid || 0);
    o.due_amount = Number(o.due_amount || 0);
    o.due_status = o.due_status || "NONE";
    o.due_note = o.due_note || "";
    o.refund_due = Number(o.refund_due || 0);
    o.refund_amount = Number(o.refund_amount || 0);
    o.refund_status = o.refund_status || "NONE";
    o.refund_note = o.refund_note || "";
    o.refund_paid_at = o.refund_paid_at || null;
    o.payment_logs = paymentLogs;
  } else if (u?.role === "STUDENT" || owned) {
    o.amount_paid = Number(o.amount_paid || 0);
    o.due_amount = Number(o.due_amount || 0);
    o.due_status = o.due_status || "NONE";
    o.refund_due = Number(o.refund_due || 0);
    o.refund_amount = Number(o.refund_amount || 0);
    o.refund_status = o.refund_status || "NONE";
    delete o.due_note;
    delete o.refund_note;
    delete o.payment_logs;
  } else {
    delete o.amount_paid;
    delete o.due_amount;
    delete o.due_status;
    delete o.due_note;
    delete o.refund_due;
    delete o.refund_amount;
    delete o.refund_status;
    delete o.refund_note;
    delete o.refund_paid_at;
    delete o.payment_logs;
  }

  if (u?.role === "SUPER_ADMIN" || u?.role === "VENDOR") {
    o.actual_courier_charges = Number(o.actual_courier_charges || 0);
  } else {
    delete o.actual_courier_charges;
  }

  return { ...o, items, history, tracking_only: false };
}
export async function listOrders(
  u: User,
  q = "",
  status = "",
  from = "",
  to = "",
  page = 1,
  campusId = "",
  limit?: number | "all",
  deliveryType = "",
  printed = "",
) {
  const s = scope(u);
  const filters = [s.sql];
  const args: unknown[] = [...s.args];
  if (campusId) {
    filters.push("o.campus_id=?");
    args.push(campusId);
  }
  if (q) {
    filters.push("(o.reference LIKE ? OR o.name LIKE ? OR o.phone LIKE ?)");
    args.push(...Array(3).fill("%" + q.slice(0, 100) + "%"));
  }
  if (status === "REFUNDS_DUE") {
    filters.push("(o.refund_status = 'REFUND_PENDING' OR o.refund_due > 0)");
  } else if (status && status !== "all") {
    const statuses = status
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "all");
    if (statuses.length === 1) {
      filters.push("o.status=?");
      args.push(statuses[0]);
    } else if (statuses.length > 1) {
      const placeholders = statuses.map(() => "?").join(",");
      filters.push(`o.status IN (${placeholders})`);
      args.push(...statuses);
    }
  }
  if (status === "PROCESSING") {
    if (printed === "1" || printed === "printed") {
      filters.push("o.vendor_printed_at IS NOT NULL");
    } else if (printed === "all") {
      // both printed and unprinted
    } else if (printed === "0" || printed === "unprinted" || u.role === "VENDOR") {
      // Default for In Printing queue: only unprinted orders!
      filters.push("o.vendor_printed_at IS NULL");
    }
  } else if (printed) {
    if (printed === "1" || printed === "printed") {
      filters.push("o.vendor_printed_at IS NOT NULL");
    } else if (printed === "0" || printed === "unprinted") {
      filters.push("o.vendor_printed_at IS NULL");
    }
  }
  if (deliveryType && deliveryType !== "all") {
    const types = deliveryType
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && t !== "all");
    if (types.length === 1) {
      filters.push("o.delivery_type=?");
      args.push(types[0]);
    } else if (types.length > 1) {
      const placeholders = types.map(() => "?").join(",");
      filters.push(`o.delivery_type IN (${placeholders})`);
      args.push(...types);
    }
  }
  if (from) {
    filters.push("o.created_at>=?");
    args.push(from);
  }
  if (to) {
    filters.push("o.created_at<?");
    args.push(to + "T23:59:59.999Z");
  }
  const where = filters.join(" AND ");
  const total = await one<any>(
    `SELECT COUNT(DISTINCT o.id) AS n, COALESCE(SUM(oi.quantity), 0) AS total_books FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE ${where}`,
    ...args,
  );
  const isAll = limit === "all";
  const pageSize = typeof limit === "number" && limit > 0 ? limit : 15;
  const limitClause = isAll ? "LIMIT 10000" : `LIMIT ${pageSize} OFFSET ?`;
  const queryArgs = isAll ? [...args] : [...args, (page - 1) * pageSize];
  const rows = await all(
    `SELECT o.*,p.status AS payment_status,s.detected_amount,s.ocr_status,p.slip_id,(SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id=o.id) AS total_books,(SELECT name FROM vendors v WHERE v.id=o.vendor_id) AS vendor_name,(SELECT phone FROM vendors v WHERE v.id=o.vendor_id) AS vendor_phone FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE ${where} ORDER BY o.created_at DESC ${limitClause}`,
    ...queryArgs,
  );
  rows.forEach((o: any) => {
    delete o.owner;
    delete o.tracking_hash;
    delete o.quote_id;
    delete o.store_snapshot;
    if (u.role !== "SUPER_ADMIN" && !u.permissions?.includes("orders.update")) {
      delete o.amount_paid;
      delete o.due_amount;
      delete o.due_status;
      delete o.due_note;
      delete o.refund_due;
      delete o.refund_amount;
      delete o.refund_status;
      delete o.refund_note;
      delete o.refund_paid_at;
    } else {
      o.amount_paid = Number(o.amount_paid || 0);
      o.due_amount = Number(o.due_amount || 0);
      o.due_status = o.due_status || "NONE";
      o.refund_due = Number(o.refund_due || 0);
      o.refund_amount = Number(o.refund_amount || 0);
      o.refund_status = o.refund_status || "NONE";
    }
    if (u.role !== "SUPER_ADMIN" && u.role !== "VENDOR") {
      delete o.actual_courier_charges;
    } else {
      o.actual_courier_charges = Number(o.actual_courier_charges || 0);
    }
  });
  if (rows.length > 0) {
    const orderIds = rows.map((r: any) => r.id);
    const allItems: any[] = [];
    for (let i = 0; i < orderIds.length; i += 100) {
      const slice = orderIds.slice(i, i + 100);
      const placeholders = slice.map(() => "?").join(",");
      const batchItems = await all(
        `SELECT id,order_id,code,title,pages,unit_price,quantity,received_from_vendor FROM order_items WHERE order_id IN (${placeholders})`,
        ...slice,
      );
      allItems.push(...batchItems);
    }
    const itemsByOrder = new Map<string, any[]>();
    for (const it of allItems) {
      const list = itemsByOrder.get(it.order_id) || [];
      list.push(it);
      itemsByOrder.set(it.order_id, list);
    }
    for (const r of rows) {
      (r as any).items = itemsByOrder.get(r.id) || [];
    }
  }

  // Calculate live counts per status for top workflow tabs
  const tabFilters = [s.sql];
  const tabArgs: unknown[] = [...s.args];
  if (campusId) {
    tabFilters.push("o.campus_id=?");
    tabArgs.push(campusId);
  }
  if (q) {
    tabFilters.push("(o.reference LIKE ? OR o.name LIKE ? OR o.phone LIKE ?)");
    tabArgs.push(...Array(3).fill("%" + q.slice(0, 100) + "%"));
  }
  if (deliveryType && deliveryType !== "all") {
    const types = deliveryType
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && t !== "all");
    if (types.length === 1) {
      tabFilters.push("o.delivery_type=?");
      tabArgs.push(types[0]);
    } else if (types.length > 1) {
      const placeholders = types.map(() => "?").join(",");
      tabFilters.push(`o.delivery_type IN (${placeholders})`);
      tabArgs.push(...types);
    }
  }
  if (from) {
    tabFilters.push("o.created_at>=?");
    tabArgs.push(from);
  }
  if (to) {
    tabFilters.push("o.created_at<?");
    tabArgs.push(to + "T23:59:59.999Z");
  }
  const tabWhere = tabFilters.join(" AND ");
  const statusGroupRows = await all<{ status: string; cnt: number }>(
    `SELECT o.status, COUNT(DISTINCT o.id) AS cnt FROM orders o WHERE ${tabWhere} GROUP BY o.status`,
    ...tabArgs,
  );
  const status_counts: Record<string, number> = {};
  let allCount = 0;
  statusGroupRows.forEach((r) => {
    status_counts[r.status] = r.cnt;
    allCount += r.cnt;
  });
  status_counts["ALL"] = allCount;

  const unprintedRow = await one<{ cnt: number }>(
    `SELECT COUNT(DISTINCT o.id) AS cnt FROM orders o WHERE ${tabWhere} AND o.status='PROCESSING' AND o.vendor_printed_at IS NULL`,
    ...tabArgs,
  );
  const printedRow = await one<{ cnt: number }>(
    `SELECT COUNT(DISTINCT o.id) AS cnt FROM orders o WHERE ${tabWhere} AND o.status='PROCESSING' AND o.vendor_printed_at IS NOT NULL`,
    ...tabArgs,
  );
  status_counts["PROCESSING"] = unprintedRow?.cnt || 0;
  status_counts["PRINTED"] = printedRow?.cnt || 0;

  const refundsDueRow = await one<{ cnt: number }>(
    `SELECT COUNT(DISTINCT o.id) AS cnt FROM orders o WHERE ${tabWhere} AND (o.refund_status='REFUND_PENDING' OR o.refund_due > 0)`,
    ...tabArgs,
  );
  status_counts["REFUNDS_DUE"] = refundsDueRow?.cnt || 0;

  let vendor_overview: any = null;
  if (u.role === "VENDOR") {
    const vendorId = u.vendor_id || u.id;
    const v = await one<any>(
      "SELECT per_page_rate, binding_rate FROM vendors WHERE id = ?",
      vendorId,
    );
    const perPageRate = Number(v?.per_page_rate ?? 1.60);
    const bindingRate = Number(v?.binding_rate ?? 30.00);

    for (const r of rows) {
      const items = (r as any).items || [];
      const orderPages = items.reduce(
        (sum: number, it: any) => sum + (Number(it.pages) || 0) * (it.quantity || 1),
        0,
      );
      const orderBooks = items.reduce(
        (sum: number, it: any) => sum + (it.quantity || 1),
        0,
      );
      const vendorPrice = Math.round(
        (orderPages * perPageRate) + (orderBooks * bindingRate),
      );

      const courierCharge = Number((r as any).actual_courier_charges || 0);
      (r as any).vendor_price = vendorPrice;
      (r as any).actual_courier_charges = courierCharge;
      (r as any).vendor_total_credit = vendorPrice + courierCharge;
      (r as any).vendor_pages = orderPages;
      (r as any).vendor_books = orderBooks;
      (r as any).vendor_rate_breakdown = {
        per_page_rate: perPageRate,
        binding_rate: bindingRate,
        total_pages: orderPages,
        total_books: orderBooks,
        pages_amount: Math.round(orderPages * perPageRate),
        binding_amount: Math.round(orderBooks * bindingRate),
        total_printing_cost: vendorPrice,
        actual_courier_charges: courierCharge,
        total_vendor_credit: vendorPrice + courierCharge,
        formula: courierCharge > 0
          ? `(${orderPages} pgs × Rs. ${perPageRate}) + (${orderBooks} bks × Rs. ${bindingRate}) + (Courier Rs. ${courierCharge}) = Rs. ${vendorPrice + courierCharge}`
          : `(${orderPages} pgs × Rs. ${perPageRate}) + (${orderBooks} bks × Rs. ${bindingRate}) = Rs. ${vendorPrice}`,
      };

      // 100% Privacy: Delete retail customer prices and payment slip info
      delete (r as any).subtotal;
      delete (r as any).total;
      delete (r as any).delivery;
      delete (r as any).payment_status;
      delete (r as any).slip_id;
      delete (r as any).detected_amount;
      delete (r as any).ocr_status;
      for (const it of items) {
        delete (it as any).unit_price;
      }
    }

    const vendorAggregate = await one<any>(
      `SELECT 
        COUNT(DISTINCT o.id) AS total_assigned,
        COUNT(DISTINCT CASE WHEN o.status = 'PROCESSING' AND o.vendor_printed_at IS NULL THEN o.id END) AS printing_queue_count,
        COUNT(DISTINCT CASE WHEN o.vendor_printed_at IS NOT NULL THEN o.id END) AS printed_count,
        COALESCE(SUM(oi.pages * oi.quantity), 0) AS total_pages,
        COALESCE(SUM(oi.quantity), 0) AS total_books
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.vendor_id = ?`,
      vendorId,
    );

    const totalPagesAll = Number(vendorAggregate?.total_pages || 0);
    const totalBooksAll = Number(vendorAggregate?.total_books || 0);
    const totalPrintingCostAll = Math.round((totalPagesAll * perPageRate) + (totalBooksAll * bindingRate));

    const courierStats = await one<any>(
      `SELECT 
        COALESCE(SUM(actual_courier_charges), 0) AS total_courier_charges,
        COUNT(CASE WHEN actual_courier_charges > 0 THEN 1 END) AS courier_orders_count
       FROM orders
       WHERE vendor_id = ?`,
      vendorId,
    );
    const totalCourierAll = Math.round(Number(courierStats?.total_courier_charges || 0));
    const courierOrdersCountAll = Number(courierStats?.courier_orders_count || 0);
    const totalEarningsAll = totalPrintingCostAll + totalCourierAll;

    const totalPaidRow = await one<any>(
      "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM vendor_payments WHERE vendor_id = ?",
      vendorId,
    );
    const totalPaidAll = Number(totalPaidRow?.total_paid || 0);
    const pendingBalanceAll = totalEarningsAll - totalPaidAll;

    vendor_overview = {
      total_assigned: Number(vendorAggregate?.total_assigned || 0),
      printing_queue_count: Number(vendorAggregate?.printing_queue_count || 0),
      printed_count: Number(vendorAggregate?.printed_count || 0),
      total_printing_cost: totalPrintingCostAll,
      total_courier_charges: totalCourierAll,
      courier_orders_count: courierOrdersCountAll,
      total_earnings: totalEarningsAll,
      total_paid: totalPaidAll,
      pending_balance: pendingBalanceAll,
      per_page_rate: perPageRate,
      binding_rate: bindingRate,
    };
  }

  return {
    rows,
    total: total?.n || 0,
    total_books: total?.total_books || 0,
    page,
    pageSize,
    status_counts,
    ...(vendor_overview ? { vendor_overview } : {}),
  };
}
export function movementStatements(
  o: any,
  items: any[],
  kind: "DEDUCT" | "RELEASE" | "RESTOCK",
  actor: string,
) {
  return items.flatMap((b) => [
    stmt(
      kind === "DEDUCT"
        ? "UPDATE inventory SET stock=stock-?,reserved=reserved-? WHERE book_id=?"
        : kind === "RELEASE"
          ? "UPDATE inventory SET reserved=reserved-? WHERE book_id=?"
          : "UPDATE inventory SET stock=stock+? WHERE book_id=?",
      ...(kind === "DEDUCT"
        ? [b.quantity, b.quantity, b.book_id]
        : [b.quantity, b.book_id]),
    ),
    stmt(
      "INSERT INTO inventory_transactions(id,book_id,order_id,kind,quantity,actor,note,created_at) VALUES(?,?,?,?,?,?,?,?)",
      uid(),
      b.book_id,
      o.id,
      kind,
      b.quantity,
      actor,
      kind === "DEDUCT"
        ? "Payment approved"
        : kind === "RELEASE"
          ? "Reservation released"
          : "Unshipped order cancelled",
      now(),
    ),
  ]);
}
export async function decidePayment(
  req: Request,
  u: User,
  id: string,
  action: string,
  note: string,
  version: number,
  amountPaid?: number,
  dueNote?: string,
) {
  const o = await getOrder(req, id, u);
  if (o.version !== version)
    throw new AppError(409, "Order changed. Refresh before reviewing.");
  if (o.status !== "PAYMENT_PENDING" || o.payment_status === "VERIFIED")
    throw new AppError(409, "This order is no longer awaiting payment review.");
  const items = o.items;
  const at = now();
  let status = o.status,
    payment = o.payment_status,
    state = o.inventory_state;
  const statements = [
    guard(
      "EXISTS(SELECT 1 FROM orders WHERE id=? AND version=? AND status=?)",
      o.id,
      version,
      "PAYMENT_PENDING",
    ),
  ];

  let paid = o.total;
  let due = 0;
  let dueStatus = "PAID";
  let dueNoteText = "";

  if (action === "approve") {
    statements.push(
      guard(
        "NOT EXISTS(SELECT 1 FROM payments p JOIN payment_slips s ON s.id=p.slip_id WHERE p.status='VERIFIED' AND p.order_id!=? AND s.digest=(SELECT digest FROM payment_slips WHERE id=?))",
        o.id,
        o.slip_id,
      ),
    );
    status = "CONFIRMED";
    payment = "VERIFIED";

    const hasPaidAmount =
      amountPaid !== undefined &&
      amountPaid !== null &&
      Number.isFinite(Number(amountPaid));
    paid = hasPaidAmount ? Math.max(0, Math.round(Number(amountPaid))) : o.total;
    due = Math.max(0, o.total - paid);
    dueStatus = due > 0 ? "DUE_PENDING" : "PAID";
    dueNoteText = typeof dueNote === "string" ? dueNote.trim() : "";

    // Settle reservations only for orders created before stock tracking was removed.
    if (state === "RESERVED") {
      statements.push(...movementStatements(o, items, "RELEASE", u.email));
      state = "RELEASED";
    }

    statements.push(
      stmt(
        "UPDATE orders SET status=?,inventory_state=?,amount_paid=?,due_amount=?,due_status=?,due_note=?,version=version+1,updated_at=? WHERE id=?",
        status,
        state,
        paid,
        due,
        dueStatus,
        dueNoteText,
        at,
        o.id,
      ),
      stmt(
        "INSERT INTO order_payment_logs(id,order_id,amount,type,note,actor,payment_date,created_at) VALUES(?,?,?,?,?,?,?,?)",
        uid(),
        o.id,
        paid,
        due > 0 ? "ADVANCE" : "FULL_PAYMENT",
        dueNoteText || (due > 0 ? "Initial partial payment approved" : "Payment verified in full"),
        u.email,
        at,
        at,
      ),
    );
  } else {
    if (action === "reject") {
      if (!note) throw new AppError(400, "A rejection reason is required.");
      status = "REJECTED";
      payment = "REJECTED";
      if (state === "RESERVED")
        statements.push(...movementStatements(o, items, "RELEASE", u.email));
      state = "RELEASED";
    } else if (action === "request") {
      if (!note)
        throw new AppError(400, "Explain what the new slip should correct.");
      payment = "NEW_SLIP_REQUESTED";
    } else if (action === "manual") payment = "MANUAL_REVIEW";
    else throw new AppError(400, "Invalid payment decision.");

    statements.push(
      stmt(
        "UPDATE orders SET status=?,inventory_state=?,version=version+1,updated_at=? WHERE id=?",
        status,
        state,
        at,
        o.id,
      ),
    );
  }

  const historyNote =
    action === "approve" && due > 0
      ? `Payment review: VERIFIED (Partial). Received: ${money(paid)}, Due Balance: ${money(due)}.${dueNoteText ? ` Note: ${dueNoteText}` : ""}`
      : `Payment review: ${payment}. ${note}`;

  statements.push(
    stmt(
      "UPDATE payments SET status=?,reviewer=?,note=?,updated_at=? WHERE order_id=?",
      payment,
      u.id,
      note,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
      uid(),
      o.id,
      status,
      historyNote,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "PAYMENT_" + action.toUpperCase(),
      o.id,
      { status: o.payment_status },
      {
        status: payment,
        note,
        amount_paid: paid,
        due_amount: due,
        due_status: dueStatus,
      },
      req,
    ),
  );
  await batch(statements);
  return {
    status,
    payment,
    amount_paid: paid,
    due_amount: due,
    due_status: dueStatus,
  };
}

export async function recordDuePayment(
  req: Request,
  u: User,
  orderId: string,
  amount: number,
  note = "",
) {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can record due payments.");
  }
  const cleanAmount = Math.round(Number(amount));
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    throw new AppError(400, "Payment amount must be greater than 0.");
  }

  const o = await getOrder(req, orderId, u);
  if (!o) throw new AppError(404, "Order not found.");

  if ((o.due_amount || 0) <= 0 && o.due_status === "PAID") {
    throw new AppError(400, "This order already has no remaining due balance.");
  }

  const at = now();
  const currentPaid = Number(o.amount_paid || 0);
  const newAmountPaid = currentPaid + cleanAmount;
  const newDueAmount = Math.max(0, Number(o.total || 0) - newAmountPaid);
  const newDueStatus = newDueAmount === 0 ? "PAID" : "DUE_PENDING";
  const cleanNote = (note || "").trim();

  const statements = [
    guard(
      "EXISTS(SELECT 1 FROM orders WHERE id=? AND version=?)",
      o.id,
      o.version,
    ),
    stmt(
      "UPDATE orders SET amount_paid=?, due_amount=?, due_status=?, version=version+1, updated_at=? WHERE id=?",
      newAmountPaid,
      newDueAmount,
      newDueStatus,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_payment_logs(id,order_id,amount,type,note,actor,payment_date,created_at) VALUES(?,?,?,?,?,?,?,?)",
      uid(),
      o.id,
      cleanAmount,
      newDueAmount === 0 ? "FULL_PAYMENT" : "DUE_COLLECTION",
      cleanNote ||
        (newDueAmount === 0
          ? "Remaining balance cleared"
          : "Partial due collection"),
      u.email,
      at,
      at,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at,internal) VALUES(?,?,?,?,?,?,1)",
      uid(),
      o.id,
      o.status,
      `Due Payment Collected: ${money(cleanAmount)}. Remaining Due: ${money(newDueAmount)}.${cleanNote ? ` Note: ${cleanNote}` : ""}`,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "DUE_PAYMENT_COLLECTED",
      o.id,
      { amount_paid: currentPaid, due_amount: o.due_amount },
      {
        amount_paid: newAmountPaid,
        due_amount: newDueAmount,
        collected: cleanAmount,
        note: cleanNote,
      },
      req,
    ),
  ];

  await batch(statements);
  return {
    ok: true,
    amount_paid: newAmountPaid,
    due_amount: newDueAmount,
    due_status: newDueStatus,
  };
}

export async function updateDueNote(
  req: Request,
  u: User,
  orderId: string,
  dueNote: string,
) {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can update due notes.");
  }
  const o = await getOrder(req, orderId, u);
  const cleanNote = (dueNote || "").trim();
  const at = now();
  await batch([
    stmt(
      "UPDATE orders SET due_note=?, updated_at=? WHERE id=?",
      cleanNote,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at,internal) VALUES(?,?,?,?,?,?,1)",
      uid(),
      o.id,
      o.status,
      `Updated Due Note: ${cleanNote || "(empty)"}`,
      u.email,
      at,
    ),
  ]);
  return { ok: true, due_note: cleanNote };
}
export async function changeStatus(
  req: Request,
  u: User,
  id: string,
  status: string,
  note: string,
  version: number,
) {
  const o = await getOrder(req, id, u);
  if (!transitions[o.status]?.includes(status))
    throw new AppError(409, "This order status transition is not allowed.");
  if (
    u.role !== "SUPER_ADMIN" &&
    !["PROCESSING", "SHIPPED", "DELIVERED"].includes(status)
  )
    throw new AppError(403, "Only Super Admin can cancel or handle refunds.");
  if (["SHIPPED", "DELIVERED"].includes(status) && isOtherCityOrder(o)) {
    if (!o.courier_tracking_id || !o.courier_tracking_id.trim()) {
      throw new AppError(400, "Please Add Tracking Details");
    }
  }
  const statements = [
    guard(
      "EXISTS(SELECT 1 FROM orders WHERE id=? AND version=?)",
      o.id,
      version,
    ),
  ];
  let state = o.inventory_state;
  if (status === "CANCELLED" && state !== "RELEASED") {
    statements.push(
      ...movementStatements(
        o,
        o.items,
        state === "RESERVED" ? "RELEASE" : "RESTOCK",
        u.email,
      ),
    );
    state = "RELEASED";
  }
  const at = now();
  let newVendorPrintedAt = o.vendor_printed_at;
  let newVendorDispatchedAt = o.vendor_dispatched_at;
  if (["SHIPPED", "DELIVERED"].includes(status)) {
    if (!newVendorPrintedAt) newVendorPrintedAt = at;
    if (!isOtherCityOrder(o) && !newVendorDispatchedAt) newVendorDispatchedAt = at;
  }
  statements.push(
    stmt(
      "UPDATE orders SET status=?,inventory_state=?,vendor_printed_at=?,vendor_dispatched_at=?,updated_at=?,version=version+1 WHERE id=?",
      status,
      state,
      newVendorPrintedAt,
      newVendorDispatchedAt,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
      uid(),
      o.id,
      status,
      note,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "ORDER_STATUS",
      o.id,
      { status: o.status, vendor_printed_at: o.vendor_printed_at, vendor_dispatched_at: o.vendor_dispatched_at },
      { status, note, vendor_printed_at: newVendorPrintedAt, vendor_dispatched_at: newVendorDispatchedAt },
      req,
    ),
  );
  await batch(statements);
  return { status };
}

export async function setCourierTracking(
  req: Request,
  u: User,
  id: string,
  courierName: string,
  trackingId: string,
  targetStatus?: string,
  actualCourierCharges?: number,
) {
  const o = await getOrder(req, id, u);
  const cName = courierName.trim();
  const tId = trackingId.trim();
  if (!cName || !tId) {
    throw new AppError(400, "Courier company name and tracking number are required.");
  }
  const isCampus =
    o.delivery_type === "campus" ||
    (o.city && o.city.toLowerCase().includes("campus")) ||
    (o.address && o.address.toLowerCase().includes("campus"));
  const isLahore =
    !isCampus &&
    (o.delivery_type === "lahore" ||
      o.delivery_type === "lahore_home" ||
      (o.city && o.city.toLowerCase().includes("lahore")));
  if (isCampus || isLahore) {
    throw new AppError(400, "Courier tracking details are only for Other City orders.");
  }

  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update courier tracking for orders assigned to you.");
  }

  const isPaymentVerified =
    o.payment_status === "VERIFIED" && o.status !== "PAYMENT_PENDING";
  if (!isPaymentVerified) {
    throw new AppError(
      400,
      "Payment verification is pending. Please verify and approve payment before adding courier tracking details.",
    );
  }

  const at = now();
  const nextStatus =
    targetStatus === "DELIVERED" || o.status === "DELIVERED"
      ? "DELIVERED"
      : "SHIPPED";
  const note =
    nextStatus === "DELIVERED"
      ? `Delivered via ${cName} - Tracking #: ${tId}`
      : `Shipped via ${cName} - Tracking #: ${tId}`;

  const newVendorPrintedAt = o.vendor_printed_at || at;
  const finalActualCharges =
    actualCourierCharges !== undefined
      ? Math.max(0, Number(actualCourierCharges) || 0)
      : Math.max(0, Number(o.actual_courier_charges) || 0);

  const statements = [
    stmt(
      "UPDATE orders SET courier_name=?,courier_tracking_id=?,actual_courier_charges=?,status=?,vendor_printed_at=?,updated_at=?,version=version+1 WHERE id=?",
      cName,
      tId,
      finalActualCharges,
      nextStatus,
      newVendorPrintedAt,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
      uid(),
      o.id,
      nextStatus,
      note,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "SET_COURIER_TRACKING",
      o.id,
      {
        courier_name: o.courier_name,
        courier_tracking_id: o.courier_tracking_id,
        actual_courier_charges: o.actual_courier_charges,
      },
      {
        courier_name: cName,
        courier_tracking_id: tId,
        actual_courier_charges: finalActualCharges,
      },
      req,
    ),
  ];
  await batch(statements);
  return {
    ok: true,
    courier_name: cName,
    courier_tracking_id: tId,
    actual_courier_charges: finalActualCharges,
    status: nextStatus,
  };
}

export async function removeCourierTracking(
  req: Request,
  u: User,
  id: string,
) {
  const o = await getOrder(req, id, u);
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only remove courier tracking for orders assigned to you.");
  }
  const at = now();
  const nextStatus = o.status === "SHIPPED" ? "PROCESSING" : o.status;
  const note = "Courier tracking details removed (order returned to Printing)";

  const statements = [
    stmt(
      "UPDATE orders SET courier_name=NULL,courier_tracking_id=NULL,actual_courier_charges=0,status=?,updated_at=?,version=version+1 WHERE id=?",
      nextStatus,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
      uid(),
      o.id,
      nextStatus,
      note,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "REMOVE_COURIER_TRACKING",
      o.id,
      {
        courier_name: o.courier_name,
        courier_tracking_id: o.courier_tracking_id,
        status: o.status,
        actual_courier_charges: o.actual_courier_charges,
      },
      {
        courier_name: null,
        courier_tracking_id: null,
        actual_courier_charges: 0,
        status: nextStatus,
      },
      req,
    ),
  ];
  await batch(statements);
  return { ok: true, removed: true, status: nextStatus };
}

export async function updateActualCourierCharges(
  req: Request,
  u: User,
  id: string,
  charges: number,
) {
  const o = await getOrder(req, id, u);
  if (u.role !== "SUPER_ADMIN" && u.role !== "VENDOR") {
    throw new AppError(403, "Only Super Admin and Vendors can update delivery charges.");
  }
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update courier charges for orders assigned to you.");
  }
  const isCampus =
    o.delivery_type === "campus" ||
    (o.city && o.city.toLowerCase().includes("campus")) ||
    (o.address && o.address.toLowerCase().includes("campus"));
  const isLahore =
    !isCampus &&
    (o.delivery_type === "lahore" ||
      o.delivery_type === "lahore_home" ||
      (o.city && o.city.toLowerCase().includes("lahore")));
  if (isCampus || isLahore) {
    throw new AppError(400, "Courier delivery charges are only for Other City orders.");
  }

  const validCharges = Math.max(0, Number(charges) || 0);
  const at = now();
  const statements = [
    stmt(
      "UPDATE orders SET actual_courier_charges=?,updated_at=?,version=version+1 WHERE id=?",
      validCharges,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,1,?)",
      uid(),
      o.id,
      o.status,
      `Actual courier delivery charges updated: Rs. ${validCharges}`,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "UPDATE_ACTUAL_COURIER_CHARGES",
      o.id,
      { actual_courier_charges: o.actual_courier_charges },
      { actual_courier_charges: validCharges },
      req,
    ),
  ];
  await batch(statements);
  return { ok: true, actual_courier_charges: validCharges };
}

export async function editOrderItems(
  req: Request,
  u: User,
  id: string,
  itemsPayload: Array<{ id: string; quantity: number }>,
  note = "",
) {
  if (u.role !== "SUPER_ADMIN" && !u.permissions?.includes("orders.update")) {
    throw new AppError(403, "You do not have permission to edit orders.");
  }

  const o = await one<any>("SELECT * FROM orders WHERE id=?", id);
  if (!o) throw new AppError(404, "Order not found.");

  if (["SHIPPED", "DELIVERED", "CANCELLED", "REJECTED", "REFUND_REQUESTED"].includes(o.status)) {
    throw new AppError(400, `Cannot edit items for order in ${statuses[o.status] || o.status} status.`);
  }

  if (o.vendor_printed_at) {
    throw new AppError(
      400,
      "This order has already been marked as printed by the vendor and cannot be modified.",
    );
  }

  if (!Array.isArray(itemsPayload) || itemsPayload.length === 0) {
    throw new AppError(400, "Order must retain at least one book.");
  }

  const currentItems = await all<any>("SELECT * FROM order_items WHERE order_id=?", id);
  if (!currentItems.length) throw new AppError(400, "Order has no existing items.");

  const currentItemMap = new Map<string, any>(currentItems.map((it: any) => [it.id, it]));

  for (const p of itemsPayload) {
    if (!currentItemMap.has(p.id)) {
      throw new AppError(400, `Item with ID ${p.id} does not belong to this order.`);
    }
    if (!Number.isInteger(p.quantity) || p.quantity < 1 || p.quantity > 500) {
      throw new AppError(400, "Each book quantity must be an integer between 1 and 500.");
    }
  }

  const keptItemIds = new Set(itemsPayload.map((p) => p.id));
  const removedItems = currentItems.filter((it: any) => !keptItemIds.has(it.id));
  const changedItems: Array<{ code: string; title: string; oldQty: number; newQty: number }> = [];

  for (const p of itemsPayload) {
    const orig = currentItemMap.get(p.id);
    if (orig && orig.quantity !== p.quantity) {
      changedItems.push({ code: orig.code, title: orig.title, oldQty: orig.quantity, newQty: p.quantity });
    }
  }

  if (removedItems.length === 0 && changedItems.length === 0) {
    return {
      ok: true,
      subtotal: o.subtotal,
      total: o.total,
      message: "No changes made to order items.",
    };
  }

  let newSubtotal = 0;
  for (const p of itemsPayload) {
    const orig = currentItemMap.get(p.id);
    newSubtotal += Number(orig.unit_price) * p.quantity;
  }
  const newTotal = newSubtotal + Number(o.delivery);

  const changeParts: string[] = [];
  if (changedItems.length > 0) {
    changeParts.push(
      "Qty: " +
        changedItems.map((c) => `${c.code} (${c.oldQty} → ${c.newQty})`).join(", "),
    );
  }
  if (removedItems.length > 0) {
    changeParts.push(
      "Excluded: " + removedItems.map((r: any) => r.code).join(", "),
    );
  }

  const noteText = `Admin adjusted items (${changeParts.join("; ")}). Total: Rs. ${Number(o.total).toLocaleString()} → Rs. ${Number(newTotal).toLocaleString()}.${note ? ` Note: ${note}` : ""}`;
  const at = now();

  const statements: any[] = [
    guard("EXISTS(SELECT 1 FROM orders WHERE id=? AND version=?)", o.id, o.version),
  ];

  for (const r of removedItems) {
    statements.push(stmt("DELETE FROM order_items WHERE id=? AND order_id=?", r.id, o.id));
  }

  for (const p of itemsPayload) {
    statements.push(
      stmt(
        "UPDATE order_items SET quantity=? WHERE id=? AND order_id=?",
        p.quantity,
        p.id,
        o.id,
      ),
    );
  }

  const newAmountPaid = Number(o.amount_paid || 0);
  const newDueAmount = newAmountPaid > 0 ? Math.max(0, newTotal - newAmountPaid) : 0;
  const newDueStatus = newAmountPaid > 0 ? (newDueAmount > 0 ? "DUE_PENDING" : "PAID") : (o.due_status || "NONE");

  // Refund calculation when student overpaid advance:
  const excessPaid = Math.max(0, newAmountPaid - newTotal);
  const existingRefundPaid = Number(o.refund_amount || 0);
  const newRefundDue = Math.max(0, excessPaid - existingRefundPaid);
  const newRefundStatus = excessPaid > 0 ? (newRefundDue === 0 ? "REFUNDED" : "REFUND_PENDING") : (o.refund_status || "NONE");

  statements.push(
    stmt(
      "UPDATE orders SET subtotal=?, total=?, amount_paid=?, due_amount=?, due_status=?, refund_due=?, refund_status=?, version=version+1, updated_at=? WHERE id=?",
      newSubtotal,
      newTotal,
      newAmountPaid,
      newDueAmount,
      newDueStatus,
      newRefundDue,
      newRefundStatus,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
      uid(),
      o.id,
      o.status,
      noteText,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "ORDER_ITEMS_EDITED",
      o.id,
      {
        subtotal: o.subtotal,
        total: o.total,
        items_count: currentItems.length,
        items: currentItems.map((it: any) => ({ code: it.code, qty: it.quantity, unit_price: it.unit_price })),
      },
      {
        subtotal: newSubtotal,
        total: newTotal,
        items_count: itemsPayload.length,
        items: itemsPayload.map((p) => {
          const orig = currentItemMap.get(p.id);
          return { code: orig.code, qty: p.quantity, unit_price: orig.unit_price };
        }),
        removed: removedItems.map((r: any) => r.code),
        note,
      },
      req,
    ),
  );

  await batch(statements);

  return {
    ok: true,
    subtotal: newSubtotal,
    total: newTotal,
    count: itemsPayload.length,
    refund_due: newRefundDue,
    refund_status: newRefundStatus,
    message: `Order updated successfully (${changeParts.join("; ")}). Total is now Rs. ${Number(newTotal).toLocaleString()}.`,
  };
}

export async function vendorPrint(
  req: Request,
  u: User,
  id: string,
  printed = true,
) {
  if (u.role !== "VENDOR" && u.role !== "SUPER_ADMIN" && !u.permissions?.includes("orders.update")) {
    throw new AppError(403, "Permission denied to update print status.");
  }
  const o = await getOrder(req, id, u);
  if (["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status)) {
    throw new AppError(400, "Cannot update print status for order in " + (statuses[o.status] || o.status) + " status.");
  }
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update print status for your assigned orders.");
  }
  const isPrinted = printed !== false;
  const printTime = isPrinted ? now() : null;
  const statements = [
    stmt("UPDATE orders SET vendor_printed_at=?, version=version+1 WHERE id=?", printTime, o.id),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
      uid(),
      o.id,
      o.status,
      isPrinted
        ? (u.role === "VENDOR" ? "Marked books as printed by vendor" : "Marked books as printed by admin")
        : "Unmarked printed status",
      u.email,
      now(),
    ),
    auditStmt(
      u.email,
      "VENDOR_PRINT_MARK",
      o.id,
      { vendor_printed_at: o.vendor_printed_at },
      { vendor_printed_at: printTime },
      req,
    ),
  ];
  if (isPrinted) {
    statements.push(stmt("UPDATE order_items SET received_from_vendor=1 WHERE order_id=?", o.id));
  }
  await batch(statements);
  return { ok: true, vendor_printed_at: printTime };
}

export async function vendorDispatchOffice(
  req: Request,
  u: User,
  id: string,
  note = "",
) {
  const o = await getOrder(req, id, u);
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only dispatch your assigned orders.");
  }
  if (isOtherCityOrder(o)) {
    throw new AppError(400, "Other city orders must be dispatched via courier with tracking.");
  }
  const at = now();
  const newVendorPrintedAt = o.vendor_printed_at || at;
  await batch([
    stmt(
      "UPDATE orders SET status='SHIPPED', vendor_printed_at=?, vendor_dispatched_at=?, updated_at=?, version=version+1 WHERE id=?",
      newVendorPrintedAt,
      at,
      at,
      o.id,
    ),
    stmt(
      "UPDATE order_items SET received_from_vendor=1 WHERE order_id=?",
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
      uid(),
      o.id,
      "SHIPPED",
      note?.trim()
        ? `Sent to Campus by vendor: ${note.trim()}`
        : "Sent to Campus by vendor (All books received in Campus by default)",
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "VENDOR_DISPATCH_OFFICE",
      o.id,
      { status: o.status, vendor_dispatched_at: o.vendor_dispatched_at },
      { status: "SHIPPED", vendor_dispatched_at: at },
      req,
    ),
  ]);
  return { ok: true, status: "SHIPPED", vendor_dispatched_at: at };
}

export async function batchVendorPrint(
  req: Request,
  u: User,
  paramsOrIds:
    | string[]
    | {
        orderIds?: string[];
        allInQueue?: boolean;
        printed?: boolean;
        deliveryType?: string;
        campusId?: string;
        q?: string;
      },
  legacyPrinted = true,
) {
  if (u.role !== "VENDOR" && u.role !== "SUPER_ADMIN" && !u.permissions?.includes("orders.update")) {
    throw new AppError(403, "Permission denied for batch print marking.");
  }
  const isParamsObj = !Array.isArray(paramsOrIds) && typeof paramsOrIds === "object";
  const printed = isParamsObj ? paramsOrIds.printed !== false : legacyPrinted !== false;
  const orderIds = isParamsObj ? paramsOrIds.orderIds : paramsOrIds;
  const allInQueue = isParamsObj ? !!paramsOrIds.allInQueue : false;

  const isPrinted = printed !== false;
  const printTime = isPrinted ? now() : null;
  const s = scope(u);

  let ordersToUpdate: any[] = [];

  if (orderIds && orderIds.length > 0) {
    const placeholders = orderIds.map(() => "?").join(",");
    ordersToUpdate = await all<any>(
      `SELECT o.id, o.status, o.vendor_id, o.vendor_printed_at FROM orders o WHERE o.id IN (${placeholders}) AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED') AND ${s.sql}`,
      ...orderIds,
      ...s.args,
    );
  } else if (allInQueue) {
    const filters = [s.sql, "o.status = 'PROCESSING'"];
    const args: unknown[] = [...s.args];

    if (isPrinted) {
      filters.push("o.vendor_printed_at IS NULL");
    } else {
      filters.push("o.vendor_printed_at IS NOT NULL");
    }

    if (isParamsObj && paramsOrIds.deliveryType && paramsOrIds.deliveryType !== "all") {
      const types = paramsOrIds.deliveryType
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t && t !== "all");
      if (types.length === 1) {
        filters.push("o.delivery_type=?");
        args.push(types[0]);
      } else if (types.length > 1) {
        const placeholders = types.map(() => "?").join(",");
        filters.push(`o.delivery_type IN (${placeholders})`);
        args.push(...types);
      }
    }
    if (isParamsObj && paramsOrIds.campusId) {
      filters.push("o.campus_id=?");
      args.push(paramsOrIds.campusId);
    }
    if (isParamsObj && paramsOrIds.q) {
      filters.push("(o.reference LIKE ? OR o.name LIKE ? OR o.phone LIKE ?)");
      args.push(...Array(3).fill("%" + paramsOrIds.q.slice(0, 100) + "%"));
    }

    ordersToUpdate = await all<any>(
      `SELECT o.id, o.status, o.vendor_id, o.vendor_printed_at FROM orders o WHERE ${filters.join(" AND ")}`,
      ...args,
    );
  } else {
    throw new AppError(400, "Please select at least one order or choose all in queue.");
  }

  if (!ordersToUpdate.length) {
    return {
      ok: true,
      count: 0,
      vendor_printed_at: printTime,
      message: isPrinted
        ? "All matching orders are already marked as printed."
        : "No printed orders found to unmark.",
    };
  }

  const statements: any[] = [];
  for (const o of ordersToUpdate) {
    if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
      continue;
    }
    if (isPrinted) {
      statements.push(stmt("UPDATE order_items SET received_from_vendor=1 WHERE order_id=?", o.id));
    }
    statements.push(
      stmt("UPDATE orders SET vendor_printed_at=?, version=version+1 WHERE id=?", printTime, o.id),
      stmt(
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        o.status,
        isPrinted ? "Marked books as printed by vendor (batch)" : "Unmarked printed status (batch)",
        u.email,
        now(),
      ),
      auditStmt(u.email, "VENDOR_PRINT_MARK", o.id, { vendor_printed_at: o.vendor_printed_at }, { vendor_printed_at: printTime }, req),
    );
  }
  if (statements.length > 0) {
    await batch(statements);
  }
  return { ok: true, count: ordersToUpdate.length, vendor_printed_at: printTime };
}

export async function batchVendorDispatchOffice(
  req: Request,
  u: User,
  paramsOrIds:
    | string[]
    | {
        orderIds?: string[];
        allEligible?: boolean;
        note?: string;
      },
  legacyNote = "",
) {
  const isObj = !Array.isArray(paramsOrIds) && typeof paramsOrIds === "object";
  const orderIds = isObj ? paramsOrIds.orderIds : paramsOrIds;
  const allEligible = isObj ? Boolean(paramsOrIds.allEligible) : false;
  const note = isObj ? paramsOrIds.note || "" : legacyNote;

  if ((!orderIds || !orderIds.length) && !allEligible) {
    throw new AppError(400, "Please select at least one order or choose all eligible.");
  }
  const s = scope(u);
  let ordersToUpdate: any[] = [];
  if (orderIds && orderIds.length > 0) {
    const placeholders = orderIds.map(() => "?").join(",");
    ordersToUpdate = await all<any>(
      `SELECT o.id, o.status, o.vendor_id, o.vendor_printed_at, o.vendor_dispatched_at, o.delivery_type, o.city, o.address FROM orders o WHERE o.id IN (${placeholders}) AND ${s.sql}`,
      ...orderIds,
      ...s.args,
    );
  } else if (allEligible) {
    ordersToUpdate = await all<any>(
      `SELECT o.id, o.status, o.vendor_id, o.vendor_printed_at, o.vendor_dispatched_at, o.delivery_type, o.city, o.address FROM orders o WHERE ${s.sql} AND o.status='PROCESSING' AND o.vendor_dispatched_at IS NULL`,
      ...s.args,
    );
  }
  if (!ordersToUpdate.length) {
    throw new AppError(404, "No eligible orders found.");
  }
  const eligible = ordersToUpdate.filter((o) => {
    if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) return false;
    if (isOtherCityOrder(o)) return false;
    return o.status === "PROCESSING";
  });
  if (!eligible.length) {
    throw new AppError(400, "None of the selected orders are eligible for office dispatch (must be Lahore / Campus in Printing).");
  }
  const at = now();
  const statements: any[] = [];
  for (const o of eligible) {
    const newVendorPrintedAt = o.vendor_printed_at || at;
    statements.push(
      stmt(
        "UPDATE orders SET status='SHIPPED', vendor_printed_at=?, vendor_dispatched_at=?, updated_at=?, version=version+1 WHERE id=?",
        newVendorPrintedAt,
        at,
        at,
        o.id,
      ),
      stmt(
        "UPDATE order_items SET received_from_vendor=1 WHERE order_id=?",
        o.id,
      ),
      stmt(
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        "SHIPPED",
        note?.trim()
          ? `Sent to Campus by vendor (batch): ${note.trim()}`
          : "Sent to Campus by vendor (batch - All books received in Campus by default)",
        u.email,
        at,
      ),
      auditStmt(
        u.email,
        "VENDOR_DISPATCH_OFFICE",
        o.id,
        { status: o.status, vendor_dispatched_at: o.vendor_dispatched_at },
        { status: "SHIPPED", vendor_dispatched_at: at, destination: "Bookstore Office" },
        req,
      ),
    );
  }
  await batch(statements);
  return { ok: true, count: eligible.length, status: "SHIPPED", vendor_dispatched_at: at };
}

export async function setPrintingQueue(
  req: Request,
  u: User,
  id: string,
  inQueue: boolean,
  reason = "",
) {
  const o = await getOrder(req, id, u);
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update the printing queue for your assigned orders.");
  }
  const at = now();
  if (inQueue) {
    if (!["CONFIRMED", "PROCESSING"].includes(o.status)) {
      throw new AppError(400, "Only confirmed orders can be added to the Printing Queue.");
    }
    if (o.status === "PROCESSING" && !o.vendor_printed_at) {
      return { ok: true, status: "PROCESSING", in_queue: true, vendor_printed_at: null };
    }
    await batch([
      stmt(
        "UPDATE orders SET status='PROCESSING', vendor_printed_at=NULL, updated_at=?, version=version+1 WHERE id=?",
        at,
        o.id,
      ),
      stmt(
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        "PROCESSING",
        "Added to Printing Queue.",
        u.email,
        at,
      ),
      auditStmt(u.email, "ORDER_PRINT_QUEUE_ADD", o.id, { status: o.status }, { status: "PROCESSING" }, req),
    ]);
    return { ok: true, status: "PROCESSING", in_queue: true, vendor_printed_at: null };
  } else {
    // Remove from Printing Queue -> Reverts to CONFIRMED and unassigns vendor
    if (o.status !== "PROCESSING") {
      throw new AppError(400, "Only orders currently in printing can be removed from the Printing Queue.");
    }

    const cleanReason = (reason || "").trim();
    if (u.role === "VENDOR" && (!cleanReason || cleanReason.length < 3)) {
      throw new AppError(400, "Please provide a valid reason for removing this order from printing.");
    }

    let vendorName = "Vendor";
    if (o.vendor_id) {
      const v = await one<any>("SELECT name FROM vendors WHERE id=?", o.vendor_id);
      if (v?.name) vendorName = v.name;
    } else if (u.name) {
      vendorName = u.name;
    }

    const historyNote = cleanReason
      ? `Order removed from Printing Queue and unassigned by ${vendorName}. Reason: ${cleanReason}`
      : `Order removed from Printing Queue and unassigned by ${vendorName}. Reverted to Confirmed status.`;

    await batch([
      stmt(
        "UPDATE orders SET status='CONFIRMED', vendor_id=NULL, vendor_printed_at=NULL, vendor_dispatched_at=NULL, updated_at=?, version=version+1 WHERE id=?",
        at,
        o.id,
      ),
      stmt(
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        "CONFIRMED",
        historyNote,
        u.email,
        at,
      ),
      auditStmt(
        u.email,
        "ORDER_PRINT_QUEUE_REMOVE",
        o.id,
        { status: o.status, vendor_id: o.vendor_id },
        { status: "CONFIRMED", vendor_id: null, reason: cleanReason },
        req,
      ),
    ]);
    return {
      ok: true,
      status: "CONFIRMED",
      in_queue: false,
      vendor_id: null,
      vendor_printed_at: null,
      message: "Order removed from printing queue and unassigned successfully ✓",
    };
  }
}

export async function batchSetPrintingQueue(
  req: Request,
  u: User,
  orderIds: string[],
  inQueue: boolean,
  reason = "",
) {
  const cleanReason = (reason || "").trim();
  if (!inQueue && u.role === "VENDOR" && (!cleanReason || cleanReason.length < 3)) {
    throw new AppError(400, "Please provide a valid reason for removing orders from printing.");
  }
  if (!orderIds || !orderIds.length) {
    throw new AppError(400, "Please select at least one order.");
  }
  const s = scope(u);
  const placeholders = orderIds.map(() => "?").join(",");
  const orders = await all<any>(
    `SELECT o.id, o.status, o.vendor_id, o.vendor_printed_at FROM orders o WHERE o.id IN (${placeholders}) AND ${s.sql}`,
    ...orderIds,
    ...s.args,
  );
  if (!orders.length) {
    throw new AppError(404, "No eligible orders found.");
  }
  const targetStatus = inQueue ? "PROCESSING" : "CONFIRMED";
  const eligible = orders.filter((o) => {
    if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) return false;
    if (inQueue) {
      return ["CONFIRMED", "PROCESSING"].includes(o.status);
    } else {
      return o.status === "PROCESSING";
    }
  });
  if (!eligible.length) {
    throw new AppError(
      400,
      inQueue
        ? "None of the selected orders can be added to the Printing Queue."
        : "None of the selected orders can be removed from the Printing Queue.",
    );
  }
  const at = now();
  const statements: any[] = [];
  for (const o of eligible) {
    statements.push(
      stmt(
        inQueue
          ? "UPDATE orders SET status=?, vendor_printed_at=NULL, vendor_dispatched_at=NULL, updated_at=?, version=version+1 WHERE id=?"
          : "UPDATE orders SET status=?, vendor_id=NULL, vendor_printed_at=NULL, vendor_dispatched_at=NULL, updated_at=?, version=version+1 WHERE id=?",
        targetStatus,
        at,
        o.id,
      ),
      stmt(
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        targetStatus,
        inQueue
          ? "Added to Printing Queue (batch)."
          : cleanReason
            ? `Removed from Printing Queue and unassigned (batch). Reason: ${cleanReason}`
            : "Removed from Printing Queue and unassigned (batch). Reverted to Confirmed status.",
        u.email,
        at,
      ),
      auditStmt(
        u.email,
        inQueue ? "BATCH_PRINT_QUEUE_ADD" : "BATCH_PRINT_QUEUE_REMOVE",
        o.id,
        { status: o.status },
        { status: targetStatus },
        req,
      ),
    );
  }
  await batch(statements);
  return {
    ok: true,
    count: eligible.length,
    status: targetStatus,
    in_queue: inQueue,
    message: inQueue
      ? `Added ${eligible.length} order(s) to the Printing Queue.`
      : `Removed ${eligible.length} order(s) from the Printing Queue (reverted to Confirmed).`,
  };
}

export async function batchChangeStatus(
  req: Request,
  u: User,
  params: {
    fromStatus: string;
    toStatus: string;
    orderIds?: string[];
    q?: string;
    deliveryType?: string;
    from?: string;
    to?: string;
    campusId?: string;
    printed?: string;
  },
) {
  const { fromStatus, toStatus } = params;
  const validTransitions: Record<string, string> = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };

  if (!fromStatus || validTransitions[fromStatus] !== toStatus) {
    throw new AppError(
      400,
      `Invalid status transition from "${fromStatus}" to "${toStatus}".`,
    );
  }

  if (
    u.role !== "SUPER_ADMIN" &&
    !["PROCESSING", "SHIPPED", "DELIVERED"].includes(toStatus)
  ) {
    throw new AppError(403, "Only authorized staff can update order statuses.");
  }

  const s = scope(u);
  const filters = [s.sql, "o.status=?"];
  const args: unknown[] = [...s.args, fromStatus];

  if (params.orderIds && params.orderIds.length > 0) {
    const placeholders = params.orderIds.map(() => "?").join(",");
    filters.push(`o.id IN (${placeholders})`);
    args.push(...params.orderIds);
  } else {
    if (params.campusId) {
      filters.push("o.campus_id=?");
      args.push(params.campusId);
    }
    if (params.q) {
      filters.push("(o.reference LIKE ? OR o.name LIKE ? OR o.phone LIKE ?)");
      args.push(...Array(3).fill("%" + params.q.slice(0, 100) + "%"));
    }
    if (params.printed === "1" || params.printed === "printed") {
      filters.push("o.vendor_printed_at IS NOT NULL");
    } else if (params.printed === "0" || params.printed === "unprinted") {
      filters.push("o.vendor_printed_at IS NULL");
    }
    if (params.deliveryType && params.deliveryType !== "all") {
      const types = params.deliveryType
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t && t !== "all");
      if (types.length === 1) {
        filters.push("o.delivery_type=?");
        args.push(types[0]);
      } else if (types.length > 1) {
        const placeholders = types.map(() => "?").join(",");
        filters.push(`o.delivery_type IN (${placeholders})`);
        args.push(...types);
      }
    }
    if (params.from) {
      filters.push("o.created_at>=?");
      args.push(params.from);
    }
    if (params.to) {
      filters.push("o.created_at<?");
      args.push(params.to + "T23:59:59.999Z");
    }
  }

  const where = filters.join(" AND ");
  const orders = await all<{
    id: string;
    status: string;
    version: number;
    reference: string;
    delivery_type: string;
    city: string;
    address: string;
    courier_tracking_id: string | null;
    vendor_printed_at: string | null;
    vendor_dispatched_at: string | null;
  }>(
    `SELECT o.id, o.status, o.version, o.reference, o.delivery_type, o.city, o.address, o.courier_tracking_id, o.vendor_printed_at, o.vendor_dispatched_at FROM orders o WHERE ${where} LIMIT 1000`,
    ...args,
  );

  if (!orders.length) {
    return { count: 0, status: toStatus };
  }

  if (["SHIPPED", "DELIVERED"].includes(toStatus)) {
    const invalidOtherCity = orders.find(
      (ord) =>
        isOtherCityOrder(ord) &&
        (!ord.courier_tracking_id || !ord.courier_tracking_id.trim()),
    );
    if (invalidOtherCity) {
      throw new AppError(400, "Please Add Tracking Details");
    }
  }

  const at = now();
  const chunkSize = 25;
  for (let i = 0; i < orders.length; i += chunkSize) {
    const chunk = orders.slice(i, i + chunkSize);
    const statements = [];
    for (const ord of chunk) {
      let newVendorPrintedAt = ord.vendor_printed_at;
      let newVendorDispatchedAt = ord.vendor_dispatched_at;
      if (["SHIPPED", "DELIVERED"].includes(toStatus)) {
        if (!newVendorPrintedAt) newVendorPrintedAt = at;
        if (!isOtherCityOrder(ord) && !newVendorDispatchedAt) newVendorDispatchedAt = at;
      }

      statements.push(
        stmt(
          "UPDATE orders SET status=?,vendor_printed_at=?,vendor_dispatched_at=?,updated_at=?,version=version+1 WHERE id=? AND status=?",
          toStatus,
          newVendorPrintedAt,
          newVendorDispatchedAt,
          at,
          ord.id,
          fromStatus,
        ),
        stmt(
          "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
          uid(),
          ord.id,
          toStatus,
          `Bulk status update to ${statuses[toStatus] || toStatus}`,
          u.email,
          at,
        ),
      );
    }
    await batch(statements);
  }

  await batch([
    auditStmt(
      u.email,
      "BATCH_ORDER_STATUS",
      `${fromStatus}_TO_${toStatus}`,
      { fromStatus, count: orders.length },
      { toStatus, orderCount: orders.length },
      req,
    ),
  ]);

  return { count: orders.length, status: toStatus };
}


export async function toggleOrderItemReceived(
  req: Request,
  u: User,
  orderId: string,
  itemId: string,
  received: boolean,
) {
  if (u.role !== "SUPER_ADMIN" && u.role !== "VENDOR" && !u.permissions?.includes("orders.update")) {
    throw new AppError(403, "Permission denied to update book delivery status.");
  }
  const o = await getOrder(req, orderId, u);
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update books for your assigned orders.");
  }
  const it = await one<any>("SELECT * FROM order_items WHERE id=? AND order_id=?", itemId, orderId);
  if (!it) throw new AppError(404, "Order item not found.");

  const recVal = received ? 1 : 0;
  const at = now();
  const statements: any[] = [
    stmt("UPDATE order_items SET received_from_vendor=? WHERE id=? AND order_id=?", recVal, itemId, orderId),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,1,?)",
      uid(),
      orderId,
      o.status,
      received
        ? `Book marked received from vendor: ${it.code} (${it.title})`
        : `Book marked pending from vendor: ${it.code} (${it.title})`,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "ORDER_ITEM_RECEIVED_TOGGLE",
      itemId,
      { received_from_vendor: it.received_from_vendor },
      { received_from_vendor: recVal, order_id: orderId, code: it.code },
      req,
    ),
  ];

  await batch(statements);
  return { ok: true, itemId, received_from_vendor: recVal };
}

export async function setAllOrderItemsReceived(
  req: Request,
  u: User,
  orderId: string,
  received: boolean,
) {
  if (u.role !== "SUPER_ADMIN" && u.role !== "VENDOR" && !u.permissions?.includes("orders.update")) {
    throw new AppError(403, "Permission denied to update book delivery status.");
  }
  const o = await getOrder(req, orderId, u);
  if (u.role === "VENDOR" && o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update books for your assigned orders.");
  }
  const recVal = received ? 1 : 0;
  const at = now();
  const statements: any[] = [
    stmt("UPDATE order_items SET received_from_vendor=? WHERE order_id=?", recVal, orderId),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,1,?)",
      uid(),
      orderId,
      o.status,
      received ? "All books marked received from vendor" : "All books marked pending from vendor",
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "ORDER_ALL_ITEMS_RECEIVED",
      orderId,
      null,
      { received_from_vendor: recVal },
      req,
    ),
  ];
  await batch(statements);
  return { ok: true, received_from_vendor: recVal };
}

export async function recordStudentRefund(
  req: Request,
  u: User,
  orderId: string,
  amount: number,
  method = "JazzCash",
  reference = "",
  note = "",
) {
  if (u.role !== "SUPER_ADMIN" && !u.permissions?.includes("orders.update")) {
    throw new AppError(403, "Only Super Admin can record student refunds.");
  }
  const cleanAmount = Math.round(Number(amount));
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    throw new AppError(400, "Refund amount must be greater than 0.");
  }

  const o = await getOrder(req, orderId, u);
  if (!o) throw new AppError(404, "Order not found.");

  const currentRefundDue = Number(o.refund_due || 0);
  const currentRefundAmount = Number(o.refund_amount || 0);
  const currentPaid = Number(o.amount_paid || 0);

  const at = now();
  const cleanMethod = (method || "JazzCash").trim();
  const cleanRef = (reference || "").trim();
  const cleanNote = (note || "").trim();

  const newRefundAmount = currentRefundAmount + cleanAmount;
  const newRefundDue = Math.max(0, currentRefundDue - cleanAmount);
  const newRefundStatus = newRefundDue === 0 ? "REFUNDED" : "REFUND_PENDING";
  const newAmountPaid = Math.max(Number(o.total || 0), currentPaid - cleanAmount);

  const refDetails = cleanRef ? ` (Ref: ${cleanRef})` : "";
  const noteDetails = cleanNote ? ` Note: ${cleanNote}` : "";
  const combinedRefundNote = [cleanMethod, cleanRef ? `Ref: ${cleanRef}` : "", cleanNote].filter(Boolean).join(" - ");
  const historyText = `Refund of Rs. ${cleanAmount.toLocaleString()} paid to student via ${cleanMethod}${refDetails}.${noteDetails}`;

  const statements = [
    guard(
      "EXISTS(SELECT 1 FROM orders WHERE id=? AND version=?)",
      o.id,
      o.version,
    ),
    stmt(
      "UPDATE orders SET amount_paid=?, refund_due=?, refund_amount=?, refund_status=?, refund_note=?, refund_paid_at=?, version=version+1, updated_at=? WHERE id=?",
      newAmountPaid,
      newRefundDue,
      newRefundAmount,
      newRefundStatus,
      combinedRefundNote,
      at,
      at,
      o.id,
    ),
    stmt(
      "INSERT INTO order_payment_logs(id,order_id,amount,type,note,actor,payment_date,created_at) VALUES(?,?,?,?,?,?,?,?)",
      uid(),
      o.id,
      -cleanAmount,
      "STUDENT_REFUND",
      `${cleanMethod}${cleanRef ? ` - Ref: ${cleanRef}` : ""}${cleanNote ? ` - ${cleanNote}` : ""}`,
      u.email,
      at,
      at,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at,internal) VALUES(?,?,?,?,?,?,0)",
      uid(),
      o.id,
      o.status,
      historyText,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "STUDENT_REFUND_RECORDED",
      o.id,
      { refund_due: currentRefundDue, refund_amount: currentRefundAmount, amount_paid: currentPaid },
      { refund_due: newRefundDue, refund_amount: newRefundAmount, amount_paid: newAmountPaid, method: cleanMethod, reference: cleanRef },
      req,
    ),
  ];

  await batch(statements);

  return {
    ok: true,
    refund_due: newRefundDue,
    refund_amount: newRefundAmount,
    refund_status: newRefundStatus,
    amount_paid: newAmountPaid,
    message: `Refund of Rs. ${cleanAmount.toLocaleString()} recorded successfully ✓`,
  };
}
