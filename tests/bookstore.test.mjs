import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { env } from "./helpers/cloudflare-test-env.mjs";
import writeExcelFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import {
  bookSheet,
  parseBookSheet,
  BOOK_COLUMNS,
} from "../lib/book-spreadsheet.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers" || specifier === "@bookstore-runtime")
      return {
        url: new URL("./helpers/cloudflare-test-env.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    if (specifier.startsWith("@/"))
      return {
        url: new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (
      specifier.startsWith(".") &&
      context.parentURL?.includes("/lib/") &&
      !/\.[a-z]+$/.test(specifier)
    ) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(url)) return { url: url.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { catalog, saveBook, importBooks, clearBooks, clearBooksPreview } =
  await import("../lib/server/catalog.ts");
const {
  priceCart,
  quote,
  submitOrder,
  getOrder,
  decidePayment,
  changeStatus,
  pendingOrderCount,
} = await import("../lib/server/orders.ts");
const { GET, POST, DELETE } = await import("../app/api/[...path]/route.ts");
const { hash } = await import("../lib/server/security.ts");
const admin = { id: "admin", email: "qa@example.invalid", role: "SUPER_ADMIN" };
const guest = "a".repeat(64);
const request = new Request("http://127.0.0.1:5173/api/checkout", {
  headers: { cookie: "cbs_guest=" + guest },
});
const bookInput = (code = "QA101", extra = {}) => ({
  code,
  course_code: "QA",
  course_name: "Course",
  title: "Test book",
  author: "Author",
  description: "Description\nSecond line",
  pages: 100,
  category: "A",
  fixed_price: null,
  campus_id: null,
  cover: null,
  active: true,
  ...extra,
});
const cart = (id, quantity = 1) => ({
  name: "QA Student",
  phone: "03001234567",
  city: "Lahore",
  address: "Test Street",
  delivery_type: "lahore",
  campus_id: null,
  items: [{ id, quantity }],
});

function database(t) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const file of [
    "0000_modern_marrow.sql",
    "0001_swift_scream.sql",
    "0002_bizarre_thena.sql",
    "0003_clear_book_catalog.sql",
    "0004_campus_pricing_category.sql",
  ])
    sqlite.exec(
      readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8"),
    );
  env.DB = {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) {
          values = args;
          return this;
        },
        async first() {
          return sqlite.prepare(sql).get(...values) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...values) };
        },
        async run() {
          sqlite.prepare(sql).run(...values);
          return { success: true };
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  sqlite.exec(
    "INSERT INTO pricing_categories(id,rate) VALUES('A',250),('B',350),('C',500),('D',600)",
  );
  sqlite.prepare("INSERT INTO settings(id,value) VALUES(1,?)").run(
    JSON.stringify({
      store_name: "QA Bookstore",
      store_open: true,
      delivery_lahore: 10000,
      delivery_other: 20000,
      order_prefix: "QA",
      currency: "PKR",
    }),
  );
  sqlite.exec(
    "INSERT INTO users(id,email,name,password_hash,role,created_at) VALUES('admin','qa@example.invalid','QA','unused','SUPER_ADMIN','2026-01-01')",
  );
  t.after(() => sqlite.close());
  return sqlite;
}
async function order(sqlite, id, quantity = 101) {
  const q = await quote(request, cart(id, quantity));
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  return submitOrder(request, q.id, slip);
}

