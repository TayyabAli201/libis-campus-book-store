import { z } from "zod";
import {
  all,
  one,
  stmt,
  batch,
  guard,
  now,
  uid,
  AppError,
  auditStmt,
  bucket,
  runtime,
} from "@/lib/server/db";
import {
  authenticate,
  csrf,
  rate,
  user,
  admin,
  guest,
  token,
  hash,
  cookie,
  cookieValue,
  passwordHash,
  verifyPassword,
  scope,
} from "@/lib/server/security";
import {
  catalog,
  getSettings,
  saveBook,
  importBooks,
  clearBooks,
  clearBooksPreview,
} from "@/lib/server/catalog";
import {
  quote,
  submitOrder,
  getOrder,
  listOrders,
  pendingOrderCount,
  decidePayment,
  changeStatus,
  setCourierTracking,
  removeCourierTracking,
  updateActualCourierCharges,
  batchChangeStatus,
  vendorPrint,
  vendorDispatchOffice,
  batchVendorPrint,
  batchVendorDispatchOffice,
  setPrintingQueue,
  batchSetPrintingQueue,
  editOrderItems,
  recordDuePayment,
  updateDueNote,
  toggleOrderItemReceived,
  setAllOrderItemsReceived,
  recordStudentRefund,
  changeDeliveryType,
} from "@/lib/server/orders";
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  assignOrderToVendor,
  batchAssignOrdersToVendor,
  getVendorLedger,
  createVendorPayment,
  deleteVendorPayment,
  getVendorPendingBooks,
} from "@/lib/server/vendors";
import { upload } from "@/lib/server/uploads";
import { bootstrap } from "@/lib/server/seed";
import { reports } from "@/lib/server/reports";
import { password, permissions, settingsInput, isOtherCityOrder } from "@/lib/contracts";
export const dynamic = "force-dynamic";
async function json(req: Request) {
  if (Number(req.headers.get("content-length")) > 500000)
    throw new AppError(413, "Request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, "A request body is required.");
  let text = "",
    size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 500000) {
      await reader.cancel();
      throw new AppError(413, "Request is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, "Invalid request body.");
  }
}
const ok = (
  data: unknown,
  status = 200,
  headers: Record<string, string> | Headers = {},
) => {
  const h = new Headers({ "Cache-Control": "no-store" });
  if (headers instanceof Headers) {
    headers.forEach((v, k) => h.append(k, v));
  } else {
    for (const [k, v] of Object.entries(headers)) {
      h.set(k, v);
    }
  }
  return Response.json(data, {
    status,
    headers: h,
  });
};
async function handle(req: Request) {
  const url = new URL(req.url),
    p = url.pathname.replace(/^\/api\//, "").split("/"),
    action = p.join("/"),
    method = req.method;
  try {
    if (action === "setup" && method === "POST")
      return ok(await bootstrap(req));
    if (method !== "GET") csrf(req);
    if (action === "session" && method === "GET") {
      let u = null;
      try {
        u = await user(req, "profile");
      } catch {}
      let t = cookieValue(req, "cbs_guest");
      if (!/^[a-f0-9]{64}$/.test(t)) t = token();
      return ok({ user: u }, 200, {
        "Set-Cookie": cookie(req, "cbs_guest", t, 60 * 60 * 24 * 90),
      });
    }
    if (action === "login" && method === "POST") {
      const b = z
        .object({
          email: z.string().trim().email().max(200),
          password: z.string().min(1).max(128),
          portal: z.enum(["admin", "campus", "vendor"]),
        })
        .parse(await json(req));
      const r = await authenticate(req, b.email, b.password, b.portal);
      const cookieName =
        b.portal === "vendor"
          ? "cbs_vendor_session"
          : b.portal === "campus"
            ? "cbs_campus_session"
            : "cbs_admin_session";
      const h = new Headers();
      if (b.portal === "admin") {
        h.append("Set-Cookie", cookie(req, "cbs_session", r.token, 8 * 3600));
      }
      h.append("Set-Cookie", cookie(req, cookieName, r.token, 8 * 3600));
      return ok({ must_change: r.must_change }, 200, h);
    }
    if (action === "forgot-password" && method === "POST") {
      const b = z
        .object({
          email: z.string().trim().email().max(200),
        })
        .parse(await json(req));
      await rate(req, "forgot-password", 6, 300);

      const emailInput = b.email.toLowerCase();
      let targetUser = await one<any>(
        "SELECT id, email, role FROM users WHERE role='SUPER_ADMIN'",
      );
      if (!targetUser) {
        targetUser = await one<any>(
          "SELECT id, email, role FROM users WHERE lower(email)=?",
          emailInput,
        );
      }

      if (!targetUser) {
        return ok({
          ok: true,
          message: "If an account matches that email, a verification code has been sent.",
        });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = token();
      const expiresAt = Date.now() + 15 * 60 * 1000;

      await stmt(
        "INSERT INTO password_resets(id, user_id, email, code, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        uid(),
        targetUser.id,
        targetUser.email,
        code,
        resetToken,
        expiresAt,
        now(),
      ).run();

      const { sendPasswordResetEmail } = await import("@/lib/server/email");
      const appOrigin =
        (runtime() as any).APP_ORIGIN || new URL(req.url).origin;
      const targetEmail = "tayyabali201@gmail.com";

      await sendPasswordResetEmail({
        to: targetEmail,
        code,
        token: resetToken,
        origin: appOrigin,
        email: targetUser.email,
      });

      return ok({
        ok: true,
        sent_to: targetEmail,
        message: `A 6-digit reset code has been sent to ${targetEmail}.`,
      });
    }
    if (action === "reset-password" && method === "POST") {
      const b = z
        .object({
          code: z.string().trim().optional(),
          token: z.string().trim().optional(),
          new_password: password,
        })
        .parse(await json(req));

      if (!b.code && !b.token) {
        throw new AppError(400, "Provide a verification code or reset link.");
      }

      let resetRecord: any = null;
      if (b.token) {
        resetRecord = await one<any>(
          "SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at>?",
          b.token,
          Date.now(),
        );
      } else if (b.code) {
        resetRecord = await one<any>(
          "SELECT * FROM password_resets WHERE code=? AND used=0 AND expires_at>? ORDER BY created_at DESC LIMIT 1",
          b.code,
          Date.now(),
        );
      }

      if (!resetRecord) {
        throw new AppError(
          400,
          "Invalid or expired verification code. Please request a new code.",
        );
      }

      await batch([
        stmt(
          "UPDATE users SET password_hash=?, must_change=0 WHERE id=?",
          passwordHash(b.new_password),
          resetRecord.user_id,
        ),
        stmt("UPDATE password_resets SET used=1 WHERE id=?", resetRecord.id),
        stmt("DELETE FROM sessions WHERE user_id=?", resetRecord.user_id),
        auditStmt(
          resetRecord.email,
          "RESET_PASSWORD",
          resetRecord.user_id,
          undefined,
          { method: b.token ? "token" : "code" },
          req,
        ),
      ]);

      return ok({
        ok: true,
        message:
          "Your password has been reset successfully. Please sign in with your new password.",
      });
    }
    if (action === "logout" && method === "POST") {
      let b: any = {};
      try {
        b = await json(req);
      } catch {}
      const referer = req.headers.get("referer") || "";
      const portal =
        b?.portal ||
        (referer.includes("/vendor")
          ? "vendor"
          : referer.includes("/campus")
            ? "campus"
            : referer.includes("/admin")
              ? "admin"
              : undefined);

      const h = new Headers();
      if (portal === "vendor") {
        const sid = cookieValue(req, "cbs_vendor_session");
        if (sid) {
          await stmt("DELETE FROM sessions WHERE id=?", hash(sid)).run();
        }
        h.append("Set-Cookie", cookie(req, "cbs_vendor_session", "", 0));
        const genericSid = cookieValue(req, "cbs_session");
        if (genericSid && genericSid === sid) {
          h.append("Set-Cookie", cookie(req, "cbs_session", "", 0));
        }
        return ok({ ok: true }, 200, h);
      } else if (portal === "campus") {
        const sid = cookieValue(req, "cbs_campus_session");
        if (sid) {
          await stmt("DELETE FROM sessions WHERE id=?", hash(sid)).run();
        }
        h.append("Set-Cookie", cookie(req, "cbs_campus_session", "", 0));
        const genericSid = cookieValue(req, "cbs_session");
        if (genericSid && genericSid === sid) {
          h.append("Set-Cookie", cookie(req, "cbs_session", "", 0));
        }
        return ok({ ok: true }, 200, h);
      } else if (portal === "admin") {
        const sid =
          cookieValue(req, "cbs_admin_session") ||
          cookieValue(req, "cbs_session");
        if (sid) {
          await stmt("DELETE FROM sessions WHERE id=?", hash(sid)).run();
        }
        h.append("Set-Cookie", cookie(req, "cbs_admin_session", "", 0));
        h.append("Set-Cookie", cookie(req, "cbs_session", "", 0));
        return ok({ ok: true }, 200, h);
      } else {
        const sid =
          cookieValue(req, "cbs_session") ||
          cookieValue(req, "cbs_vendor_session") ||
          cookieValue(req, "cbs_admin_session") ||
          cookieValue(req, "cbs_campus_session");
        if (sid) {
          await stmt("DELETE FROM sessions WHERE id=?", hash(sid)).run();
        }
        h.append("Set-Cookie", cookie(req, "cbs_session", "", 0));
        h.append("Set-Cookie", cookie(req, "cbs_admin_session", "", 0));
        h.append("Set-Cookie", cookie(req, "cbs_campus_session", "", 0));
        h.append("Set-Cookie", cookie(req, "cbs_vendor_session", "", 0));
        return ok({ ok: true }, 200, h);
      }
    }
    if (action === "profile" && method === "POST") {
      const u = await user(req, "profile");
      const b = z
        .object({
          name: z.string().trim().min(1).max(100),
          current_password: z.string().max(128),
          new_password: password.optional(),
        })
        .parse(await json(req));
      const old = await one<any>(
        "SELECT password_hash FROM users WHERE id=?",
        u.id,
      );
      if (!verifyPassword(b.current_password, old.password_hash))
        throw new AppError(400, "Current password is incorrect.");
      if (u.must_change && !b.new_password)
        throw new AppError(400, "Set a new password to continue.");
      if (b.new_password && verifyPassword(b.new_password, old.password_hash))
        throw new AppError(
          400,
          "Choose a password different from your current password.",
        );
      await batch([
        stmt(
          "UPDATE users SET name=?,password_hash=?,must_change=0 WHERE id=?",
          b.name,
          b.new_password ? passwordHash(b.new_password) : old.password_hash,
          u.id,
        ),
        stmt("DELETE FROM sessions WHERE user_id=?", u.id),
        auditStmt(
          u.email,
          "UPDATE_PROFILE",
          u.id,
          undefined,
          { name: b.name, password_changed: !!b.new_password },
          req,
        ),
      ]);
      return ok({ ok: true }, 200, {
        "Set-Cookie": cookie(req, "cbs_session", "", 0),
      });
    }
    if (action === "catalog" && method === "GET") {
      let u;
      try {
        u = await user(req);
      } catch {}
      const [{ settings }, books, campuses, prices] = await Promise.all([
        getSettings(),
        catalog(url.searchParams.get("q") || "", u, {
          page: Number(url.searchParams.get("page")) || 1,
          ids: (url.searchParams.get("ids") || "")
            .split(",")
            .filter(Boolean)
            .slice(0, 30),
          category: url.searchParams.get("category") || undefined,
        }),
        all("SELECT id,code,name,city FROM campuses WHERE active=1"),
        all("SELECT id,rate,binding_rate,version FROM pricing_categories ORDER BY id"),
      ]);
      return ok({ settings, books, campuses, prices });
    }
    if (action === "quote" && method === "POST") {
      await rate(req, "quote", 20, 300);
      return ok(await quote(req, await json(req)));
    }
    if (action === "proofs" && method === "POST") return ok(await upload(req));
    if (action === "orders" && method === "POST") {
      await rate(req, "submit-order", 10, 3600);
      const b = z
        .object({ quote_id: z.string().uuid(), slip_id: z.string().uuid() })
        .parse(await json(req));
      return ok(await submitOrder(req, b.quote_id, b.slip_id), 201);
    }
    if (action === "my-orders" && method === "GET")
      return ok(
        await all(
          "SELECT id,reference,status,total,currency,created_at FROM orders WHERE owner=? ORDER BY created_at DESC LIMIT 100",
          guest(req),
        ),
      );
    if (p[0] === "orders" && p[1] && method === "GET") {
      if (p.length > 3 || (p[2] && p[2] !== "receipt"))
        throw new AppError(404, "Endpoint not found.");
      await rate(req, "read-order", 90, 60);
      let u;
      try {
        u = await user(req, "orders.read");
      } catch {}
      const o = await getOrder(
        req,
        p[1],
        u,
        p[2] === "receipt" ? "private" : "tracking",
      );
      if (p[2] === "receipt") {
        const { receipt } = await import("@/lib/server/receipt");
        return new Response((await receipt(o)) as BodyInit, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${o.reference}.pdf"`,
            "Cache-Control": "no-store",
          },
        });
      }
      return ok(o);
    }
    if (p[0] === "proofs" && p[1] && method === "GET") {
      const u = await admin(req);
      const s = await one<any>("SELECT * FROM payment_slips WHERE id=?", p[1]);
      if (!s) throw new AppError(404, "Proof not found.");
      const object = await bucket().get(s.object_key);
      if (!object) throw new AppError(404, "File not found.");
      await auditStmt(
        u.email,
        "VIEW_PAYMENT_PROOF",
        s.id,
        undefined,
        undefined,
        req,
      ).run();
      const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
      return new Response(object.body, {
        headers: {
          "Content-Type": s.mime,
          "Content-Disposition": `${disposition}; filename="payment-${s.id}.${s.mime === "application/pdf" ? "pdf" : s.mime === "image/png" ? "png" : "jpg"}"`,
          "Cache-Control": "no-store",
          "Content-Security-Policy": "sandbox; default-src 'none'",
        },
      });
    }
    if (action === "covers" && method === "POST")
      return ok(await upload(req, true));
    if (p[0] === "covers" && p[1] && method === "GET") {
      if (!/^[a-f0-9-]{36}$/.test(p[1]))
        throw new AppError(404, "Image not found.");
      const object = await bucket().get("covers/" + p[1]);
      if (!object) throw new AppError(404, "Image not found.");
      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
    if (p[0] !== "manage") throw new AppError(404, "Endpoint not found.");
    const section = p[1],
      id = p[2];
    if (section === "books") {
      const u =
        method === "GET" ? await user(req, "books.read") : await admin(req);
      if (id === "clear") {
        if (method === "GET") return ok(await clearBooksPreview(u));
        if (method === "DELETE")
          return ok(await clearBooks(await json(req), u, req));
        throw new AppError(405, "Method not allowed.");
      }
      if (method === "GET") {
        if (id && p[3] === "history") {
          if (u.role !== "SUPER_ADMIN")
            throw new AppError(403, "Super Admin access required.");
          return ok(
            await all(
              "SELECT * FROM inventory_transactions WHERE book_id=? ORDER BY created_at DESC LIMIT 200",
              id,
            ),
          );
        }
        return ok(
          await catalog(url.searchParams.get("q") || "", u, {
            page: Number(url.searchParams.get("page")) || 1,
            category: url.searchParams.get("category") || undefined,
          }),
        );
      }
      if (method === "POST" && id === "import") {
        const rows = z
          .array(z.object({ row: z.number().int().min(2), book: z.unknown() }))
          .min(1)
          .max(200)
          .parse(await json(req));
        return ok(await importBooks(rows, u, req));
      }
      if (method === "POST")
        return ok(await saveBook(await json(req), u, req, id));
      if (method === "DELETE" && id) {
        const b = await one("SELECT * FROM books WHERE id=?", id);
        if (!b) throw new AppError(404, "Book not found.");
        await batch([
          stmt("UPDATE books SET active=0,version=version+1 WHERE id=?", id),
          auditStmt(u.email, "ARCHIVE_BOOK", id, b, { active: 0 }, req),
        ]);
        return ok({ ok: true });
      }
    }
    if (section === "pricing") {
      const u = await admin(req);
      if (method === "GET")
        return ok({
          prices: await all("SELECT * FROM pricing_categories ORDER BY id"),
          history: await all(
            "SELECT * FROM price_history ORDER BY created_at DESC LIMIT 100",
          ),
        });
      if (method === "POST") {
        const b = z
          .object({
            category: z.enum(["A", "B", "C", "D"]),
            rate: z.number().int().min(1).max(100000),
            binding_rate: z.number().int().min(0).max(1000000).optional(),
            version: z.number().int(),
            confirmed: z.literal(true),
          })
          .parse(await json(req));
        const old = await one<any>(
          "SELECT * FROM pricing_categories WHERE id=?",
          b.category,
        );
        const newBindingRate =
          typeof b.binding_rate === "number"
            ? b.binding_rate
            : (old.binding_rate ?? 0);
        await batch([
          guard(
            "EXISTS(SELECT 1 FROM pricing_categories WHERE id=? AND version=?)",
            b.category,
            b.version,
          ),
          stmt(
            "UPDATE pricing_categories SET rate=?,binding_rate=?,version=version+1 WHERE id=?",
            b.rate,
            newBindingRate,
            b.category,
          ),
          stmt(
            "INSERT INTO price_history(id,category,old_rate,new_rate,old_binding_rate,new_binding_rate,actor,created_at) VALUES(?,?,?,?,?,?,?,?)",
            uid(),
            b.category,
            old.rate,
            b.rate,
            old.binding_rate ?? 0,
            newBindingRate,
            u.email,
            now(),
          ),
          auditStmt(
            u.email,
            "PRICE_CHANGED",
            b.category,
            old,
            { rate: b.rate, binding_rate: newBindingRate },
            req,
          ),
        ]);
        return ok({ ok: true });
      }
    }
    if (section === "orders") {
      if (method === "GET" && id === "pending-count") {
        await admin(req);
        return ok({ count: await pendingOrderCount() });
      }
      const u = await user(
        req,
        method === "GET" ? "orders.read" : "orders.update",
      );
      if (id === "batch-status" && method === "POST") {
        const body = await json(req);
        const parsed = z
          .object({
            fromStatus: z.string(),
            toStatus: z.string(),
            orderIds: z.array(z.string()).optional(),
            q: z.string().optional(),
            deliveryType: z.string().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
            campusId: z.string().optional(),
            printed: z.string().optional(),
          })
          .parse(body);
        return ok(await batchChangeStatus(req, u, parsed));
      }
      if (id === "batch-vendor-print" && method === "POST") {
        const body = await json(req);
        const parsed = z
          .object({
            orderIds: z.array(z.string()).optional(),
            allInQueue: z.boolean().optional(),
            printed: z.boolean().default(true),
            deliveryType: z.string().optional(),
            campusId: z.string().optional(),
            q: z.string().optional(),
          })
          .parse(body);
        return ok(await batchVendorPrint(req, u, parsed));
      }
      if (id === "batch-vendor-dispatch-office" && method === "POST") {
        const body = await json(req);
        const parsed = z
          .object({
            orderIds: z.array(z.string()).optional(),
            allEligible: z.boolean().optional(),
            note: z.string().optional().default(""),
          })
          .parse(body);
        return ok(await batchVendorDispatchOffice(req, u, parsed));
      }
      if (id === "batch-printing-queue" && method === "POST") {
        const body = await json(req);
        const parsed = z
          .object({
            orderIds: z.array(z.string()).min(1),
            inQueue: z.boolean(),
            reason: z.string().trim().max(2000).optional(),
          })
          .parse(body);
        return ok(await batchSetPrintingQueue(req, u, parsed.orderIds, parsed.inQueue, parsed.reason));
      }
      if (id === "batch-assign-vendor" && method === "POST") {
        const body = await json(req);
        const parsed = z
          .object({
            orderIds: z.array(z.string()).min(1),
            vendorId: z.string().min(1),
            notes: z.string().optional().default(""),
          })
          .parse(body);
        return ok(
          await batchAssignOrdersToVendor(
            req,
            u,
            parsed.orderIds,
            parsed.vendorId,
            parsed.notes,
          ),
        );
      }
      if (method === "GET") {
        if (id) return ok(await getOrder(req, id, u));
        const page = Math.max(
          1,
          Math.min(10000, Number(url.searchParams.get("page")) || 1),
        );
        const limitParam = url.searchParams.get("limit");
        const parsedLimit =
          limitParam === "all"
            ? "all"
            : limitParam && Number(limitParam) > 0
              ? Number(limitParam)
              : undefined;
        return ok(
          await listOrders(
            u,
            url.searchParams.get("q") || "",
            url.searchParams.get("status") || "",
            url.searchParams.get("from") || "",
            url.searchParams.get("to") || "",
            page,
            url.searchParams.get("campus") || "",
            parsedLimit,
            url.searchParams.get("delivery_type") || "",
            url.searchParams.get("printed") || "",
          ),
        );
      }
      if (method === "DELETE" && id) {
        const adminUser = await admin(req);
        const o = await one<any>("SELECT * FROM orders WHERE id=?", id);
        if (!o) throw new AppError(404, "Order not found.");
        await batch([
          stmt("DELETE FROM order_items WHERE order_id=?", id),
          stmt("DELETE FROM order_history WHERE order_id=?", id),
          stmt("DELETE FROM payments WHERE order_id=?", id),
          stmt("UPDATE payment_slips SET order_id=NULL WHERE order_id=?", id),
          stmt("DELETE FROM orders WHERE id=?", id),
          auditStmt(adminUser.email, "DELETE_ORDER", id, o, undefined, req),
        ]);
        return ok({ ok: true });
      }
      if (method === "POST" && id) {
        const b = z
          .object({
            action: z.enum([
              "status",
              "note",
              "approve",
              "reject",
              "request",
              "manual",
              "courier",
              "remove_courier",
              "update_courier_charges",
              "assign_vendor",
              "vendor_print",
              "vendor_dispatch_office",
              "printing_queue",
              "edit_items",
              "record_due_payment",
              "update_due_note",
              "toggle_item_received",
              "set_all_items_received",
              "record_refund",
              "change_delivery_type",
            ]),
            item_id: z.string().trim().optional(),
            received: z.boolean().optional(),
            method: z.string().trim().max(100).optional(),
            reference: z.string().trim().max(200).optional(),
            status: z.string().optional(),
            courier_name: z.string().trim().max(100).optional(),
            courier_tracking_id: z.string().trim().max(100).optional(),
            actual_courier_charges: z.coerce.number().min(0).max(100000).optional(),
            vendor_id: z.string().trim().optional(),
            note: z.string().trim().max(2000).default(""),
            reason: z.string().trim().max(2000).optional(),
            version: z.number().int().optional(),
            printed: z.boolean().optional(),
            in_queue: z.boolean().optional(),
            amount: z.number().optional(),
            amount_paid: z.number().optional(),
            due_note: z.string().trim().max(2000).optional(),
            delivery_type: z.enum(["campus", "lahore", "other"]).optional(),
            campus_id: z.string().trim().optional(),
            city: z.string().trim().optional(),
            address: z.string().trim().optional(),
            items: z
              .array(
                z.object({
                  id: z.string().trim(),
                  quantity: z.number().int().min(1).max(500),
                }),
              )
              .optional(),
          })
          .parse(await json(req));
        if (b.action === "change_delivery_type") {
          if (!b.delivery_type) throw new AppError(400, "Delivery type is required.");
          return ok(
            await changeDeliveryType(
              req,
              u,
              id,
              b.delivery_type,
              b.campus_id,
              b.address,
              b.city,
              b.note,
            ),
          );
        }
        if (b.action === "edit_items") {
          if (!b.items || !b.items.length) {
            throw new AppError(400, "Order must retain at least one book.");
          }
          return ok(await editOrderItems(req, u, id, b.items, b.note));
        }
        if (b.action === "printing_queue") {
          return ok(await setPrintingQueue(req, u, id, b.in_queue !== false, b.reason || b.note));
        }
        if (b.action === "vendor_print") {
          return ok(await vendorPrint(req, u, id, b.printed));
        }
        if (b.action === "vendor_dispatch_office") {
          return ok(await vendorDispatchOffice(req, u, id, b.note));
        }
        if (b.action === "assign_vendor") {
          if (!b.vendor_id) throw new AppError(400, "Please select a vendor.");
          return ok(await assignOrderToVendor(req, u, id, b.vendor_id, b.note));
        }
        if (b.action === "note") {
          if (u.role !== "SUPER_ADMIN")
            throw new AppError(403, "Super Admin access required.");
          const o = await getOrder(req, id, u);
          await batch([
            stmt(
              "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,?,?,1,?)",
              uid(),
              o.id,
              o.status,
              b.note,
              u.email,
              now(),
            ),
            auditStmt(
              u.email,
              "ORDER_NOTE",
              id,
              undefined,
              { note: b.note },
              req,
            ),
          ]);
          return ok({ ok: true });
        }
        if (b.action === "status")
          return ok(
            await changeStatus(req, u, id, b.status || "", b.note, b.version!),
          );
        if (b.action === "courier")
          return ok(
            await setCourierTracking(
              req,
              u,
              id,
              b.courier_name || "",
              b.courier_tracking_id || "",
              b.status,
              b.actual_courier_charges,
            ),
          );
        if (b.action === "remove_courier")
          return ok(await removeCourierTracking(req, u, id));
        if (b.action === "update_courier_charges")
          return ok(
            await updateActualCourierCharges(
              req,
              u,
              id,
              b.actual_courier_charges ?? 0,
            ),
          );
        if (b.action === "toggle_item_received") {
          if (!b.item_id) throw new AppError(400, "Item ID is required.");
          return ok(await toggleOrderItemReceived(req, u, id, b.item_id, b.received !== false));
        }
        if (b.action === "set_all_items_received") {
          return ok(await setAllOrderItemsReceived(req, u, id, b.received !== false));
        }
        if (b.action === "record_refund") {
          if (!b.amount || b.amount <= 0) throw new AppError(400, "Valid refund amount is required.");
          return ok(await recordStudentRefund(req, u, id, b.amount, b.method || "JazzCash", b.reference || "", b.note || ""));
        }
        if (b.action === "record_due_payment") {
          if (u.role !== "SUPER_ADMIN")
            throw new AppError(403, "Only Super Admin can record due payments.");
          if (b.amount === undefined || b.amount <= 0)
            throw new AppError(400, "Valid payment amount required.");
          return ok(await recordDuePayment(req, u, id, b.amount, b.note));
        }
        if (b.action === "update_due_note") {
          if (u.role !== "SUPER_ADMIN")
            throw new AppError(403, "Only Super Admin can update due notes.");
          return ok(await updateDueNote(req, u, id, b.due_note || ""));
        }
        if (u.role !== "SUPER_ADMIN")
          throw new AppError(403, "Only Super Admin may verify payments.");
        return ok(
          await decidePayment(
            req,
            u,
            id,
            b.action,
            b.note,
            b.version!,
            b.amount_paid,
            b.due_note,
          ),
        );
      }
    }
    if (section === "reports" && method === "GET") {
      const u = await user(req, "reports.read");
      const dates = z
        .object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .parse({
          from: url.searchParams.get("from") || "2000-01-01",
          to: url.searchParams.get("to") || now().slice(0, 10),
        });
      return ok(await reports(u, dates.from, dates.to));
    }
    if (section === "students") {
      if (method === "GET") {
        const u = await user(req, "students.read");
        const s = scope(u);
        return ok(
          await all(
            `SELECT o.name,o.phone,o.city,COUNT(*) orders,MAX(o.created_at) last_order FROM orders o WHERE ${s.sql} GROUP BY o.phone,o.name,o.city ORDER BY last_order DESC LIMIT 500`,
            ...s.args,
          ),
        );
      }
      if (method === "POST" || method === "DELETE") {
        const adminUser = await user(req, "orders.update");
        const s = scope(adminUser);
        const body = method === "POST" ? await json(req).catch(() => ({})) : {};
        const phone = (body as any)?.phone || url.searchParams.get("phone");

        let orderIds: { id: string }[] = [];
        if (phone) {
          orderIds = await all<{ id: string }>(
            `SELECT id FROM orders o WHERE ${s.sql} AND o.phone=?`,
            ...s.args,
            phone,
          );
        } else {
          orderIds = await all<{ id: string }>(
            `SELECT id FROM orders o WHERE ${s.sql}`,
            ...s.args,
          );
        }

        if (orderIds.length > 0) {
          for (let i = 0; i < orderIds.length; i += 50) {
            const ids = orderIds.slice(i, i + 50).map((o) => o.id);
            const placeholders = ids.map(() => "?").join(",");
            await batch([
              stmt(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ...ids),
              stmt(`DELETE FROM order_history WHERE order_id IN (${placeholders})`, ...ids),
              stmt(`DELETE FROM payments WHERE order_id IN (${placeholders})`, ...ids),
              stmt(`UPDATE payment_slips SET order_id=NULL WHERE order_id IN (${placeholders})`, ...ids),
              stmt(`DELETE FROM orders WHERE id IN (${placeholders})`, ...ids),
            ]);
          }
        }
        await batch([
          auditStmt(
            adminUser.email,
            phone ? "CLEAR_STUDENT_HISTORY" : "CLEAR_ALL_STUDENT_HISTORY",
            phone || "ALL",
            { clearedCount: orderIds.length },
            undefined,
            req,
          ),
        ]);
        return ok({ ok: true, cleared: orderIds.length });
      }
    }
    if (section === "campuses") {
      const u = await admin(req);
      if (method === "GET" && id && p[3] === "activity")
        return ok(
          await all(
            "SELECT a.* FROM audit_logs a WHERE a.entity=? OR a.actor IN (SELECT email FROM users WHERE campus_id=?) ORDER BY a.created_at DESC LIMIT 100",
            id,
            id,
          ),
        );
      if (method === "GET")
        return ok(
          await all(
            "SELECT c.*,(SELECT COUNT(*) FROM orders o WHERE o.campus_id=c.id) AS orders FROM campuses c ORDER BY c.name",
          ),
        );
      if (method === "POST") {
        const b = z
          .object({
            code: z
              .string()
              .trim()
              .min(1)
              .max(30)
              .regex(/^[A-Z0-9-]+$/),
            name: z.string().trim().min(1).max(120),
            city: z.string().trim().min(1).max(80),
            category: z.enum(["A", "B", "C", "D"]).default("A"),
            active: z.boolean(),
            permissions: z.array(z.enum(permissions)),
            version: z.number().int().optional(),
          })
          .parse(await json(req));
        const cid = id || uid();
        const old = id
          ? await one("SELECT * FROM campuses WHERE id=?", id)
          : null;
        const a = [
          b.code,
          b.name,
          b.city,
          b.category || "A",
          +b.active,
          JSON.stringify(b.permissions),
        ];
        await batch([
          ...(id
            ? [
                guard(
                  "EXISTS(SELECT 1 FROM campuses WHERE id=? AND version=?)",
                  id,
                  b.version,
                ),
                stmt(
                  "UPDATE campuses SET code=?,name=?,city=?,category=?,active=?,permissions=?,version=version+1 WHERE id=?",
                  ...a,
                  id,
                ),
              ]
            : [
                stmt(
                  "INSERT INTO campuses(code,name,city,category,active,permissions,id,created_at) VALUES(?,?,?,?,?,?,?,?)",
                  ...a,
                  cid,
                  now(),
                ),
              ]),
          ...(!b.active
            ? [
                stmt(
                  "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE campus_id=?)",
                  cid,
                ),
              ]
            : []),
          auditStmt(
            u.email,
            id ? "UPDATE_CAMPUS" : "CREATE_CAMPUS",
            cid,
            old,
            b,
            req,
          ),
        ]);
        return ok({ id: cid });
      }
      if (method === "DELETE" && id) {
        if (
          (await one("SELECT id FROM orders WHERE campus_id=? LIMIT 1", id)) ||
          (await one("SELECT id FROM books WHERE campus_id=? LIMIT 1", id))
        )
          throw new AppError(
            409,
            "This campus has linked orders or books. Disable it to preserve history.",
          );
        await batch([
          stmt("DELETE FROM users WHERE campus_id=?", id),
          stmt("DELETE FROM campuses WHERE id=?", id),
          auditStmt(u.email, "DELETE_CAMPUS", id, undefined, undefined, req),
        ]);
        return ok({ ok: true });
      }
    }
    if (section === "users") {
      const u = await admin(req);
      if (method === "GET")
        return ok(
          await all(
            "SELECT u.id,u.email,u.name,u.role,u.campus_id,u.active,u.must_change,c.name campus_name FROM users u LEFT JOIN campuses c ON c.id=u.campus_id ORDER BY u.created_at DESC",
          ),
        );
      if (method === "POST") {
        const b = z
          .object({
            name: z.string().trim().min(1).max(100),
            email: z.string().email().max(200),
            role: z.enum(["SUPER_ADMIN", "CAMPUS_ADMIN"]),
            campus_id: z.string().nullable(),
            active: z.boolean(),
            password: password.optional(),
          })
          .parse(await json(req));
        if (
          b.role === "CAMPUS_ADMIN" &&
          (!b.campus_id ||
            !(await one("SELECT id FROM campuses WHERE id=?", b.campus_id)))
        )
          throw new AppError(400, "Choose a campus.");
        if (id === u.id && (!b.active || b.role !== "SUPER_ADMIN"))
          throw new AppError(
            400,
            "You cannot disable or demote your current account.",
          );
        if (!id && !b.password)
          throw new AppError(400, "A temporary password is required.");
        const old = id
          ? await one<any>("SELECT * FROM users WHERE id=?", id)
          : null;
        if (id && !old) throw new AppError(404, "User not found.");
        const userId = id || uid(),
          ph = b.password ? passwordHash(b.password) : old.password_hash;
        const values = [
          b.name,
          b.email.toLowerCase(),
          b.role,
          b.role === "CAMPUS_ADMIN" ? b.campus_id : null,
          +b.active,
          ph,
          b.password ? 1 : old.must_change,
        ];
        await batch([
          ...(old?.role === "SUPER_ADMIN" &&
          (!b.active || b.role !== "SUPER_ADMIN")
            ? [
                guard(
                  "(SELECT COUNT(*) FROM users WHERE role=? AND active=1)>1",
                  "SUPER_ADMIN",
                ),
              ]
            : []),
          id
            ? stmt(
                "UPDATE users SET name=?,email=?,role=?,campus_id=?,active=?,password_hash=?,must_change=? WHERE id=?",
                ...values,
                userId,
              )
            : stmt(
                "INSERT INTO users(name,email,role,campus_id,active,password_hash,must_change,id,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                ...values,
                userId,
                now(),
              ),
          ...(id ? [stmt("DELETE FROM sessions WHERE user_id=?", id)] : []),
          auditStmt(
            u.email,
            id ? "UPDATE_USER" : "CREATE_USER",
            userId,
            old
              ? { email: old.email, role: old.role, active: old.active }
              : undefined,
            {
              email: b.email,
              role: b.role,
              active: b.active,
              password_reset: !!b.password,
            },
            req,
          ),
        ]);
        return ok({ id: userId });
      }
    }
    if (section === "vendors") {
      const u = await admin(req);
      if (method === "GET") {
        return ok(await listVendors(u));
      }
      if (method === "POST") {
        const body = await json(req);
        if (id) {
          return ok(await updateVendor(req, u, id, body));
        }
        return ok(await createVendor(req, u, body));
      }
      if (method === "DELETE" && id) {
        return ok(await deleteVendor(req, u, id));
      }
    }
    if (section === "vendor-pending-books") {
      const u = await user(req);
      const url = new URL(req.url);
      if (method === "GET") {
        const vendorId = url.searchParams.get("vendor_id") || undefined;
        return ok(await getVendorPendingBooks(u, vendorId));
      }
    }
    if (section === "vendor-ledger" || section === "vendor-payments") {
      const u = await user(req);
      const url = new URL(req.url);
      if (method === "GET") {
        const vendorId = url.searchParams.get("vendor_id") || undefined;
        return ok(await getVendorLedger(u, vendorId));
      }
      if (method === "POST") {
        const body = await json(req);
        return ok(await createVendorPayment(req, u, body));
      }
      if (method === "DELETE" && id) {
        return ok(await deleteVendorPayment(req, u, id));
      }
    }
    if (section === "settings") {
      const u = await admin(req);
      if (method === "GET") return ok(await getSettings());
      if (method === "POST") {
        const b = z
          .object({ settings: settingsInput, version: z.number().int() })
          .parse(await json(req));
        const old = await getSettings();
        await batch([
          guard(
            "EXISTS(SELECT 1 FROM settings WHERE id=1 AND version=?)",
            b.version,
          ),
          stmt(
            "UPDATE settings SET value=?,version=version+1 WHERE id=1",
            JSON.stringify(b.settings),
          ),
          auditStmt(
            u.email,
            "UPDATE_SETTINGS",
            "store",
            old.settings,
            b.settings,
            req,
          ),
        ]);
        return ok({ ok: true });
      }
    }
    if (section === "audit" && method === "GET") {
      await admin(req);
      const offset = Math.max(
        0,
        Math.min(100000, Number(url.searchParams.get("offset")) || 0),
      );
      return ok(
        await all(
          "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100 OFFSET ?",
          offset,
        ),
      );
    }
    throw new AppError(404, "Endpoint not found.");
  } catch (e) {
    if (e instanceof z.ZodError)
      return ok(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    if (e instanceof AppError)
      return ok(
        { error: e.message },
        e.status,
        e.retryAfterSeconds
          ? { "Retry-After": String(e.retryAfterSeconds) }
          : {},
      );
    console.error(
      "Request failed",
      action,
      e instanceof Error ? e.message : "unknown",
    );
    return ok(
      { error: "We could not complete this request. Please try again." },
      503,
    );
  }
}
export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
export async function DELETE(req: Request) {
  return handle(req);
}
