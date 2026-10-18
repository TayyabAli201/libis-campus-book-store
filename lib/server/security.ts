import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import {
  all,
  one,
  stmt,
  now,
  uid,
  AppError,
  runtime,
  batch,
  auditStmt,
} from "./db";
import type { User } from "../contracts";
export const hash = (s: string | Uint8Array) =>
  createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$3$${salt}$${scryptSync(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  try {
    const [, N, r, p, salt, key] = encoded.split("$");
    const actual = scryptSync(password, salt, 32, {
      N: +N,
      r: +r,
      p: +p,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(actual, Buffer.from(key, "hex"));
  } catch {
    return false;
  }
}
export const cookieValue = (req: Request, name: string) =>
  req.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="))
    ?.slice(name.length + 1) || "";
export function cookie(req: Request, name: string, value: string, age: number) {
  const secure = runtime().VERCEL || new URL(req.url).protocol === "https:";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;
}
export function csrf(req: Request) {
  const origin = req.headers.get("origin");
  // Next.js may construct an internal request URL behind the hosting proxy.
  // Accept only the request origin and server-configured public origins.
  const config = runtime();
  const allowed = new Set([new URL(req.url).origin]);
  if (typeof config.APP_ORIGIN === "string" && config.APP_ORIGIN)
    allowed.add(new URL(config.APP_ORIGIN).origin);
  if (config.VERCEL && typeof config.VERCEL_URL === "string")
    allowed.add(`https://${config.VERCEL_URL}`);
  if (
    !origin ||
    !allowed.has(origin) ||
    req.headers.get("x-requested-with") !== "CampusBookstore"
  )
    throw new AppError(
      403,
      "Request origin could not be verified. Reload the page.",
    );
}
export async function rate(
  req: Request,
  group: string,
  limit = 30,
  seconds = 60,
  key = "",
) {
  const ip =
    (runtime().VERCEL
      ? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : req.headers.get("cf-connecting-ip")) || "local";
  const timestamp = Math.floor(Date.now() / 1000);
  const window = Math.floor(timestamp / seconds);
  const id = hash(`${group}:${key || ip}:${window}`);
  const row = await one<{ count: number }>(
    "INSERT INTO rate_limits(id,count,expires_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count",
    id,
    (window + 1) * seconds,
  );
  if (row!.count > limit) {
    const retryAfter = (window + 1) * seconds - timestamp;
    const minutes = Math.ceil(retryAfter / 60);
    throw new AppError(
      429,
      `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      retryAfter,
    );
  }
  return id;
}
export async function user(
  req: Request,
  permission?: string,
  portalHint?: "admin" | "campus" | "vendor",
): Promise<User> {
  const adminSid = cookieValue(req, "cbs_admin_session");
  const campusSid = cookieValue(req, "cbs_campus_session");
  const vendorSid = cookieValue(req, "cbs_vendor_session");
  const genericSid = cookieValue(req, "cbs_session");

  const urlPath = req.url ? new URL(req.url, "http://localhost").pathname : "";
  const referer = req.headers.get("referer") || "";

  const isAdminContext =
    portalHint === "admin" ||
    urlPath.startsWith("/admin") ||
    referer.includes("/admin");

  const isCampusContext =
    portalHint === "campus" ||
    urlPath.startsWith("/campus") ||
    referer.includes("/campus");

  const isVendorContext =
    portalHint === "vendor" ||
    urlPath.startsWith("/vendor") ||
    referer.includes("/vendor");

  let candidateSids: string[] = [];

  if (isAdminContext) {
    candidateSids = [adminSid, genericSid].filter(Boolean);
  } else if (isCampusContext) {
    candidateSids = [campusSid, genericSid].filter(Boolean);
  } else if (isVendorContext) {
    candidateSids = [vendorSid, genericSid].filter(Boolean);
  } else {
    candidateSids = [adminSid, vendorSid, genericSid, campusSid].filter(Boolean);
  }

  candidateSids = Array.from(new Set(candidateSids));
  if (candidateSids.length === 0) {
    candidateSids = Array.from(
      new Set([adminSid, vendorSid, genericSid, campusSid].filter(Boolean)),
    );
  }
  if (candidateSids.length === 0) {
    throw new AppError(401, "Please sign in to continue.");
  }

  let foundUser: any = null;
  for (const sid of candidateSids) {
    const row = await one<any>(
      `SELECT u.id,u.email,u.name,u.role,u.campus_id,c.name AS campus_name,c.code AS campus_code,c.category AS campus_category,u.must_change,c.permissions,c.active AS campus_active,v.id AS vendor_id,v.name AS vendor_name,v.phone AS vendor_phone,v.active AS vendor_active FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN campuses c ON c.id=u.campus_id LEFT JOIN vendors v ON v.user_id=u.id WHERE s.id=? AND s.expires_at>? AND u.active=1`,
      hash(sid),
      Date.now(),
    );
    if (!row || (row.role === "CAMPUS_ADMIN" && !row.campus_active) || (row.role === "VENDOR" && !row.vendor_active)) {
      continue;
    }
    if (isAdminContext) {
      if (row.role === "SUPER_ADMIN") {
        foundUser = row;
        break;
      }
      if (!foundUser) foundUser = row;
      continue;
    }
    if (isCampusContext) {
      if (row.role === "CAMPUS_ADMIN") {
        foundUser = row;
        break;
      }
      if (!foundUser) foundUser = row;
      continue;
    }
    if (isVendorContext) {
      if (row.role === "VENDOR") {
        foundUser = row;
        break;
      }
      if (!foundUser) foundUser = row;
      continue;
    }
    if (row.role === "SUPER_ADMIN") {
      foundUser = row;
      break;
    }
    if (!foundUser) {
      foundUser = row;
    }
  }

  if (!foundUser) {
    throw new AppError(401, "Please sign in to continue.");
  }

  foundUser.permissions = JSON.parse(foundUser.permissions || "[]");
  if (foundUser.must_change && permission !== "profile") {
    throw new AppError(
      428,
      "Change your temporary password before continuing.",
    );
  }
  if (foundUser.role === "VENDOR") {
    // Vendors have orders.read and orders.update permission on their scoped orders
    if (permission && permission !== "profile" && permission !== "orders.read" && permission !== "orders.update") {
      throw new AppError(403, "Your role does not have access to this action.");
    }
  } else if (
    permission &&
    permission !== "profile" &&
    foundUser.role !== "SUPER_ADMIN" &&
    !foundUser.permissions.includes(permission)
  ) {
    throw new AppError(403, "Your role does not have access to this action.");
  }
  return foundUser;
}
export async function admin(req: Request) {
  const u = await user(req, undefined, "admin");
  if (u.role !== "SUPER_ADMIN")
    throw new AppError(403, "Super Admin access is required.");
  return u;
}
export async function vendor(req: Request) {
  const u = await user(req, undefined, "vendor");
  if (u.role !== "VENDOR")
    throw new AppError(403, "Vendor access is required.");
  return u;
}
export function scope(u: User, alias = "o") {
  if (u.role === "SUPER_ADMIN") return { sql: "1=1", args: [] };
  if (u.role === "CAMPUS_ADMIN") return { sql: `${alias}.campus_id=?`, args: [u.campus_id] };
  if (u.role === "VENDOR") return { sql: `${alias}.vendor_id=?`, args: [u.vendor_id || u.id] };
  return { sql: "1=0", args: [] };
}
export function guest(req: Request) {
  const t = cookieValue(req, "cbs_guest");
  if (!/^[a-f0-9]{64}$/.test(t))
    throw new AppError(401, "Refresh the page to start a secure checkout.");
  return hash(t);
}
export async function authenticate(
  req: Request,
  email: string,
  password: string,
  portal: string,
) {
  email = email.trim().toLowerCase();
  // Keep a network-level burst cap, while the account budget tracks unsuccessful
  // attempts. Successful sign-ins release their account's budget below.
  await rate(req, "login-requests", 60, 60);
  const accountLimit = await rate(req, "login-email", 8, 900, email);
  const row = await one<any>(
    "SELECT * FROM users WHERE email=?",
    email.toLowerCase(),
  );
  const dummy =
    "scrypt$32768$8$3$0123456789abcdef0123456789abcdef$" + "00".repeat(32);
  const valid = verifyPassword(password, row?.password_hash || dummy);
  if (
    !valid ||
    !row?.active ||
    (portal === "admin" && row.role !== "SUPER_ADMIN") ||
    (portal === "campus" && row.role !== "CAMPUS_ADMIN") ||
    (portal === "vendor" && row.role !== "VENDOR")
  )
    throw new AppError(401, "The email or password is incorrect.");
  if (
    row.campus_id &&
    !(await one<any>("SELECT active FROM campuses WHERE id=?", row.campus_id))
      ?.active
  )
    throw new AppError(403, "Campus access is disabled.");
  if (
    row.role === "VENDOR" &&
    !(await one<any>("SELECT active FROM vendors WHERE user_id=?", row.id))
      ?.active
  )
    throw new AppError(403, "Vendor access is disabled.");
  const t = token();
  await batch([
    stmt("DELETE FROM rate_limits WHERE id=?", accountLimit),
    stmt("DELETE FROM sessions WHERE expires_at<?", Date.now()),
    stmt(
      "INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",
      hash(t),
      row.id,
      Date.now() + 8 * 3600000,
      now(),
    ),
    auditStmt(row.email, "LOGIN", row.id, undefined, { portal }, req),
  ]);
  return { token: t, must_change: row.must_change };
}
