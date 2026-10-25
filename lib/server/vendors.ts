import { z } from "zod";
import { all, one, stmt, batch, now, uid, AppError, auditStmt } from "./db";
import { passwordHash, verifyPassword } from "./security";
import type { User, Vendor, VendorLedger } from "@/lib/contracts";
import {
  getVendorWhatsAppMessage,
  getVendorWhatsAppUrl,
  getVendorPendingBooksWhatsAppMessage,
  getVendorPendingBooksWhatsAppUrl,
  isOtherCityOrder,
} from "@/lib/contracts";
import { sendVendorOrderAssignedEmail } from "./email";

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(25),
  email: z.string().trim().email("Enter a valid email address").max(120),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  address: z.string().trim().max(250).optional().nullable(),
  per_page_rate: z.coerce.number().min(0.01).max(1000).optional().default(1.60),
  binding_rate: z.coerce.number().min(0).max(10000).optional().default(30.00),
});

export async function listVendors(u: User): Promise<Vendor[]> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Super Admin access required.");
  }

  const rows = await all<any>(
    `SELECT 
      v.*,
      (SELECT COUNT(*) FROM orders o WHERE o.vendor_id = v.id) AS assigned_orders_count,
      (SELECT COUNT(*) FROM orders o WHERE o.vendor_id = v.id AND o.status = 'PROCESSING') AS printing_orders_count,
      (SELECT COALESCE(SUM(amount), 0) FROM vendor_payments vp WHERE vp.vendor_id = v.id) AS total_paid
    FROM vendors v
    ORDER BY v.name ASC`
  );

  const orderAggs = await all<any>(
    `SELECT 
      o.vendor_id,
      COALESCE(SUM(CASE WHEN oi.is_unavailable = 1 OR oi.in_office_stock = 1 THEN 0 ELSE oi.pages * oi.quantity END), 0) AS total_pages,
      COALESCE(SUM(CASE WHEN oi.is_unavailable = 1 OR oi.in_office_stock = 1 THEN 0 ELSE oi.quantity END), 0) AS total_books
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.vendor_id IS NOT NULL AND o.status IN ('SHIPPED', 'DELIVERED')
     GROUP BY o.vendor_id`
  );

  const aggByVendor = new Map<string, { total_pages: number; total_books: number }>();
  for (const ag of orderAggs) {
    aggByVendor.set(ag.vendor_id, {
      total_pages: Number(ag.total_pages || 0),
      total_books: Number(ag.total_books || 0),
    });
  }

  const courierAggs = await all<any>(
    `SELECT 
      o.vendor_id,
      COALESCE(SUM(o.actual_courier_charges), 0) AS total_courier_charges
     FROM orders o
     WHERE o.vendor_id IS NOT NULL AND o.status IN ('SHIPPED', 'DELIVERED')
     GROUP BY o.vendor_id`
  );

  const courierByVendor = new Map<string, number>();
  for (const ca of courierAggs) {
    courierByVendor.set(ca.vendor_id, Number(ca.total_courier_charges || 0));
  }

  return rows.map((r) => {
    const perPageRate = Number(r.per_page_rate ?? 1.60);
    const bindingRate = Number(r.binding_rate ?? 30.00);
    const agg = aggByVendor.get(r.id) || { total_pages: 0, total_books: 0 };
    const courierCharges = Math.round(Number(courierByVendor.get(r.id) || 0));
    const printingEarnings = Math.round((agg.total_pages * perPageRate) + (agg.total_books * bindingRate));
    const totalEarnings = printingEarnings + courierCharges;
    const totalPaid = Number(r.total_paid || 0);
    const pendingBalance = totalEarnings - totalPaid;

    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      address: r.address || null,
      active: Boolean(r.active),
      created_at: r.created_at,
      per_page_rate: perPageRate,
      binding_rate: bindingRate,
      assigned_orders_count: Number(r.assigned_orders_count || 0),
      printing_orders_count: Number(r.printing_orders_count || 0),
      total_printing_cost: printingEarnings,
      total_courier_charges: courierCharges,
      total_earnings: totalEarnings,
      total_paid: totalPaid,
      pending_balance: pendingBalance,
    };
  });
}

