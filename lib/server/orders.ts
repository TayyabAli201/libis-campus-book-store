import {
  checkoutInput,
  transitions,
  statuses,
  type Quote,
  type User,
  type Book,
  STUDENT_CATEGORY,
  isOtherCityOrder,
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
  o.store = JSON.parse(o.store_snapshot);
  delete o.store_snapshot;

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

    o.vendor_price = vendorPrice;
    o.vendor_pages = orderPages;
    o.vendor_books = orderBooks;
    o.vendor_rate_breakdown = {
      per_page_rate: perPageRate,
      binding_rate: bindingRate,
      total_pages: orderPages,
      total_books: orderBooks,
      pages_amount: Math.round(orderPages * perPageRate),
      binding_amount: Math.round(orderBooks * bindingRate),
      total_vendor_price: vendorPrice,
      formula: `(${orderPages} pages × Rs. ${perPageRate}) + (${orderBooks} books × Rs. ${bindingRate}) = Rs. ${vendorPrice}`,
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
  if (status && status !== "all") {
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
  rows.forEach((o) => {
    delete o.owner;
    delete o.tracking_hash;
    delete o.quote_id;
    delete o.store_snapshot;
  });
  if (rows.length > 0) {
    const orderIds = rows.map((r: any) => r.id);
    const allItems: any[] = [];
    for (let i = 0; i < orderIds.length; i += 100) {
      const slice = orderIds.slice(i, i + 100);
      const placeholders = slice.map(() => "?").join(",");
      const batchItems = await all(
        `SELECT order_id,code,title,pages,unit_price,quantity FROM order_items WHERE order_id IN (${placeholders})`,
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

      (r as any).vendor_price = vendorPrice;
      (r as any).vendor_pages = orderPages;
      (r as any).vendor_books = orderBooks;
      (r as any).vendor_rate_breakdown = {
        per_page_rate: perPageRate,
        binding_rate: bindingRate,
        total_pages: orderPages,
        total_books: orderBooks,
        pages_amount: Math.round(orderPages * perPageRate),
        binding_amount: Math.round(orderBooks * bindingRate),
        total_vendor_price: vendorPrice,
        formula: `(${orderPages} pages × Rs. ${perPageRate}) + (${orderBooks} books × Rs. ${bindingRate}) = Rs. ${vendorPrice}`,
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
    const totalEarningsAll = Math.round((totalPagesAll * perPageRate) + (totalBooksAll * bindingRate));

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
    // Settle reservations only for orders created before stock tracking was removed.
    if (state === "RESERVED") {
      statements.push(...movementStatements(o, items, "RELEASE", u.email));
      state = "RELEASED";
    }
  } else if (action === "reject") {
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
      `Payment review: ${payment}. ${note}`,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "PAYMENT_" + action.toUpperCase(),
      o.id,
      { status: o.payment_status },
      { status: payment, note },
      req,
    ),
  );
  await batch(statements);
  return { status, payment };
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

  const statements = [
    stmt(
      "UPDATE orders SET courier_name=?,courier_tracking_id=?,status=?,vendor_printed_at=?,updated_at=?,version=version+1 WHERE id=?",
      cName,
      tId,
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
      { courier_name: o.courier_name, courier_tracking_id: o.courier_tracking_id },
      { courier_name: cName, courier_tracking_id: tId },
      req,
    ),
  ];
  await batch(statements);
  return { ok: true, courier_name: cName, courier_tracking_id: tId, status: nextStatus };
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
      "UPDATE orders SET courier_name=NULL,courier_tracking_id=NULL,status=?,updated_at=?,version=version+1 WHERE id=?",
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
      },
      { courier_name: null, courier_tracking_id: null, status: nextStatus },
      req,
    ),
  ];
  await batch(statements);
  return { ok: true, removed: true, status: nextStatus };
}

export async function vendorPrint(
  req: Request,
  u: User,
  id: string,
  printed = true,
) {
  if (u.role !== "VENDOR") {
    throw new AppError(403, "Marking print status is reserved for vendors only.");
  }
  const o = await getOrder(req, id, u);
  if (o.vendor_id !== (u.vendor_id || u.id)) {
    throw new AppError(403, "You can only update print status for your assigned orders.");
  }
  const isPrinted = printed !== false;
  const printTime = isPrinted ? now() : null;
  await batch([
    stmt("UPDATE orders SET vendor_printed_at=?, version=version+1 WHERE id=?", printTime, o.id),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
      uid(),
      o.id,
      o.status,
      isPrinted ? "Marked books as printed by vendor" : "Unmarked printed status",
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
  ]);
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
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
      uid(),
      o.id,
      "SHIPPED",
      note?.trim()
        ? `Dispatched by vendor to Bookstore Office: ${note.trim()}`
        : "Dispatched by vendor to Bookstore Office",
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
  if (u.role !== "VENDOR") {
    throw new AppError(403, "Batch print marking is reserved for vendors only.");
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
      `SELECT o.id, o.status, o.vendor_id, o.vendor_printed_at FROM orders o WHERE o.id IN (${placeholders}) AND ${s.sql}`,
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
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        "SHIPPED",
        note?.trim()
          ? `Dispatched by vendor to Bookstore Office (batch): ${note.trim()}`
          : "Dispatched by vendor to Bookstore Office (batch)",
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
    // Remove from Printing Queue -> Reverts to CONFIRMED
    if (o.status !== "PROCESSING") {
      throw new AppError(400, "Only orders currently in printing can be removed from the Printing Queue.");
    }
    await batch([
      stmt(
        "UPDATE orders SET status='CONFIRMED', vendor_printed_at=NULL, vendor_dispatched_at=NULL, updated_at=?, version=version+1 WHERE id=?",
        at,
        o.id,
      ),
      stmt(
        "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,0,?)",
        uid(),
        o.id,
        "CONFIRMED",
        "Removed from Printing Queue. Reverted to Confirmed status.",
        u.email,
        at,
      ),
      auditStmt(u.email, "ORDER_PRINT_QUEUE_REMOVE", o.id, { status: o.status }, { status: "CONFIRMED" }, req),
    ]);
    return { ok: true, status: "CONFIRMED", in_queue: false, vendor_printed_at: null };
  }
}

export async function batchSetPrintingQueue(
  req: Request,
  u: User,
  orderIds: string[],
  inQueue: boolean,
) {
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
        "UPDATE orders SET status=?, vendor_printed_at=NULL, vendor_dispatched_at=NULL, updated_at=?, version=version+1 WHERE id=?",
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
          : "Removed from Printing Queue. Reverted to Confirmed status (batch).",
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