test("Super Admin pending badge counts all unconfirmed orders and updates after decisions", async (t) => {
  const sqlite = database(t);
  const adminSession = "notification-admin-session";
  sqlite.exec("UPDATE users SET must_change=0 WHERE id='admin'");
  sqlite
    .prepare(
      "INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",
    )
    .run(hash(adminSession), "admin", Date.now() + 60000, "2026-01-01");
  const countRequest = new Request(
    "http://127.0.0.1:5173/api/manage/orders/pending-count",
    {
      headers: { cookie: "cbs_session=" + adminSession },
    },
  );
  assert.equal((await GET(new Request(countRequest.url))).status, 401);
  assert.equal(await pendingOrderCount(), 0);
  const { id } = await saveBook(bookInput(), admin, request);
  const first = await order(sqlite, id, 1);
  const second = await order(sqlite, id, 2);
  const third = await order(sqlite, id, 3);
  sqlite
    .prepare("UPDATE orders SET created_at='2020-01-01' WHERE id=?")
    .run(first.id);
  const count = await GET(countRequest);
  assert.equal(count.status, 200);
  assert.equal(count.headers.get("cache-control"), "no-store");
  assert.equal((await count.json()).count, 3);
  await decidePayment(request, admin, first.id, "manual", "Check payment", 1);
  assert.equal(await pendingOrderCount(), 3);
  await decidePayment(
    request,
    admin,
    first.id,
    "request",
    "Clearer proof needed",
    2,
  );
  assert.equal(await pendingOrderCount(), 3);
  await decidePayment(request, admin, first.id, "approve", "Verified", 3);
  assert.equal((await (await GET(countRequest)).json()).count, 2);
  await decidePayment(request, admin, second.id, "reject", "Invalid proof", 1);
  assert.equal(await pendingOrderCount(), 1);
  await changeStatus(
    request,
    admin,
    third.id,
    "CANCELLED",
    "Requested cancellation",
    1,
  );
  assert.equal(await pendingOrderCount(), 0);
  sqlite.exec(
    "INSERT INTO campuses(id,code,name,city,permissions,created_at) VALUES('campus','QA','QA','Lahore','[\"orders.read\"]','2026-01-01')",
  );
  sqlite.exec(
    "UPDATE users SET role='CAMPUS_ADMIN',campus_id='campus' WHERE id='admin'",
  );
  assert.equal((await GET(countRequest)).status, 403);
});

test("Super Admin can permanently delete orders and order items", async (t) => {
  const sqlite = database(t);
  sqlite.exec("UPDATE users SET role='SUPER_ADMIN',must_change=0 WHERE id='admin'");
  const adminSession = "delete-order-admin-session";
  sqlite
    .prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(hash(adminSession), "admin", Date.now() + 60000, "2026-01-01");
  const { id: bookId } = await saveBook(bookInput(), admin, request);
  const newOrder = await order(sqlite, bookId, 1);
  assert.ok(sqlite.prepare("SELECT 1 FROM orders WHERE id=?").get(newOrder.id));

  const deleteRequest = new Request(
    `http://127.0.0.1:5173/api/manage/orders/${newOrder.id}`,
    {
      method: "DELETE",
      headers: {
        origin: "http://127.0.0.1:5173",
        cookie: "cbs_session=" + adminSession,
        "X-Requested-With": "CampusBookstore",
      },
    },
  );
  const res = await DELETE(deleteRequest);
  assert.equal(res.status, 200);
  assert.equal(sqlite.prepare("SELECT 1 FROM orders WHERE id=?").get(newOrder.id), undefined);
  assert.equal(sqlite.prepare("SELECT 1 FROM order_items WHERE order_id=?").get(newOrder.id), undefined);
});

