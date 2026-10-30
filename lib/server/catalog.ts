import {
  all,
  one,
  stmt,
  batch,
  uid,
  now,
  auditStmt,
  AppError,
  guard,
  runtime,
} from "./db";
import {
  bookInput,
  clearBooksInput,
  type Book,
  type StoreSettings,
  type User,
  STUDENT_CATEGORY,
} from "../contracts";
// The storefront and checkout share the Student rate for every page-priced book.
export function getBookSql(category = STUDENT_CATEGORY) {
  const cat = ["A", "B", "C", "D"].includes(category) ? category : STUDENT_CATEGORY;
  return `SELECT b.*,p.rate,COALESCE(p.binding_rate,0) AS binding_rate,CASE WHEN b.fixed_price IS NOT NULL OR b.pages IS NOT NULL THEN CAST(CEIL((COALESCE(b.fixed_price,b.pages*p.rate)+COALESCE(p.binding_rate,0))/500.0)*500 AS INTEGER) ELSE NULL END AS price,c.name AS campus_name FROM books b JOIN pricing_categories p ON p.id='${cat}' LEFT JOIN campuses c ON c.id=b.campus_id`;
}
export const BOOK_SQL = getBookSql(STUDENT_CATEGORY);
export async function getSettings() {
  const r = await one<{ value: string; version: number }>(
    "SELECT value,version FROM settings WHERE id=1",
  );
  if (!r)
    throw new AppError(
      503,
      "The bookstore is being prepared. Please check back shortly.",
    );
  const raw = JSON.parse(r.value);
  const settings: StoreSettings = {
    store_name: raw.store_name || "Campus Bookstore",
    logo_url: raw.logo_url || null,
    header_tagline: raw.header_tagline || "Your one-stop shop for educational books",
    whatsapp: raw.whatsapp || "03034049973",
    support_email: raw.support_email || "Not Available",
    support_hours: raw.support_hours || "Mon – Sat: 9am – 8pm",
    distribution_center_address: raw.distribution_center_address || "Qanchi, Lahore",
    facebook_link: raw.facebook_link || "https://facebook.com/campusbookstore",
    twitter_link: raw.twitter_link || "https://twitter.com/campusbookstore",
    instagram_link: raw.instagram_link || "https://instagram.com/campusbookstore",
    linkedin_link: raw.linkedin_link || "https://linkedin.com/company/campusbookstore",
    store_open: raw.store_open !== false,
    maintenance_message: raw.maintenance_message || "We are currently conducting scheduled system maintenance. Ordering is temporarily closed. Please check back soon!",
    bank_name: raw.bank_name || "Meezan Bank",
    bank_account: raw.bank_account || "11550109645933",
    bank_iban: raw.bank_iban || "PK29MEZN0011550109645933",
    account_title: raw.account_title || "DIGITAL GROWTH HUB",
    bank_qr_url: raw.bank_qr_url || "/meezan-qr.png",
    delivery_campus: typeof raw.delivery_campus === "number" ? raw.delivery_campus : 10000,
    delivery_campus_enabled: raw.delivery_campus_enabled !== false,
    delivery_lahore: typeof raw.delivery_lahore === "number" ? raw.delivery_lahore : 50000,
    delivery_lahore_enabled: raw.delivery_lahore_enabled !== false,
    delivery_other: typeof raw.delivery_other === "number" ? raw.delivery_other : 80000,
    delivery_other_enabled: raw.delivery_other_enabled !== false,
    currency: raw.currency || "PKR",
    order_prefix: raw.order_prefix === "CBS" ? "VU" : raw.order_prefix || "VU",
    max_upload_mb: typeof raw.max_upload_mb === "number" ? raw.max_upload_mb : 5,
  };
  if (runtime().MAX_UPLOAD_MB)
    settings.max_upload_mb = Math.min(
      settings.max_upload_mb,
      Number(runtime().MAX_UPLOAD_MB),
    );
  return { settings, version: r.version };
}
export async function catalog(
  q = "",
  u?: User,
  options: { page?: number; ids?: string[]; category?: string } = {},
) {
  let where =
    u?.role === "SUPER_ADMIN"
      ? "1=1"
      : "b.active=1 AND (c.active=1 OR b.campus_id IS NULL)";
  const args: unknown[] = [];
  if (options.ids?.length) {
    where += ` AND b.id IN (${options.ids.map(() => "?").join(",")})`;
    args.push(...options.ids);
  }
  if (u?.role === "CAMPUS_ADMIN") {
    where += " AND (b.campus_id=? OR b.campus_id IS NULL)";
    args.push(u.campus_id);
  }
  if (q) {
    where +=
      " AND (b.code LIKE ? ESCAPE '\\' OR b.course_code LIKE ? ESCAPE '\\' OR b.title LIKE ? ESCAPE '\\' OR b.course_name LIKE ? ESCAPE '\\')";
    const s = "%" + q.slice(0, 120).replace(/[\\%_]/g, "\\$&") + "%";
    args.push(s, s, s, s);
  }
  const categoryId = options.category || (u?.role === "CAMPUS_ADMIN" && u?.campus_category ? u.campus_category : STUDENT_CATEGORY);
  const sql = getBookSql(categoryId);
  return all<Book>(
    `${sql} WHERE b.deleted_at IS NULL AND (${where}) ORDER BY b.code LIMIT 500 OFFSET ?`,
    ...args,
    Math.max(0, Math.min(10000, (options.page || 1) - 1)) * 500,
  );
}
export async function saveBook(
  input: unknown,
  u: User,
  req: Request,
  id?: string,
) {
  const b = bookInput.parse(input);
  const old = id
    ? await one<any>(
        "SELECT * FROM books WHERE id=? AND deleted_at IS NULL",
        id,
      )
    : null;
  if (id && !old) throw new AppError(404, "Book not found.");
  if (id && b.version === undefined)
    throw new AppError(400, "A record version is required for editing.");
  if (
    b.campus_id &&
    !(await one("SELECT id FROM campuses WHERE id=?", b.campus_id))
  )
    throw new AppError(400, "Select a valid campus.");
  const bid = id || uid();
  const args = [
    b.code,
    b.course_code,
    b.course_name,
    b.title,
    b.author,
    b.description,
    b.cover,
    b.pages,
    b.category,
    b.fixed_price,
    b.campus_id,
    +b.active,
  ];
  const statements: D1PreparedStatement[] = [];
  if (id) {
    statements.push(
      guard(
        "EXISTS(SELECT 1 FROM books WHERE id=? AND version=? AND deleted_at IS NULL)",
        id,
        b.version,
      ),
      stmt(
        "UPDATE books SET code=?,course_code=?,course_name=?,title=?,author=?,description=?,cover=?,pages=?,category=?,fixed_price=?,campus_id=?,active=?,version=version+1 WHERE id=?",
        ...args,
        bid,
      ),
    );
  } else {
    statements.push(
      stmt(
        "INSERT INTO books(code,course_code,course_name,title,author,description,cover,pages,category,fixed_price,campus_id,active,id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ...args,
        bid,
        now(),
      ),
    );
  }
  statements.push(
    auditStmt(u.email, id ? "UPDATE_BOOK" : "CREATE_BOOK", bid, old, b, req),
  );
  await batch(statements);
  return { id: bid };
}