export async function createVendor(
  req: Request,
  u: User,
  raw: unknown,
): Promise<{ ok: boolean; vendor: Vendor }> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Super Admin access required.");
  }

  const parsed = vendorSchema.parse(raw);
  const normalizedEmail = parsed.email.toLowerCase().trim();

  // Check unique email across users and vendors
  const existingUser = await one<any>(
    "SELECT id FROM users WHERE LOWER(email) = ?",
    normalizedEmail,
  );
  if (existingUser) {
    throw new AppError(400, "A user account with this email already exists.");
  }

  const existingVendor = await one<any>(
    "SELECT id FROM vendors WHERE LOWER(email) = ?",
    normalizedEmail,
  );
  if (existingVendor) {
    throw new AppError(400, "A vendor with this email already exists.");
  }

  const userId = uid();
  const vendorId = uid();
  const createdAt = now();
  const pHash = passwordHash(parsed.password);

  const statements = [
    stmt(
      `INSERT INTO users(id, email, name, password_hash, role, active, must_change, created_at)
       VALUES(?, ?, ?, ?, 'VENDOR', 1, 0, ?)`,
      userId,
      normalizedEmail,
      parsed.name,
      pHash,
      createdAt,
    ),
    stmt(
      `INSERT INTO vendors(id, user_id, name, phone, email, address, active, per_page_rate, binding_rate, created_at)
       VALUES(?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      vendorId,
      userId,
      parsed.name,
      parsed.phone,
      normalizedEmail,
      parsed.address || null,
      parsed.per_page_rate,
      parsed.binding_rate,
      createdAt,
    ),
    auditStmt(
      u.email,
      "CREATE_VENDOR",
      vendorId,
      undefined,
      { name: parsed.name, email: normalizedEmail, phone: parsed.phone, per_page_rate: parsed.per_page_rate, binding_rate: parsed.binding_rate },
      req,
    ),
  ];

  await batch(statements);

  return {
    ok: true,
    vendor: {
      id: vendorId,
      user_id: userId,
      name: parsed.name,
      phone: parsed.phone,
      email: normalizedEmail,
      address: parsed.address || null,
      active: true,
      created_at: createdAt,
      per_page_rate: parsed.per_page_rate,
      binding_rate: parsed.binding_rate,
      assigned_orders_count: 0,
      printing_orders_count: 0,
      total_earnings: 0,
      total_paid: 0,
      pending_balance: 0,
    },
  };
}

export async function updateVendor(
  req: Request,
  u: User,
  id: string,
  raw: unknown,
): Promise<{ ok: boolean }> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Super Admin access required.");
  }

  const schema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().min(7).max(25).optional(),
    address: z.string().trim().max(250).optional().nullable(),
    active: z.boolean().optional(),
    password: z.string().min(6).max(100).optional(),
    per_page_rate: z.coerce.number().min(0.01).max(1000).optional(),
    binding_rate: z.coerce.number().min(0).max(10000).optional(),
  });

  const body = schema.parse(raw);
  const vendor = await one<any>("SELECT * FROM vendors WHERE id = ?", id);
  if (!vendor) {
    throw new AppError(404, "Vendor not found.");
  }

  const statements = [];

  const newName = body.name ?? vendor.name;
  const newPhone = body.phone ?? vendor.phone;
  const newAddress = body.address !== undefined ? body.address : vendor.address;
  const newActive = body.active !== undefined ? (body.active ? 1 : 0) : vendor.active;
  const newPerPageRate = body.per_page_rate !== undefined ? Number(body.per_page_rate) : Number(vendor.per_page_rate ?? 1.60);
  const newBindingRate = body.binding_rate !== undefined ? Number(body.binding_rate) : Number(vendor.binding_rate ?? 30.00);

  statements.push(
    stmt(
      `UPDATE vendors SET name = ?, phone = ?, address = ?, active = ?, per_page_rate = ?, binding_rate = ? WHERE id = ?`,
      newName,
      newPhone,
      newAddress,
      newActive,
      newPerPageRate,
      newBindingRate,
      id,
    ),
  );

  statements.push(
    stmt(
      `UPDATE users SET name = ?, active = ? WHERE id = ?`,
      newName,
      newActive,
      vendor.user_id,
    ),
  );

  if (body.password) {
    const pHash = passwordHash(body.password);
    statements.push(
      stmt(`UPDATE users SET password_hash = ? WHERE id = ?`, pHash, vendor.user_id),
    );
  }

  statements.push(
    auditStmt(
      u.email,
      "UPDATE_VENDOR",
      id,
      vendor,
      {
        name: newName,
        phone: newPhone,
        active: newActive,
        per_page_rate: newPerPageRate,
        binding_rate: newBindingRate,
        passwordUpdated: !!body.password,
      },
      req,
    ),
  );

  await batch(statements);
  return { ok: true };
}

export async function deleteVendor(
  req: Request,
  u: User,
  id: string,
): Promise<{ ok: boolean }> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Super Admin access required.");
  }

  const vendor = await one<any>("SELECT * FROM vendors WHERE id = ?", id);
  if (!vendor) {
    throw new AppError(404, "Vendor not found.");
  }

  const ordersCount = await one<any>(
    "SELECT COUNT(*) AS n FROM orders WHERE vendor_id = ?",
    id,
  );
  if (ordersCount && ordersCount.n > 0) {
    throw new AppError(
      400,
      `Cannot delete vendor with ${ordersCount.n} assigned order(s). You can deactivate their login access instead.`,
    );
  }

  await batch([
    stmt("DELETE FROM vendors WHERE id = ?", id),
    stmt("DELETE FROM users WHERE id = ?", vendor.user_id),
    auditStmt(u.email, "DELETE_VENDOR", id, vendor, undefined, req),
  ]);

  return { ok: true };
}

export async function getVendorLedger(
  u: User,
  vendorId?: string,
): Promise<VendorLedger> {
  let targetVendorId = vendorId;
  if (u.role === "VENDOR") {
    targetVendorId = u.vendor_id || u.id;
  } else if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Access denied.");
  }

  if (!targetVendorId) {
    throw new AppError(400, "Vendor ID is required.");
  }

  const v = await one<any>("SELECT * FROM vendors WHERE id = ?", targetVendorId);
  if (!v) {
    throw new AppError(404, "Vendor not found.");
  }

  const perPageRate = Number(v.per_page_rate ?? 1.60);
  const bindingRate = Number(v.binding_rate ?? 30.00);

  // Compute order statistics and earnings (Active assigned work, with earnings payable on SHIPPED/DELIVERED)
  const orderStats = await one<any>(
    `SELECT 
      COUNT(DISTINCT o.id) AS total_orders,
      COUNT(DISTINCT CASE WHEN o.status = 'PROCESSING' AND o.vendor_printed_at IS NULL THEN o.id END) AS printing_orders,
      COUNT(DISTINCT CASE WHEN o.vendor_printed_at IS NOT NULL THEN o.id END) AS printed_orders,
      COUNT(DISTINCT CASE WHEN o.status IN ('SHIPPED', 'DELIVERED') THEN o.id END) AS shipped_orders,
      COALESCE(SUM(CASE WHEN oi.is_unavailable = 1 OR oi.in_office_stock = 1 THEN 0 ELSE oi.pages * oi.quantity END), 0) AS total_pages,
      COALESCE(SUM(CASE WHEN oi.is_unavailable = 1 OR oi.in_office_stock = 1 THEN 0 ELSE oi.quantity END), 0) AS total_books,
      COALESCE(SUM(CASE WHEN o.status IN ('SHIPPED', 'DELIVERED') AND (oi.is_unavailable = 1 OR oi.in_office_stock = 1) THEN 0 WHEN o.status IN ('SHIPPED', 'DELIVERED') THEN oi.pages * oi.quantity ELSE 0 END), 0) AS shipped_pages,
      COALESCE(SUM(CASE WHEN o.status IN ('SHIPPED', 'DELIVERED') AND (oi.is_unavailable = 1 OR oi.in_office_stock = 1) THEN 0 WHEN o.status IN ('SHIPPED', 'DELIVERED') THEN oi.quantity ELSE 0 END), 0) AS shipped_books,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') AND (oi.is_unavailable = 1 OR oi.in_office_stock = 1) THEN 0 WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') THEN oi.pages * oi.quantity ELSE 0 END), 0) AS queue_pages,
      COALESCE(SUM(CASE WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') AND (oi.is_unavailable = 1 OR oi.in_office_stock = 1) THEN 0 WHEN o.status NOT IN ('SHIPPED', 'DELIVERED') THEN oi.quantity ELSE 0 END), 0) AS queue_books
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.vendor_id = ? AND o.status NOT IN ('CANCELLED', 'REFUND_REQUESTED', 'REFUND_COMPLETED')`,
    targetVendorId,
  );

  const courierStats = await one<any>(
    `SELECT 
      COALESCE(SUM(actual_courier_charges), 0) AS total_courier_charges,
      COUNT(CASE WHEN actual_courier_charges > 0 THEN 1 END) AS courier_orders_count
     FROM orders 
     WHERE vendor_id = ? AND status IN ('SHIPPED', 'DELIVERED')`,
    targetVendorId,
  );

  const totalPages = Number(orderStats?.total_pages || 0);
  const totalBooks = Number(orderStats?.total_books || 0);
  const shippedPages = Number(orderStats?.shipped_pages || 0);
  const shippedBooks = Number(orderStats?.shipped_books || 0);
  const queuePages = Number(orderStats?.queue_pages || 0);
  const queueBooks = Number(orderStats?.queue_books || 0);

  const totalOrders = Number(orderStats?.total_orders || 0);
  const totalCourierCharges = Math.round(Number(courierStats?.total_courier_charges || 0));
  const totalPrintingCost = Math.round((totalPages * perPageRate) + (totalBooks * bindingRate));
  const shippedPrintingCost = Math.round((shippedPages * perPageRate) + (shippedBooks * bindingRate));
  const queueEstimatedCost = Math.round((queuePages * perPageRate) + (queueBooks * bindingRate));
  const totalEarnings = shippedPrintingCost + totalCourierCharges;

  // Compute payments and ledger entries
  const payments = await all<any>(
    `SELECT vp.*, v.name AS vendor_name 
     FROM vendor_payments vp
     JOIN vendors v ON v.id = vp.vendor_id
     WHERE vp.vendor_id = ?
     ORDER BY vp.payment_date DESC, vp.created_at DESC`,
    targetVendorId,
  );

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingBalance = totalEarnings - totalPaid;

  const vendorOrdersRaw = await all<any>(
    `SELECT 
      o.id,
      o.reference,
      o.name,
      o.phone,
      o.city,
      o.delivery_type,
      o.status,
      o.courier_name,
      o.courier_tracking_id,
      COALESCE(o.actual_courier_charges, 0) AS actual_courier_charges,
      o.created_at,
      COALESCE(SUM(CASE WHEN oi.is_unavailable = 1 OR oi.in_office_stock = 1 THEN 0 ELSE oi.pages * oi.quantity END), 0) AS total_pages,
      COALESCE(SUM(CASE WHEN oi.is_unavailable = 1 OR oi.in_office_stock = 1 THEN 0 ELSE oi.quantity END), 0) AS total_books
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.vendor_id = ?
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    targetVendorId,
  );

  const vendorOrders = vendorOrdersRaw.map((ord) => {
    const isPayable = ord.status === 'SHIPPED' || ord.status === 'DELIVERED';
    const estCost = Math.round((Number(ord.total_pages || 0) * perPageRate) + (Number(ord.total_books || 0) * bindingRate));
    const cCharges = Math.round(Number(ord.actual_courier_charges || 0));
    const pCost = isPayable ? estCost : 0;
    const finalCourier = isPayable ? cCharges : 0;
    return {
      id: ord.id,
      reference: ord.reference || ord.id,
      name: ord.name,
      phone: ord.phone || null,
      city: ord.city,
      delivery_type: ord.delivery_type,
      status: ord.status,
      courier_name: ord.courier_name || null,
      courier_tracking_id: ord.courier_tracking_id || null,
      actual_courier_charges: finalCourier,
      total_books: Number(ord.total_books || 0),
      total_pages: Number(ord.total_pages || 0),
      printing_cost: pCost,
      total_credit: pCost + finalCourier,
      estimated_credit: estCost + cCharges,
      is_payable: isPayable,
      created_at: ord.created_at,
    };
  });

  const summary = {
    total_orders: totalOrders,
    total_pages: totalPages,
    total_books: totalBooks,
    printing_orders: Number(orderStats?.printing_orders || 0),
    printed_orders: Number(orderStats?.printed_orders || 0),
    per_page_rate: perPageRate,
    binding_rate: bindingRate,
    total_printing_cost: totalPrintingCost,
    queue_pages: queuePages,
    queue_books: queueBooks,
    queue_estimated_cost: queueEstimatedCost,
    total_courier_charges: totalCourierCharges,
    courier_orders_count: Number(courierStats?.courier_orders_count || 0),
    total_earned: totalEarnings,
    total_paid: totalPaid,
    pending_balance: pendingBalance,
  };

  return {
    vendor: {
      id: v.id,
      user_id: v.user_id,
      name: v.name,
      phone: v.phone,
      email: v.email,
      address: v.address || null,
      active: Boolean(v.active),
      created_at: v.created_at,
      per_page_rate: perPageRate,
      binding_rate: bindingRate,
      assigned_orders_count: totalOrders,
      printing_orders_count: Number(orderStats?.printing_orders || 0),
      total_earnings: totalEarnings,
      total_paid: totalPaid,
      pending_balance: pendingBalance,
    },
    summary,
    total_earnings: totalEarnings,
    total_paid: totalPaid,
    pending_balance: pendingBalance,
    total_orders: totalOrders,
    payments: payments.map((p) => ({
      id: p.id,
      vendor_id: p.vendor_id,
      vendor_name: p.vendor_name,
      amount: Number(p.amount || 0),
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      reference: p.reference || null,
      notes: p.notes || null,
      created_by: p.created_by,
      created_at: p.created_at,
    })),
    orders: vendorOrders,
  };
}