test("Excel round trip keeps only code, name and pages, without copying prices", async () => {
  const books = [
    {
      ...bookInput("00101", { title: '=HYPERLINK("https://example.invalid")' }),
      price: 60000,
    },
  ];
  const buffer = await writeExcelFile(bookSheet(books), {
    sheet: "Books",
  }).toBuffer();
  assert.equal(buffer.subarray(0, 2).toString(), "PK");
  const sheet = await readSheet(buffer);
  assert.deepEqual(sheet[0], ["Book Code", "Book Name", "Pages"]);
  const rows = parseBookSheet(sheet);
  assert.equal(rows[0].row, 2);
  assert.equal(rows[0].book.code, "00101");
  assert.equal(rows[0].book.title, books[0].title);
  assert.equal(rows[0].book.category, "D");
  assert.equal(rows[0].book.fixed_price, null);
  assert.equal(rows[0].book.pages, 100);
});
test("Original price-list headers work; Prices and serial-only rows are ignored", () => {
  const rows = parseBookSheet([
    ["Sr", "Books Code", "Books Name", "Prices", "Pages"],
    [1, "CS306", "Programming Using Python", 235, 80],
    [2, "Bio102", "Basic II-Chemistry", 999, null],
    [3],
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].book.fixed_price, null);
  assert.equal(rows[0].book.pages, 80);
  assert.equal(rows[1].book.code, "BIO102");
  assert.equal(rows[1].book.pages, null);
  assert.equal(rows[1].book.active, false);
  assert.equal(rows[1].row, 3);
  assert.throws(() => parseBookSheet([["title"]]), /Missing columns/);
  assert.throws(
    () => parseBookSheet([[...BOOK_COLUMNS, "book_code"]]),
    /duplicate column/,
  );
  const duplicate = parseBookSheet([
    BOOK_COLUMNS,
    ["MTH100", "Maths", 10],
    ["mth100", "General Maths", 20],
  ]);
  assert.ok(duplicate.every((r) => r.book.import_error));
});
test("Missing page counts are drafts until completed and cannot be sold", async (t) => {
  const sqlite = database(t);
  const rows = parseBookSheet([
    BOOK_COLUMNS,
    ["DRAFT101", "Book without pages", null],
  ]);
  const result = await importBooks(rows, admin, request);
  assert.equal(result.results[0].draft, true);
  assert.equal(result.results[0].ok, true);
  const saved = sqlite
    .prepare("SELECT * FROM books WHERE code='DRAFT101'")
    .get();
  assert.equal(saved.pages, null);
  assert.equal(saved.active, 0);
  assert.equal((await catalog()).length, 0);
  assert.equal((await catalog("", admin))[0].price, null);
  await assert.rejects(priceCart(cart(saved.id)), /no longer available/);
  await assert.rejects(
    saveBook({ ...saved, active: true }, admin, request, saved.id),
    /page count/,
  );
  await saveBook(
    { ...saved, pages: 80, active: true },
    admin,
    request,
    saved.id,
  );
  assert.equal((await priceCart(cart(saved.id))).subtotal, 48000);
});
test("Import saves valid rows and reports invalid or duplicate books without overwriting", async (t) => {
  const sqlite = database(t);
  const result = await importBooks(
    [
      { row: 2, book: bookInput() },
      { row: 4, book: bookInput("BAD", { pages: 0 }) },
      { row: 5, book: bookInput() },
      { row: 6, book: bookInput("NEXT", { fixed_price: 0 }) },
    ],
    admin,
    request,
  );
  assert.deepEqual(
    result.results.map((r) => r.ok),
    [true, false, false, true],
  );
  assert.match(result.results[1].error, /pages/);
  assert.match(result.results[2].error, /already exists/);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM books").get().n, 2);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM inventory").get().n, 0);
  assert.equal(
    sqlite
      .prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='CREATE_BOOK'")
      .get().n,
    2,
  );
});
test("Every book uses Student pricing; stock rows are optional and fixed overrides remain", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  await saveBook(bookInput("FIXED", { fixed_price: 0 }), admin, request);
  assert.deepEqual(
    (await catalog()).map((b) => b.price),
    [0, 60000],
  );
  assert.equal((await priceCart(cart(id, 250))).subtotal, 15000000);
  sqlite
    .prepare("INSERT INTO inventory(book_id,stock,reserved) VALUES(?,0,0)")
    .run(id);
  assert.equal((await priceCart(cart(id, 250))).subtotal, 15000000);
  sqlite.exec("UPDATE pricing_categories SET rate=700 WHERE id='D'");
  assert.equal((await priceCart(cart(id))).subtotal, 70000);
  sqlite.exec("UPDATE pricing_categories SET rate=900 WHERE id='A'");
  assert.equal((await priceCart(cart(id))).subtotal, 70000);
  await assert.rejects(
    priceCart(cart(id, Number.MAX_SAFE_INTEGER)),
    /total is too large/,
  );
});
test("Orders above 100 units submit, approve and cancel without stock writes", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  const placed = await order(sqlite, id);
  let stored = sqlite.prepare("SELECT * FROM orders WHERE id=?").get(placed.id);
  assert.equal(stored.inventory_state, "RELEASED");
  const item = sqlite
    .prepare("SELECT * FROM order_items WHERE order_id=?")
    .get(placed.id);
  assert.equal(item.quantity, 101);
  assert.equal(item.category, "D");
  assert.equal(item.unit_price, 60000);
  await decidePayment(
    request,
    admin,
    placed.id,
    "approve",
    "Verified in QA",
    stored.version,
  );
  stored = sqlite.prepare("SELECT * FROM orders WHERE id=?").get(placed.id);
  assert.equal(stored.status, "CONFIRMED");
  await changeStatus(
    request,
    admin,
    placed.id,
    "CANCELLED",
    "QA cancellation",
    stored.version,
  );
  assert.equal(
    sqlite.prepare("SELECT status FROM orders WHERE id=?").get(placed.id)
      .status,
    "CANCELLED",
  );
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) n FROM inventory_transactions").get().n,
    0,
  );
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM inventory").get().n, 0);
});
test("Pending orders can be rejected without inventory; legacy reservations settle once", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  const placed = await order(sqlite, id, 2);
  await decidePayment(request, admin, placed.id, "reject", "QA rejection", 1);
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) n FROM inventory_transactions").get().n,
    0,
  );
  const legacy = await order(sqlite, id, 2);
  sqlite
    .prepare("UPDATE orders SET inventory_state='RESERVED' WHERE id=?")
    .run(legacy.id);
  sqlite
    .prepare("INSERT INTO inventory(book_id,stock,reserved) VALUES(?,2,2)")
    .run(id);
  await decidePayment(request, admin, legacy.id, "approve", "QA", 1);
  assert.deepEqual(
    {
      ...sqlite
        .prepare("SELECT stock,reserved FROM inventory WHERE book_id=?")
        .get(id),
    },
    { stock: 2, reserved: 0 },
  );
  await assert.rejects(
    decidePayment(request, admin, legacy.id, "approve", "QA", 1),
    /changed/,
  );
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) n FROM inventory_transactions").get().n,
    1,
  );
});
test("Student rate changes invalidate stale quotes and preserve submitted order prices", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  const placed = await order(sqlite, id, 1);
  const pendingQuote = await quote(request, cart(id));
  sqlite.exec(
    "UPDATE pricing_categories SET rate=700,version=version+1 WHERE id='D'",
  );
  await assert.rejects(
    submitOrder(request, pendingQuote.id, "unused"),
    /Prices changed/,
  );
  assert.equal(
    sqlite
      .prepare("SELECT unit_price FROM order_items WHERE order_id=?")
      .get(placed.id).unit_price,
    60000,
  );
  sqlite.prepare("UPDATE books SET active=0 WHERE id=?").run(id);
  await assert.rejects(priceCart(cart(id)), /no longer available/);
});

