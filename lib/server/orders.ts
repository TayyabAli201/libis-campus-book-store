import {
  checkoutInput,
  transitions,
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
  const [yyyy, mm, dd] = at.slice(0, 10).split("-");
  const random4 = Math.floor(1000 + Math.random() * 9000);
  const reference = `${data.settings.order_prefix}-${dd}${mm}${yyyy}-${random4}`;
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
        "EXISTS(SELECT 1 FROM books b JOIN pricing_categories p ON p.id=? WHERE b.id=? AND b.active=1 AND b.deleted_at IS NULL AND b.version=? AND COALESCE(b.fixed_price,b.pages*p.rate)=?)",
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
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(identifier))
    throw new AppError(
      404,
      "Order not found. Check your Order ID and try again.",
    );
  const o = await one<any>(
    "SELECT o.*,p.status AS payment_status,p.slip_id,p.note AS payment_note,s.ocr_status,s.detected_amount,s.ocr_message,s.mime FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE o.id=? OR o.reference=?",
    identifier.toLowerCase(),
    identifier.toUpperCase(),
  );
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
    // Public tracking has an explicit allowlist: no customer details, proofs or free-form notes.
    return {
      reference: o.reference,
      status: o.status,
      payment_status: o.payment_status,
      subtotal: o.subtotal,
      delivery: o.delivery,
      total: o.total,
      currency: o.currency,
      created_at: o.created_at,
      updated_at: o.updated_at,
      tracking_only: true,
      items: items.map(({ code, title, pages, quantity, unit_price }) => ({
        code,
        title,
        pages,
        quantity,
        unit_price,
      })),
      history: history.map(({ status, created_at }) => ({
        status,
        created_at,
      })),
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
  if (status) {
    filters.push("o.status=?");
    args.push(status);
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
    "SELECT COUNT(*) AS n FROM orders o WHERE " + where,
    ...args,
  );
  const isAll = limit === "all";
  const limitClause = isAll ? "LIMIT 10000" : "LIMIT 50 OFFSET ?";
  const queryArgs = isAll ? [...args] : [...args, (page - 1) * 50];
  const rows = await all(
    `SELECT o.*,p.status AS payment_status,s.detected_amount,s.ocr_status,p.slip_id FROM orders o JOIN payments p ON p.order_id=o.id JOIN payment_slips s ON s.id=p.slip_id WHERE ${where} ORDER BY o.created_at DESC ${limitClause}`,
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
  return { rows, total: total?.n || 0, page };
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