const paymentSchema = z.object({
  vendor_id: z.string().min(1, "Vendor is required"),
  amount: z.coerce.number().int().positive("Amount must be greater than 0"),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)"),
  payment_method: z.string().trim().min(1, "Payment method is required").default("Bank Transfer"),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function createVendorPayment(
  req: Request,
  u: User,
  raw: unknown,
): Promise<{ ok: boolean; payment: any }> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can record vendor payments.");
  }

  const parsed = paymentSchema.parse(raw);
  const v = await one<any>("SELECT id, name FROM vendors WHERE id = ?", parsed.vendor_id);
  if (!v) {
    throw new AppError(404, "Vendor not found.");
  }

  const paymentId = uid();
  const createdAt = now();

  await batch([
    stmt(
      `INSERT INTO vendor_payments(id, vendor_id, amount, payment_date, payment_method, reference, notes, created_by, created_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      paymentId,
      parsed.vendor_id,
      parsed.amount,
      parsed.payment_date,
      parsed.payment_method,
      parsed.reference || null,
      parsed.notes || null,
      u.email,
      createdAt,
    ),
    auditStmt(
      u.email,
      "RECORD_VENDOR_PAYMENT",
      paymentId,
      undefined,
      { vendor_name: v.name, amount: parsed.amount, reference: parsed.reference },
      req,
    ),
  ]);

  return {
    ok: true,
    payment: {
      id: paymentId,
      vendor_id: parsed.vendor_id,
      amount: parsed.amount,
      payment_date: parsed.payment_date,
      payment_method: parsed.payment_method,
      reference: parsed.reference || null,
      notes: parsed.notes || null,
      created_by: u.email,
      created_at: createdAt,
    },
  };
}

export async function deleteVendorPayment(
  req: Request,
  u: User,
  paymentId: string,
): Promise<{ ok: boolean }> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can delete vendor payment records.");
  }

  const payment = await one<any>("SELECT * FROM vendor_payments WHERE id = ?", paymentId);
  if (!payment) {
    throw new AppError(404, "Payment record not found.");
  }

  await batch([
    stmt("DELETE FROM vendor_payments WHERE id = ?", paymentId),
    auditStmt(u.email, "DELETE_VENDOR_PAYMENT", paymentId, payment, undefined, req),
  ]);

  return { ok: true };
}

export async function assignOrderToVendor(
  req: Request,
  u: User,
  orderId: string,
  vendorId: string,
  notes?: string,
): Promise<{
  ok: boolean;
  status: string;
  vendor: Vendor;
  vendor_name?: string;
  whatsapp_url: string;
  whatsapp_message: string;
  whatsappUrl?: string;
  whatsappMessage?: string;
}> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can assign orders to vendors.");
  }

  const order = await one<any>(
    "SELECT o.*, p.status AS payment_status FROM orders o LEFT JOIN payments p ON p.order_id = o.id WHERE o.id = ?",
    orderId,
  );
  if (!order) {
    throw new AppError(404, "Order not found.");
  }
  if (order.payment_status !== "VERIFIED" && !["DELIVERED", "SHIPPED"].includes(order.status)) {
    throw new AppError(400, "Only orders with verified payment can be sent to a vendor.");
  }
  if (["CANCELLED", "REJECTED"].includes(order.status)) {
    throw new AppError(400, `Cannot assign order in ${order.status} status to a vendor.`);
  }

  const vendor = await one<any>(
    "SELECT * FROM vendors WHERE id = ? AND active = 1",
    vendorId,
  );
  if (!vendor) {
    throw new AppError(404, "Active vendor not found.");
  }

  // Load items for the notification
  const items = await all<any>(
    "SELECT code, title, pages, quantity FROM order_items WHERE order_id = ?",
    orderId,
  );
  order.items = items;
  order.total_books = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const at = now();
  const isDeliveredOrShipped = ["DELIVERED", "SHIPPED"].includes(order.status);

  // Status transition:
  // For DELIVERED / SHIPPED orders, preserve their terminal/active status and stamp printing & dispatch dates
  // so the vendor's billing ledger immediately records the completed work.
  // For unfulfilled orders (CONFIRMED / PAYMENT_PENDING / PENDING), transition into PROCESSING (Printing Queue).
  let nextStatus = order.status;
  let nextVendorPrintedAt: string | null = null;
  let nextVendorDispatchedAt: string | null = null;

  if (isDeliveredOrShipped) {
    nextStatus = order.status;
    nextVendorPrintedAt = order.vendor_printed_at || at;
    nextVendorDispatchedAt = order.vendor_dispatched_at || at;
  } else {
    if (
      order.status === "CONFIRMED" ||
      order.status === "PAYMENT_PENDING" ||
      order.status === "PENDING"
    ) {
      nextStatus = "PROCESSING";
    }
    nextVendorPrintedAt = null;
    nextVendorDispatchedAt = null;
  }

  const noteText = `Assigned to vendor: ${vendor.name}${isDeliveredOrShipped ? ` (${order.status} order)` : ""}${notes ? ` - Note: ${notes}` : ""}`;

  const statements = [
    stmt(
      `UPDATE orders SET vendor_id = ?, vendor_assigned_at = ?, vendor_notes = ?, status = ?, vendor_printed_at = ?, vendor_dispatched_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      vendor.id,
      at,
      notes || null,
      nextStatus,
      nextVendorPrintedAt,
      nextVendorDispatchedAt,
      at,
      order.id,
    ),
    stmt(
      `INSERT INTO order_history(id, order_id, status, note, actor, internal, created_at)
       VALUES(?, ?, ?, ?, ?, 0, ?)`,
      uid(),
      order.id,
      nextStatus,
      noteText,
      u.email,
      at,
    ),
    auditStmt(
      u.email,
      "ASSIGN_ORDER_TO_VENDOR",
      order.id,
      { vendor_id: order.vendor_id, status: order.status },
      { vendor_id: vendor.id, status: nextStatus, vendor_name: vendor.name },
      req,
    ),
  ];

  await batch(statements);

  // Trigger email asynchronously (only for active queue orders, avoid notifying for historical delivered orders)
  if (!isDeliveredOrShipped) {
    try {
      sendVendorOrderAssignedEmail({
        vendor,
        order: { ...order, status: nextStatus },
        items,
        origin: new URL(req.url).origin,
      }).catch((err) => {
        console.error("Failed to send vendor order email:", err);
      });
    } catch (err) {
      console.error("Failed to trigger vendor email:", err);
    }
  }

  const waUrl = getVendorWhatsAppUrl(order, vendor);
  const waMsg = getVendorWhatsAppMessage(order, vendor);

  return {
    ok: true,
    status: nextStatus,
    vendor: {
      id: vendor.id,
      user_id: vendor.user_id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address || null,
      active: true,
      created_at: vendor.created_at,
    },
    vendor_name: vendor.name,
    whatsapp_url: waUrl,
    whatsapp_message: waMsg,
    whatsappUrl: waUrl,
    whatsappMessage: waMsg,
  };
}