test("Clear catalog removes active, hidden and draft books while preserving orders and allowing code reuse", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  await saveBook(
    bookInput("DRAFT", { pages: null, active: false }),
    admin,
    request,
  );
  await saveBook(bookInput("HIDDEN", { active: false }), admin, request);
  const placed = await order(sqlite, id, 2);
  const pending = await quote(request, cart(id));
  const historicItems = sqlite.prepare("SELECT * FROM order_items").all();
  assert.equal((await clearBooksPreview(admin)).count, 3);
  assert.deepEqual(
    await clearBooks({ confirmation: "CLEAR", count: 3 }, admin, request),
    { cleared: 3 },
  );
  assert.equal((await catalog()).length, 0);
  assert.equal((await catalog("", admin)).length, 0);
  assert.equal((await catalog("", admin, { page: 2 })).length, 0);
  assert.deepEqual(
    sqlite.prepare("SELECT * FROM order_items").all(),
    historicItems,
  );
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM orders").get().n, 1);
  assert.deepEqual(sqlite.prepare("PRAGMA foreign_key_check").all(), []);
  await assert.rejects(priceCart(cart(id)), /no longer available/);
  await assert.rejects(
    submitOrder(request, pending.id, "unused"),
    /no longer available/,
  );
  await assert.rejects(
    saveBook({ ...bookInput(), version: 1 }, admin, request, id),
    /not found/,
  );
  await decidePayment(
    request,
    admin,
    placed.id,
    "approve",
    "Checked after clearing catalog",
    1,
  );
  assert.equal(
    sqlite.prepare("SELECT status FROM orders WHERE id=?").get(placed.id)
      .status,
    "CONFIRMED",
  );
  const imported = await importBooks(
    [{ row: 2, book: bookInput() }],
    admin,
    request,
  );
  assert.equal(imported.results[0].ok, true);
  assert.notEqual(imported.results[0].id, id);
  assert.equal((await catalog()).length, 1);
  assert.equal(
    sqlite
      .prepare(
        "SELECT COUNT(*) n FROM audit_logs WHERE action='CLEAR_BOOK_CATALOG'",
      )
      .get().n,
    1,
  );
});