export async function importBooks(
  rows: { row: number; book?: unknown }[],
  u: User,
  req: Request,
) {
  const results = [];
  for (const entry of rows) {
    try {
      if (
        entry.book &&
        typeof entry.book === "object" &&
        "import_error" in entry.book
      )
        throw new AppError(400, String(entry.book.import_error).slice(0, 300));
      const parsed = bookInput.safeParse(entry.book);
      if (!parsed.success)
        throw new AppError(
          400,
          parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
        );
      if (
        await one(
          "SELECT id FROM books WHERE code=? AND deleted_at IS NULL",
          parsed.data.code,
        )
      )
        throw new AppError(
          409,
          `Book code ${parsed.data.code} already exists. Use Edit book to update it.`,
        );
      results.push({
        row: entry.row,
        ...(await saveBook(parsed.data, u, req)),
        ok: true,
        draft: parsed.data.pages === null,
      });
    } catch (error) {
      results.push({
        row: entry.row,
        ok: false,
        error: error instanceof Error ? error.message : "Import failed",
      });
    }
  }
  return { results };
}

export async function clearBooksPreview(u: User) {
  if (u.role !== "SUPER_ADMIN")
    throw new AppError(403, "Super Admin access required.");
  return (await one<{ count: number }>(
    "SELECT COUNT(*) AS count FROM books WHERE deleted_at IS NULL",
  ))!;
}

export async function clearBooks(input: unknown, u: User, req: Request) {
  if (u.role !== "SUPER_ADMIN")
    throw new AppError(403, "Super Admin access required.");
  const { count } = clearBooksInput.parse(input);
  const current = await clearBooksPreview(u);
  if (current.count !== count)
    throw new AppError(
      409,
      "The book list changed. Open Clear data again to review the latest count.",
    );
  const deletedAt = now();
  // Keep referenced records for historic receipts, while removing all catalog entries.
  await batch([
    guard("(SELECT COUNT(*) FROM books WHERE deleted_at IS NULL)=?", count),
    stmt(
      "UPDATE books SET deleted_at=?,active=0,version=version+1 WHERE deleted_at IS NULL",
      deletedAt,
    ),
    auditStmt(
      u.email,
      "CLEAR_BOOK_CATALOG",
      "books",
      { count },
      { count: 0, cleared: count, deleted_at: deletedAt },
      req,
    ),
  ]);
  return { cleared: count };
}
