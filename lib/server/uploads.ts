import {
  all,
  one,
  stmt,
  uid,
  now,
  bucket,
  AppError,
  batch,
  guard,
  auditStmt,
} from "./db";
import { guest, hash, admin, rate } from "./security";
import { getSettings } from "./catalog";
import { extractAmount, compareAmount } from "./ocr";
import { getOrder } from "./orders";
export function detectMime(b: Uint8Array) {
  if (
    b.length > 8 &&
    b[0] === 137 &&
    b[1] === 80 &&
    b[2] === 78 &&
    b[3] === 71 &&
    b[4] === 13 &&
    b[5] === 10 &&
    b[6] === 26 &&
    b[7] === 10
  )
    return "image/png";
  if (b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255)
    return "image/jpeg";
  if (new TextDecoder().decode(b.slice(0, 5)) === "%PDF-")
    return "application/pdf";
  return null;
}
async function readBounded(req: Request, max: number) {
  if (Number(req.headers.get("content-length")) > max)
    throw new AppError(413, "The file is larger than the allowed limit.");
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, "Select a file to upload.");
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new AppError(413, "The file is larger than the allowed limit.");
    }
    parts.push(value);
  }
  if (size === 0) throw new AppError(400, "The file is empty.");
  const result = new Uint8Array(size);
  let i = 0;
  for (const p of parts) {
    result.set(p, i);
    i += p.length;
  }
  return result;
}
export async function upload(req: Request, cover = false) {
  const u = cover ? await admin(req) : undefined;
  await rate(req, cover ? "cover-upload" : "proof-upload", 15, 3600);
  const { settings } = await getSettings();
  const owner = cover ? u!.id : guest(req);
  const url = new URL(req.url);
  let total: number | undefined;
  let order: any;
  if (!cover) {
    if (url.searchParams.has("order")) {
      const orderParam = (url.searchParams.get("order") || "").trim();
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(orderParam)) {
        throw new AppError(404, "Order not found.");
      }
      order = await one<any>(
        "SELECT o.*, p.status AS payment_status FROM orders o JOIN payments p ON p.order_id=o.id WHERE o.id=? OR o.reference=?",
        orderParam.toLowerCase(),
        orderParam.toUpperCase(),
      );
      if (!order) {
        throw new AppError(404, "Order not found.");
      }
      const isOwner = order.owner === owner;
      const allowsUpload = isOwner
        ? ["NEW_SLIP_REQUESTED", "PENDING", "MANUAL_REVIEW"].includes(
            order.payment_status,
          )
        : order.payment_status === "NEW_SLIP_REQUESTED";

      if (!allowsUpload) {
        if (!isOwner) {
          throw new AppError(404, "Order not found.");
        }
        throw new AppError(
          409,
          "This order no longer accepts replacement proof.",
        );
      }
      if (order.status !== "PAYMENT_PENDING") {
        throw new AppError(
          409,
          "This order no longer accepts replacement proof.",
        );
      }
      total = order.total;
    } else {
      const q = await one<any>(
        "SELECT * FROM quotes WHERE id=? AND owner=? AND expires_at>?",
        url.searchParams.get("quote"),
        owner,
        Date.now(),
      );
      if (!q)
        throw new AppError(
          409,
          "Review your checkout details before uploading.",
        );
      total = JSON.parse(q.data).total;
    }
  }
  const bytes = await readBounded(req, settings.max_upload_mb * 1024 * 1024);
  const mime = detectMime(bytes);
  if (
    !mime ||
    (cover && mime === "application/pdf") ||
    mime !== req.headers.get("content-type")
  )
    throw new AppError(
      415,
      "Upload a valid JPG, PNG or PDF with the correct file type.",
    );
  const id = uid(),
    key = `${cover ? "covers" : "proofs"}/${id}`;
  const digest = hash(bytes);
  if (
    !cover &&
    (await one(
      "SELECT s.id FROM payment_slips s JOIN payments p ON p.slip_id=s.id WHERE s.digest=? AND p.status=?",
      digest,
      "VERIFIED",
    ))
  )
    throw new AppError(
      409,
      "This proof has already been used for a verified payment.",
    );
  await bucket().put(key, bytes, { httpMetadata: { contentType: mime } });
  if (cover) {
    await auditStmt(
      u!.email,
      "UPLOAD_COVER",
      id,
      undefined,
      { mime, size: bytes.length },
      req,
    ).run();
    return { url: "/api/covers/" + id };
  }
  try {
    const extraction = await extractAmount(bytes, mime);
    const result = compareAmount(extraction.amount, total!);
    const statements = [
      stmt(
        "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at,order_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        id,
        order?.owner || owner,
        key,
        mime,
        bytes.length,
        digest,
        result.status,
        extraction.amount,
        result.message,
        now(),
        order?.id || null,
      ),
    ];
    if (order) {
      statements.unshift(
        guard(
          "EXISTS(SELECT 1 FROM orders WHERE id=? AND version=? AND status=?)",
          order.id,
          order.version,
          "PAYMENT_PENDING",
        ),
      );
      statements.push(
        stmt(
          "UPDATE orders SET version=version+1,updated_at=? WHERE id=?",
          now(),
          order.id,
        ),
        stmt(
          "UPDATE payments SET slip_id=?,status=?,note=?,updated_at=? WHERE order_id=?",
          id,
          "PENDING",
          "Replacement payment proof uploaded",
          now(),
          order.id,
        ),
        stmt(
          "INSERT INTO order_history(id,order_id,status,note,actor,created_at) VALUES(?,?,?,?,?,?)",
          uid(),
          order.id,
          "PAYMENT_PENDING",
          "Replacement proof uploaded. Awaiting verification.",
          "student",
          now(),
        ),
      );
    }
    await batch(statements);
    return { id, detected_amount: extraction.amount, ...result };
  } catch (e) {
    await bucket().delete(key);
    throw e;
  }
}