test("Clear catalog requires an admin, typed confirmation and the reviewed whole-catalog count", async (t) => {
  const sqlite = database(t);
  await saveBook(bookInput(), admin, request);
  await assert.rejects(
    clearBooks(
      { confirmation: "CLEAR", count: 1 },
      { ...admin, role: "CAMPUS_ADMIN" },
      request,
    ),
    /Super Admin/,
  );
  await assert.rejects(
    clearBooksPreview({ ...admin, role: "CAMPUS_ADMIN" }),
    /Super Admin/,
  );
  await assert.rejects(
    clearBooks({ confirmation: "clear", count: 1 }, admin, request),
  );
  await assert.rejects(clearBooks({}, admin, request));
  await saveBook(bookInput("ADDED-LATER"), admin, request);
  await assert.rejects(
    clearBooks({ confirmation: "CLEAR", count: 1 }, admin, request),
    /list changed/,
  );
  assert.equal((await catalog("", admin)).length, 2);
  assert.equal(
    sqlite
      .prepare("SELECT COUNT(*) n FROM books WHERE deleted_at IS NOT NULL")
      .get().n,
    0,
  );
});

test("Order ID alone tracks an existing order without cookies or a key and excludes private data", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  const placed = await order(sqlite, id, 2);
  assert.equal("tracking" in placed, false);
  sqlite
    .prepare("UPDATE orders SET instructions=? WHERE id=?")
    .run("Private delivery instructions", placed.id);
  sqlite
    .prepare("UPDATE payments SET note=? WHERE order_id=?")
    .run("Private payment note", placed.id);
  sqlite
    .prepare("UPDATE order_history SET note=?,actor=? WHERE order_id=?")
    .run("Customer phone is private", "staff@example.invalid", placed.id);
  sqlite
    .prepare(
      "INSERT INTO order_history(id,order_id,status,note,actor,internal,created_at) VALUES(?,?,?,'Internal only','staff',1,'2026-10-03')",
    )
    .run(crypto.randomUUID(), placed.id, "PROCESSING");
  const publicRequest = new Request(
    "http://127.0.0.1:5173/api/orders/" + placed.reference.toLowerCase(),
  );
  const response = await GET(publicRequest);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const tracked = await response.json();
  assert.equal(tracked.reference, placed.reference);
  assert.equal(tracked.status, "PAYMENT_PENDING");
  assert.equal(tracked.tracking_only, true);
  assert.equal(tracked.total, 130000);
  assert.deepEqual(tracked.items, [
    {
      code: "QA101",
      title: "Test book",
      pages: 100,
      quantity: 2,
      unit_price: 60000,
    },
  ]);
  assert.equal(tracked.history.length, 1);
  assert.deepEqual(Object.keys(tracked.history[0]).sort(), [
    "created_at",
    "status",
  ]);
  assert.deepEqual(
    Object.keys(tracked).sort(),
    [
      "created_at",
      "currency",
      "delivery",
      "history",
      "items",
      "payment_status",
      "reference",
      "status",
      "subtotal",
      "total",
      "tracking_only",
      "updated_at",
    ].sort(),
  );
  const uuidLookup = await GET(
    new Request("http://127.0.0.1:5173/api/orders/" + placed.id),
  );
  assert.equal((await uuidLookup.json()).reference, placed.reference);
  const trimmed = await getOrder(
    publicRequest,
    "  " + placed.reference.toLowerCase() + "  ",
    undefined,
    "tracking",
  );
  assert.equal(trimmed.reference, placed.reference);
});

