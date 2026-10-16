import {
  checkoutInput,
  transitions,
  statuses,
  type Quote,
  type User,
  type Book,
  STUDENT_CATEGORY,
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
      "SELECT o.*,p.status AS payment_status,p.slip_id,p.note AS payment_note,s.ocr_status,s.detected_amount,s.ocr_message,s.mime,(SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id=o.id) AS total_books FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE o.id=? OR o.reference=? OR o.phone=? OR o.phone LIKE ? ORDER BY o.created_at DESC LIMIT 1",
      identifier.toLowerCase(),
      identifier.toUpperCase(),
      identifier,
      phoneWildcard,
    );
  } else {
    o = await one<any>(
      "SELECT o.*,p.status AS payment_status,p.slip_id,p.note AS payment_note,s.ocr_status,s.detected_amount,s.ocr_message,s.mime,(SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id=o.id) AS total_books FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE o.id=? OR o.reference=?",
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
    !!u && (u.role === "SUPER_ADMIN" || o.campus_id === u.campus_id);
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
      history: history.map(({ status, created_at, note }) => {
        const isCourierNote =
          typeof note === "string" &&
          (note.startsWith("Shipped via ") ||
            note.startsWith("Courier tracking details removed"));
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
    `SELECT o.*,p.status AS payment_status,s.detected_amount,s.ocr_status,p.slip_id,(SELECT COALESCE(SUM(quantity), 0) FROM order_items oi WHERE oi.order_id=o.id) AS total_books FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE ${where} ORDER BY o.created_at DESC ${limitClause}`,
    ...queryArgs,
  );
  rows.forEach((o) => {
    delete o.owner;
    delete o.tracking_hash;
    delete o.quote_id;
    delete o.store_snapshot;
  });
  if (isAll && rows.length > 0) {
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

  return {
    rows,
    total: total?.n || 0,
    total_books: total?.total_books || 0,
    page,
    pageSize,
    status_counts,
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
    !["PROCESSING", "READY", "SHIPPED", "DELIVERED"].includes(status)
  )
    throw new AppError(403, "Only Super Admin can cancel or handle refunds.");
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
  statements.push(
    stmt(
      "UPDATE orders SET status=?,inventory_state=?,updated_at=?,version=version+1 WHERE id=?",
      status,
      state,
      now(),
      o.id,
    ),
    stmt(
      "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
      uid(),
      o.id,
      status,
      note,
      u.email,
      now(),
    ),
    auditStmt(
      u.email,
      "ORDER_STATUS",
      o.id,
      { status: o.status },
      { status, note },
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

  const isPaymentVerified =
    o.payment_status === "VERIFIED" && o.status !== "PAYMENT_PENDING";
  if (!isPaymentVerified) {
    throw new AppError(
      400,
      "Payment verification is pending. Please verify and approve payment before adding courier tracking details.",
    );
  }

  const at = now();
  const nextStatus = o.status === "DELIVERED" ? "DELIVERED" : "SHIPPED";
  const note = `Shipped via ${cName} - Tracking #: ${tId}`;

  const statements = [
    stmt(
      "UPDATE orders SET courier_name=?,courier_tracking_id=?,status=?,updated_at=?,version=version+1 WHERE id=?",
      cName,
      tId,
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
  const at = now();
  const nextStatus = o.status === "SHIPPED" ? "READY" : o.status;
  const note = "Courier tracking details removed (order returned to Ready for Dispatch)";

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
  },
) {
  const { fromStatus, toStatus } = params;
  const validTransitions: Record<string, string> = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "READY",
    READY: "SHIPPED",
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
    !["PROCESSING", "READY", "SHIPPED", "DELIVERED"].includes(toStatus)
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
  const orders = await all<{ id: string; status: string; version: number }>(
    `SELECT o.id, o.status, o.version FROM orders o WHERE ${where} LIMIT 1000`,
    ...args,
  );

  if (!orders.length) {
    return { count: 0, status: toStatus };
  }

  const at = now();
  const chunkSize = 25;
  for (let i = 0; i < orders.length; i += chunkSize) {
    const chunk = orders.slice(i, i + chunkSize);
    const statements = [];
    for (const ord of chunk) {
      statements.push(
        stmt(
          "UPDATE orders SET status=?,updated_at=?,version=version+1 WHERE id=? AND status=?",
          toStatus,
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
