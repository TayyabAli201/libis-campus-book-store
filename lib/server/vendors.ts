import { z } from "zod";
import { all, one, stmt, batch, now, uid, AppError, auditStmt } from "./db";
import { passwordHash, verifyPassword } from "./security";
import type { User, Vendor } from "@/lib/contracts";
import { getVendorWhatsAppMessage, getVendorWhatsAppUrl, isOtherCityOrder } from "@/lib/contracts";
import { sendVendorOrderAssignedEmail } from "./email";

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(25),
  email: z.string().trim().email("Enter a valid email address").max(120),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  address: z.string().trim().max(250).optional().nullable(),
});

export async function listVendors(u: User): Promise<Vendor[]> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Super Admin access required.");
  }

  const rows = await all<any>(
    `SELECT 
      v.*,
      (SELECT COUNT(*) FROM orders o WHERE o.vendor_id = v.id) AS assigned_orders_count,
      (SELECT COUNT(*) FROM orders o WHERE o.vendor_id = v.id AND o.status = 'PROCESSING') AS printing_orders_count
    FROM vendors v
    ORDER BY v.name ASC`
  );

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address || null,
    active: Boolean(r.active),
    created_at: r.created_at,
    assigned_orders_count: Number(r.assigned_orders_count || 0),
    printing_orders_count: Number(r.printing_orders_count || 0),
  }));
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
      `INSERT INTO vendors(id, user_id, name, phone, email, address, active, created_at)
       VALUES(?, ?, ?, ?, ?, ?, 1, ?)`,
      vendorId,
      userId,
      parsed.name,
      parsed.phone,
      normalizedEmail,
      parsed.address || null,
      createdAt,
    ),
    auditStmt(
      u.email,
      "CREATE_VENDOR",
      vendorId,
      undefined,
      { name: parsed.name, email: normalizedEmail, phone: parsed.phone },
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
      assigned_orders_count: 0,
      printing_orders_count: 0,
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

  statements.push(
    stmt(
      `UPDATE vendors SET name = ?, phone = ?, address = ?, active = ? WHERE id = ?`,
      newName,
      newPhone,
      newAddress,
      newActive,
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
      { name: newName, phone: newPhone, active: newActive, passwordUpdated: !!body.password },
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
  whatsapp_url: string;
  whatsapp_message: string;
  whatsappUrl?: string;
  whatsappMessage?: string;
}> {
  if (u.role !== "SUPER_ADMIN") {
    throw new AppError(403, "Only Super Admin can assign orders to vendors.");
  }

  const order = await one<any>("SELECT * FROM orders WHERE id = ?", orderId);
  if (!order) {
    throw new AppError(404, "Order not found.");
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

  // Status transition: If CONFIRMED, advance to PROCESSING (Printing).
  // If already PROCESSING or higher, keep status as is.
  let nextStatus = order.status;
  if (order.status === "CONFIRMED") {
    nextStatus = "PROCESSING";
  }

  const at = now();
  const noteText = `Assigned to vendor: ${vendor.name}${notes ? ` - Note: ${notes}` : ""}`;

  const statements = [
    stmt(
      `UPDATE orders SET vendor_id = ?, vendor_assigned_at = ?, vendor_notes = ?, status = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
      vendor.id,
      at,
      notes || null,
      nextStatus,
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

  // Trigger email asynchronously
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
    whatsapp_url: waUrl,
    whatsapp_message: waMsg,
    whatsappUrl: waUrl,
    whatsappMessage: waMsg,
  };
}