test("Order tracking leaves customer receipts, proofs and campus access protected", async (t) => {
  const sqlite = database(t);
  const { id } = await saveBook(bookInput(), admin, request);
  const placed = await order(sqlite, id, 1);
  const owner = await getOrder(request, placed.id);
  assert.equal(owner.tracking_only, false);
  assert.equal(owner.phone, cart(id).phone);
  assert.equal(owner.address, cart(id).address);
  assert.equal("tracking_hash" in owner, false);
  assert.equal("owner" in owner, false);
  const pdf = await GET(
    new Request(`http://127.0.0.1:5173/api/orders/${placed.id}/receipt`, {
      headers: request.headers,
    }),
  );
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  const oldKey = "b".repeat(64);
  sqlite
    .prepare("UPDATE orders SET tracking_hash=? WHERE id=?")
    .run(hash(oldKey), placed.id);
  const stranger = new Request(
    `http://127.0.0.1:5173/api/orders/${placed.reference}/receipt`,
    { headers: { "X-Order-Key": oldKey } },
  );
  assert.equal((await GET(stranger)).status, 404);
  const uploadRequest = new Request(
    `http://127.0.0.1:5173/api/proofs?order=${placed.id}`,
    {
      method: "POST",
      headers: {
        cookie: "cbs_guest=" + "c".repeat(64),
        Origin: "http://127.0.0.1:5173",
        "X-Requested-With": "CampusBookstore",
        "X-Order-Key": oldKey,
        "Content-Type": "image/png",
      },
      body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]),
    },
  );
  assert.equal((await POST(uploadRequest)).status, 404);
  const campusUser = { role: "CAMPUS_ADMIN", campus_id: "different-campus" };
  await assert.rejects(
    getOrder(stranger, placed.id, campusUser),
    /Order not found/,
  );
  assert.equal(
    (await getOrder(stranger, placed.id, campusUser, "tracking")).tracking_only,
    true,
  );
  assert.equal(
    (await GET(new Request("http://127.0.0.1:5173/api/orders/UNKNOWN-ORDER")))
      .status,
    404,
  );
  assert.equal(
    (
      await GET(
        new Request(`http://127.0.0.1:5173/api/orders/${placed.id}/unknown`),
      )
    ).status,
    404,
  );
});

test("Campus pricing category calculates prices according to assigned rate (A, B, C)", async (t) => {
  database(t);
  const { catalog } = await import("../lib/server/catalog.ts");
  const { quote } = await import("../lib/server/orders.ts");
  const { all } = await import("../lib/server/db.ts");

  // Insert a campus assigned to Category A (rate = 250 Rs/page)
  await all(
    "INSERT INTO campuses(id,code,name,city,category,permissions,created_at) VALUES('campus-cat-a','CAT-A','Campus A','Lahore','A','[\"orders.read\"]','2026-01-01')",
  );
  const bookId = crypto.randomUUID();
  await all(
    `INSERT INTO books(id,code,course_code,course_name,title,author,description,pages,category,fixed_price,campus_id,active,created_at) VALUES('${bookId}','CS100','CS100','Intro','Book 100 Pages','Author','Desc',100,'A',NULL,NULL,1,'2026-01-01')`,
  );

  // Catalog loaded for Category A (250/page => 100 pages * 250 = Rs. 250.00 = 25000 paisa)
  const booksCatA = await catalog("", undefined, { category: "A" });
  const book = booksCatA.find((b) => b.id === bookId);
  assert.equal(book?.price, 25000); // Rs. 250

  // Quote cart for campus-cat-a
  const req = new Request("http://127.0.0.1:5173/api/quotes", {
    headers: { cookie: "cbs_guest=" + "a".repeat(64) },
  });
  const q = await quote(req, {
    name: "Campus Agent",
    phone: "03001234567",
    city: "Lahore",
    address: "Campus Main Block",
    delivery_type: "campus",
    campus_id: "campus-cat-a",
    items: [{ id: bookId, quantity: 2 }],
  });

  // 2 items * 25000 = 50000 subtotal
  assert.equal(q.subtotal, 50000);
});