export async function batchAssignOrdersToVendor(
  req: Request,
  u: User,
  orderIds: string[],
  vendorId: string,
  notes?: string,
): Promise<{
  ok: boolean;
  count: number;
  vendor: Vendor;
  vendor_name?: string;
  message: string;
}> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can assign orders to vendors.");
  }
  if (!orderIds || !orderIds.length) {
    throw new AppError(400, "No orders specified.");
  }

  const vendor = await one<any>(
    "SELECT * FROM vendors WHERE id = ? AND active = 1",
    vendorId,
  );
  if (!vendor) {
    throw new AppError(404, "Active vendor not found.");
  }

  const at = now();
  const statements: any[] = [];
  let assignedCount = 0;

  for (const id of orderIds) {
    const order = await one<any>(
      "SELECT o.*, p.status AS payment_status FROM orders o LEFT JOIN payments p ON p.order_id = o.id WHERE o.id = ?",
      id,
    );
    if (!order) continue;
    // Strict requirement: Only orders whose payment is verified can be assigned/sent to vendor
    if (order.payment_status !== "VERIFIED" && !["DELIVERED", "SHIPPED"].includes(order.status)) {
      continue;
    }
    if (["CANCELLED", "REJECTED"].includes(order.status)) {
      continue;
    }

    const isDeliveredOrShipped = ["DELIVERED", "SHIPPED"].includes(order.status);
    let nextStatus = order.status;
    let nextVendorPrintedAt: string | null = null;
    let nextVendorDispatchedAt: string | null = null;

    if (isDeliveredOrShipped) {
      nextStatus = order.status;
      nextVendorPrintedAt = order.vendor_printed_at || at;
      nextVendorDispatchedAt = order.vendor_dispatched_at || at;
    } else {
      if (
        order.status === "CONFIRMED" ||
        order.status === "PAYMENT_PENDING" ||
        order.status === "PENDING"
      ) {
        nextStatus = "PROCESSING";
      }
      nextVendorPrintedAt = null;
      nextVendorDispatchedAt = null;
    }

    const noteText = `Batch assigned to vendor: ${vendor.name}${isDeliveredOrShipped ? ` (${order.status})` : ""}${notes ? ` - Note: ${notes}` : ""}`;

    statements.push(
      stmt(
        `UPDATE orders SET vendor_id = ?, vendor_assigned_at = ?, vendor_notes = ?, status = ?, vendor_printed_at = ?, vendor_dispatched_at = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
        vendor.id,
        at,
        notes || null,
        nextStatus,
        nextVendorPrintedAt,
        nextVendorDispatchedAt,
        at,
        order.id,
      ),
      stmt(
        `INSERT INTO order_history(id, order_id, status, note, actor, internal, created_at)
         VALUES(?, ?, ?, ?, ?, 0, ?)`,
        uid(),
        order.id,
        nextStatus,
        noteText,
        u.email,
        at,
      ),
      auditStmt(
        u.email,
        "BATCH_ASSIGN_ORDER_TO_VENDOR",
        order.id,
        { vendor_id: order.vendor_id, status: order.status },
        { vendor_id: vendor.id, status: nextStatus, vendor_name: vendor.name },
        req,
      ),
    );
    assignedCount++;

    const items = await all<any>(
      "SELECT code, title, pages, quantity FROM order_items WHERE order_id = ?",
      order.id,
    );
    if (!isDeliveredOrShipped) {
      try {
        sendVendorOrderAssignedEmail({
          vendor,
          order: { ...order, status: nextStatus },
          items,
          origin: new URL(req.url).origin,
        }).catch((err) => {
          console.error("Failed to send vendor order email:", err);
        });
      } catch (err) {
        console.error("Failed to trigger vendor email:", err);
      }
    }
  }

  if (statements.length > 0) {
    await batch(statements);
  }

  return {
    ok: true,
    count: assignedCount,
    vendor: {
      id: vendor.id,
      user_id: vendor.user_id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address || null,
      active: true,
      created_at: vendor.created_at,
    },
    message: `Successfully sent ${assignedCount} verified order(s) to ${vendor.name}.`,
  };
}

export async function getVendorPendingBooks(
  u: User,
  vendorId?: string,
) {
  let targetVendorId = vendorId;
  if (u.role === "VENDOR") {
    targetVendorId = u.vendor_id || u.id;
  } else if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Access denied.");
  }

  if (!targetVendorId) {
    throw new AppError(400, "Vendor ID is required.");
  }

  const vendor = await one<any>("SELECT * FROM vendors WHERE id = ?", targetVendorId);
  if (!vendor) {
    throw new AppError(404, "Vendor not found.");
  }

  const rows = await all<any>(
    `SELECT 
      oi.code,
      oi.title,
      SUM(CASE WHEN o.vendor_dispatched_at IS NOT NULL THEN oi.quantity ELSE 0 END) AS shortage_qty,
      SUM(CASE WHEN o.vendor_dispatched_at IS NULL THEN oi.quantity ELSE 0 END) AS printing_qty,
      SUM(oi.quantity) AS total_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.vendor_id = ? 
      AND (o.delivery_type != 'other' OR o.delivery_type IS NULL)
      AND o.status NOT IN ('DELIVERED', 'CANCELLED', 'REJECTED')
      AND oi.received_from_vendor = 0
      AND (oi.is_unavailable IS NULL OR oi.is_unavailable = 0)
      AND (oi.in_office_stock IS NULL OR oi.in_office_stock = 0)
    GROUP BY oi.code, oi.title
    ORDER BY shortage_qty DESC, oi.code ASC`,
    targetVendorId,
  );

  const pendingList = rows.map((r: any) => ({
    code: r.code,
    title: r.title || "",
    totalQty: Number(r.total_qty || 0),
    shortageQty: Number(r.shortage_qty || 0),
    printingQty: Number(r.printing_qty || 0),
  }));

  const totalPendingQty = pendingList.reduce((sum: number, item: any) => sum + item.totalQty, 0);
  const totalShortageQty = pendingList.reduce((sum: number, item: any) => sum + item.shortageQty, 0);
  const totalPrintingQty = pendingList.reduce((sum: number, item: any) => sum + item.printingQty, 0);
  const totalPendingTitles = pendingList.length;

  const whatsappMessage = getVendorPendingBooksWhatsAppMessage(vendor.name, pendingList);
  const whatsappUrl = getVendorPendingBooksWhatsAppUrl(vendor.phone || "", vendor.name, pendingList);

  return {
    ok: true,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
    },
    pendingBooks: pendingList,
    totalPendingQty,
    totalShortageQty,
    totalPrintingQty,
    totalPendingTitles,
    whatsappMessage,
    whatsappUrl,
  };
}
