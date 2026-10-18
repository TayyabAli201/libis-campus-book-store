import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync } from "node:fs";
import { env } from "./helpers/cloudflare-test-env.mjs";
import writeExcelFile from "write-excel-file/node";
import readXlsxFile, { readSheet } from "read-excel-file/node";
import {
  bookSheet,
  parseBookSheet,
  BOOK_COLUMNS,
} from "../lib/book-spreadsheet.ts";
import {
  orderSheet,
  bookSummarySheet,
  BOOK_SUMMARY_SHEET_COLUMNS,
} from "../lib/orders-spreadsheet.ts";

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
  listOrders,
  decidePayment,
  changeStatus,
  pendingOrderCount,
  setCourierTracking,
  vendorPrint,
  vendorDispatchOffice,
  batchVendorPrint,
  batchVendorDispatchOffice,
  setPrintingQueue,
  batchSetPrintingQueue,
} = await import("../lib/server/orders.ts");
const {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  assignOrderToVendor,
} = await import("../lib/server/vendors.ts");
const {
  getVendorWhatsAppMessage,
  getVendorWhatsAppUrl,
  formatWhatsAppPhone,
  isOtherCityOrder,
} = await import("../lib/contracts.ts");
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
    "0005_password_resets.sql",
    "0006_binding_rate.sql",
    "0007_courier_tracking.sql",
    "0008_vendor_management.sql",
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
      "delivery_type",
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

test("Binding rate is added to every book price (e.g. 500 Rs fixed + 30 Rs binding = 530 Rs)", async (t) => {
  const sqlite = database(t);

  // Insert a book with fixed price of Rs. 500 (50,000 paisa)
  const { id: fixedBookId } = await saveBook(
    bookInput("FIXED500", { fixed_price: 50000, pages: 150 }),
    admin,
    request,
  );
  // Insert a book with page-priced 100 pages (at Student rate 600 paisa = 60,000 paisa)
  const { id: pageBookId } = await saveBook(
    bookInput("PAGE100", { fixed_price: null, pages: 100 }),
    admin,
    request,
  );
  // Insert a draft book (no pages, no fixed price)
  const { id: draftBookId } = await saveBook(
    bookInput("DRAFT", { fixed_price: null, pages: null, active: false }),
    admin,
    request,
  );

  // Initial check before binding rate (default 0):
  let books = await catalog("", admin);
  let fixedBook = books.find((b) => b.id === fixedBookId);
  let pageBook = books.find((b) => b.id === pageBookId);
  let draftBook = books.find((b) => b.id === draftBookId);

  assert.equal(fixedBook?.price, 50000); // 500 Rs
  assert.equal(pageBook?.price, 60000);  // 600 Rs
  assert.equal(draftBook?.price, null);   // Draft book remains null

  // Now update Student Category (D) binding rate to Rs. 30 (3000 paisa)
  sqlite.exec("UPDATE pricing_categories SET binding_rate=3000 WHERE id='D'");

  books = await catalog("", admin);
  fixedBook = books.find((b) => b.id === fixedBookId);
  pageBook = books.find((b) => b.id === pageBookId);
  draftBook = books.find((b) => b.id === draftBookId);

  // Fixed book price: 500 Rs + 30 Rs binding = 530 Rs (53000 paisa)
  assert.equal(fixedBook?.price, 53000);
  assert.equal(fixedBook?.binding_rate, 3000);

  // Page book price: 600 Rs (100 * 6) + 30 Rs binding = 630 Rs (63000 paisa)
  assert.equal(pageBook?.price, 63000);
  assert.equal(pageBook?.binding_rate, 3000);

  // Draft book remains null
  assert.equal(draftBook?.price, null);

  // priceCart verification
  const cartQuote = await priceCart(cart(fixedBookId, 1));
  assert.equal(cartQuote.subtotal, 53000);

  const catBefore = sqlite.prepare("SELECT * FROM pricing_categories WHERE id='D'").get();
  // API update of binding_rate via POST /api/manage/pricing
  const managePricingReq = new Request("http://127.0.0.1:5173/api/manage/pricing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://127.0.0.1:5173",
      "X-Requested-With": "CampusBookstore",
      cookie: "cbs_session=test_binding_session",
    },
    body: JSON.stringify({
      category: "D",
      rate: 650,
      binding_rate: 4000, // Rs. 40
      version: catBefore.version,
      confirmed: true,
    }),
  });
  sqlite.exec(
    "INSERT OR REPLACE INTO users(id,email,name,role,active,must_change,password_hash,created_at) VALUES('admin','admin@example.invalid','Admin','SUPER_ADMIN',1,0,'hash','2026-01-01')",
  );
  sqlite
    .prepare(
      "INSERT OR REPLACE INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",
    )
    .run(hash("test_binding_session"), "admin", Date.now() + 60000, "2026-01-01");

  const res = await POST(managePricingReq);
  assert.equal(res.status, 200);

  const updatedCategory = sqlite
    .prepare("SELECT * FROM pricing_categories WHERE id='D'")
    .get();
  assert.equal(updatedCategory.rate, 650);
  assert.equal(updatedCategory.binding_rate, 4000);

  const priceHistory = sqlite
    .prepare("SELECT * FROM price_history ORDER BY created_at DESC LIMIT 1")
    .get();
  assert.equal(priceHistory.category, "D");
  assert.equal(priceHistory.old_binding_rate, 3000);
  assert.equal(priceHistory.new_binding_rate, 4000);
});

test("Calculated book prices round up to the nearest multiple of Rs. 5 (e.g. 641.2 -> 645, 337 -> 340)", async (t) => {
  const sqlite = database(t);

  // Book 1: fixed price 641.20 PKR (64120 paisa)
  const { id: book641 } = await saveBook(
    bookInput("ROUND641", { fixed_price: 64120 }),
    admin,
    request,
  );
  // Book 2: fixed price 337.00 PKR (33700 paisa)
  const { id: book337 } = await saveBook(
    bookInput("ROUND337", { fixed_price: 33700 }),
    admin,
    request,
  );
  // Book 3: 123 pages with rate 2.50 PKR (250 paisa) + 30 PKR (3000 paisa) binding = 337.50 PKR
  sqlite.exec("UPDATE pricing_categories SET rate=250, binding_rate=3000 WHERE id='D'");
  const { id: bookPages } = await saveBook(
    bookInput("ROUNDPAGE", { fixed_price: null, pages: 123 }),
    admin,
    request,
  );

  // When binding is 0:
  sqlite.exec("UPDATE pricing_categories SET binding_rate=0 WHERE id='D'");
  const booksNoBinding = await catalog("", admin);
  const b1NoBinding = booksNoBinding.find((b) => b.id === book641);
  const b2NoBinding = booksNoBinding.find((b) => b.id === book337);
  assert.equal(b1NoBinding?.price, 64500); // 641.2 -> 645 PKR
  assert.equal(b2NoBinding?.price, 34000); // 337 -> 340 PKR

  // When binding is 30 PKR (3000 paisa):
  // 123 pages * 2.50 = 307.50 + 30 = 337.50 PKR -> rounds up to 340 PKR (34000 paisa)
  sqlite.exec("UPDATE pricing_categories SET binding_rate=3000 WHERE id='D'");
  const booksWithBinding = await catalog("", admin);
  const b3WithBinding = booksWithBinding.find((b) => b.id === bookPages);
  assert.equal(b3WithBinding?.price, 34000); // 337.5 -> 340 PKR
});

test("Order reference follows DDMM-XXXX format and maintains continuous sequence across days", async (t) => {
  const sqlite = database(t);
  const { id: bookId } = await saveBook(bookInput(), admin, request);

  const order1 = await order(sqlite, bookId, 1);
  assert.match(order1.reference, /^QA-\d{4}-0001$/);

  const order2 = await order(sqlite, bookId, 2);
  assert.match(order2.reference, /^QA-\d{4}-0002$/);

  // Simulate an order from yesterday or an earlier sequence
  sqlite
    .prepare("UPDATE orders SET reference='QA-1210-0042', created_at='2026-10-12T00:00:00.000Z' WHERE id=?")
    .run(order2.id);

  const order3 = await order(sqlite, bookId, 3);
  // Next sequence must continue from 0042 -> 0043 on current date, not reset to 0001
  assert.match(order3.reference, /^QA-\d{4}-0043$/);
});

test("Batch order status progression updates filtered orders across the full lifecycle", async (t) => {
  const sqlite = database(t);
  const adminSession = "batch-status-admin-session";
  sqlite.exec("UPDATE users SET must_change=0 WHERE id='admin'");
  sqlite
    .prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(hash(adminSession), "admin", Date.now() + 60000, "2026-01-01");

  const { id: bookId } = await saveBook(bookInput(), admin, request);
  const o1 = await order(sqlite, bookId, 1);
  const o2 = await order(sqlite, bookId, 2);

  // Approve both orders -> CONFIRMED
  await decidePayment(request, admin, o1.id, "approve", "Approved", 1);
  await decidePayment(request, admin, o2.id, "approve", "Approved", 1);

  const batchRequest = (body) =>
    POST(
      new Request("http://127.0.0.1:5173/api/manage/orders/batch-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "origin": "http://127.0.0.1:5173",
          cookie: "cbs_session=" + adminSession,
          "x-requested-with": "CampusBookstore",
        },
        body: JSON.stringify(body),
      }),
    );

  // 1. Advance from CONFIRMED to PROCESSING
  const resp1 = await batchRequest({ fromStatus: "CONFIRMED", toStatus: "PROCESSING" });
  const res1 = await resp1.json();
  assert.equal(resp1.status, 200);
  assert.equal(res1.count, 2);
  assert.equal(res1.status, "PROCESSING");

  const rows1 = sqlite.prepare("SELECT status FROM orders WHERE id IN (?, ?)").all(o1.id, o2.id);
  assert.deepEqual(rows1.map((r) => r.status), ["PROCESSING", "PROCESSING"]);

  // 2. Advance from PROCESSING to SHIPPED
  const res2 = await (await batchRequest({ fromStatus: "PROCESSING", toStatus: "SHIPPED" })).json();
  assert.equal(res2.count, 2);
  assert.equal(res2.status, "SHIPPED");

  // 3. Advance from SHIPPED to DELIVERED
  const res3 = await (await batchRequest({ fromStatus: "SHIPPED", toStatus: "DELIVERED" })).json();
  assert.equal(res3.count, 2);
  assert.equal(res3.status, "DELIVERED");

  const finalRows = sqlite.prepare("SELECT status FROM orders WHERE id IN (?, ?)").all(o1.id, o2.id);
  assert.deepEqual(finalRows.map((r) => r.status), ["DELIVERED", "DELIVERED"]);

  // 5. Invalid transition returns 400
  const invalidRes = await batchRequest({ fromStatus: "DELIVERED", toStatus: "CONFIRMED" });
  assert.equal(invalidRes.status, 400);
});

test("Admin manage/orders returns total_books count per order and in response aggregate", async (t) => {
  const sqlite = database(t);
  const adminSession = "total-books-admin-session";
  sqlite.exec("UPDATE users SET must_change=0 WHERE id='admin'");
  sqlite
    .prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(hash(adminSession), "admin", Date.now() + 60000, "2026-01-01");

  const { id: bookId } = await saveBook(bookInput(), admin, request);
  const o1 = await order(sqlite, bookId, 2);

  const req = new Request("http://127.0.0.1:5173/api/manage/orders", {
    headers: {
      cookie: "cbs_session=" + adminSession,
      "x-requested-with": "CampusBookstore",
    },
  });
  const res = await GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.rows));
  assert.equal(typeof data.total_books, "number");
  assert.ok(data.total_books >= 2);
  const found = data.rows.find((r) => r.id === o1.id);
  assert.ok(found);
  assert.equal(found.total_books, 2);

  // Test DateRangePicker parameters (from & to)
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateReq = new Request(
    `http://127.0.0.1:5173/api/manage/orders?from=${todayStr}&to=${todayStr}`,
    {
      headers: {
        cookie: "cbs_session=" + adminSession,
        "x-requested-with": "CampusBookstore",
      },
    },
  );
  const dateRes = await GET(dateReq);
  assert.equal(dateRes.status, 200);
  const dateData = await dateRes.json();
  assert.ok(Array.isArray(dateData.rows));

  // Past dates query should exclude newly placed order
  const pastReq = new Request(
    "http://127.0.0.1:5173/api/manage/orders?from=2020-01-01&to=2020-01-02",
    {
      headers: {
        cookie: "cbs_session=" + adminSession,
        "x-requested-with": "CampusBookstore",
      },
    },
  );
  const pastRes = await GET(pastReq);
  assert.equal(pastRes.status, 200);
  const pastData = await pastRes.json();
  assert.equal(pastData.rows.length, 0);
});

test("External courier tracking can be attached to Other City orders and tracked by Order ID and Phone Number", async (t) => {
  const sqlite = database(t);
  const adminSession = "courier-admin-session";
  sqlite.exec("UPDATE users SET must_change=0 WHERE id='admin'");
  sqlite
    .prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(hash(adminSession), "admin", Date.now() + 60000, "2026-01-01");

  const { id: bookId } = await saveBook(bookInput(), admin, request);
  const placed = await order(sqlite, bookId, 2);

  const postCourier = (orderId, body) =>
    POST(
      new Request("http://127.0.0.1:5173/api/manage/orders/" + orderId, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:5173",
          cookie: "cbs_session=" + adminSession,
          "x-requested-with": "CampusBookstore",
        },
        body: JSON.stringify(body),
      }),
    );

  // 1. Should reject courier tracking for Lahore/Campus orders
  const rejectRes = await postCourier(placed.id, {
    action: "courier",
    courier_name: "Leopards",
    courier_tracking_id: "LEO-12345",
  });
  assert.equal(rejectRes.status, 400);

  // 2. Convert to Other City order and add student phone number
  sqlite
    .prepare(
      "UPDATE orders SET delivery_type='other', city='Faisalabad', phone='03019876543' WHERE id=?",
    )
    .run(placed.id);

  // 3. Should reject courier tracking while payment verification is pending
  const rejectPendingRes = await postCourier(placed.id, {
    action: "courier",
    courier_name: "Leopards Courier",
    courier_tracking_id: "LEO-987654321",
  });
  assert.equal(rejectPendingRes.status, 400);
  const rejectPendingData = await rejectPendingRes.json();
  assert.match(rejectPendingData.error, /Payment verification is pending/);

  // 4. Approve payment so payment is verified
  await decidePayment(request, admin, placed.id, "approve", "Approved", 1);

  // 5. Attach external courier tracking after payment verification
  const attachRes = await postCourier(placed.id, {
    action: "courier",
    courier_name: "Leopards Courier",
    courier_tracking_id: "LEO-987654321",
  });
  assert.equal(attachRes.status, 200);
  const attachData = await attachRes.json();
  assert.equal(attachData.ok, true);
  assert.equal(attachData.courier_name, "Leopards Courier");
  assert.equal(attachData.courier_tracking_id, "LEO-987654321");
  assert.equal(attachData.status, "SHIPPED");

  // Verify database record
  const dbOrder = sqlite
    .prepare("SELECT status, courier_name, courier_tracking_id FROM orders WHERE id=?")
    .get(placed.id);
  assert.equal(dbOrder.status, "SHIPPED");
  assert.equal(dbOrder.courier_name, "Leopards Courier");
  assert.equal(dbOrder.courier_tracking_id, "LEO-987654321");

  // 4. Student tracking by Order ID
  const trackByIdRes = await GET(
    new Request("http://127.0.0.1:5173/api/orders/" + placed.reference),
  );
  assert.equal(trackByIdRes.status, 200);
  const trackById = await trackByIdRes.json();
  assert.equal(trackById.reference, placed.reference);
  assert.equal(trackById.status, "SHIPPED");
  assert.equal(trackById.courier_name, "Leopards Courier");
  assert.equal(trackById.courier_tracking_id, "LEO-987654321");

  const courierHistory = trackById.history.find(
    (h) => h.note && h.note.includes("Shipped via Leopards Courier"),
  );
  assert.ok(courierHistory);
  assert.equal(
    courierHistory.note,
    "Shipped via Leopards Courier - Tracking #: LEO-987654321",
  );

  // 5. Student tracking by Phone Number
  const trackByPhoneRes = await GET(
    new Request("http://127.0.0.1:5173/api/orders/03019876543"),
  );
  assert.equal(trackByPhoneRes.status, 200);
  const trackByPhone = await trackByPhoneRes.json();
  assert.equal(trackByPhone.reference, placed.reference);
  assert.equal(trackByPhone.courier_name, "Leopards Courier");
  assert.equal(trackByPhone.courier_tracking_id, "LEO-987654321");

  // 6. Admin can remove courier tracking if parcel was not dispatched yet
  const removeRes = await postCourier(placed.id, {
    action: "remove_courier",
  });
  assert.equal(removeRes.status, 200);
  const removeData = await removeRes.json();
  assert.equal(removeData.ok, true);
  assert.equal(removeData.removed, true);
  assert.equal(removeData.status, "PROCESSING");

  // Verify database record
  const dbOrderAfterRemove = sqlite
    .prepare("SELECT status, courier_name, courier_tracking_id FROM orders WHERE id=?")
    .get(placed.id);
  assert.equal(dbOrderAfterRemove.status, "PROCESSING");
  assert.equal(dbOrderAfterRemove.courier_name, null);
  assert.equal(dbOrderAfterRemove.courier_tracking_id, null);

  // 7. Student tracking lookup reflects removal
  const trackAfterRemoveRes = await GET(
    new Request("http://127.0.0.1:5173/api/orders/" + placed.reference),
  );
  assert.equal(trackAfterRemoveRes.status, 200);
  const trackAfterRemove = await trackAfterRemoveRes.json();
  assert.equal(trackAfterRemove.courier_name, undefined);
  assert.equal(trackAfterRemove.courier_tracking_id, undefined);
  assert.equal(trackAfterRemove.status, "PROCESSING");

  // 8. Other City order without tracking cannot be moved to SHIPPED
  sqlite.prepare("UPDATE orders SET delivery_type='other', city='Faisalabad' WHERE id=?").run(placed.id);
  const changeRes = await postCourier(placed.id, {
    action: "status",
    status: "SHIPPED",
    note: "Trying to dispatch without tracking",
  });
  assert.equal(changeRes.status, 400);
  const changeData = await changeRes.json();
  assert.equal(changeData.error, "Please Add Tracking Details");

  // 9. Lahore or Campus order CAN be moved to SHIPPED without courier tracking number
  sqlite.prepare("UPDATE orders SET delivery_type='lahore', city='Lahore' WHERE id=?").run(placed.id);
  const currentOrder = sqlite.prepare("SELECT version FROM orders WHERE id=?").get(placed.id);
  const lahoreChangeRes = await postCourier(placed.id, {
    action: "status",
    status: "SHIPPED",
    note: "Lahore rider dispatch",
    version: currentOrder.version,
  });
  assert.equal(lahoreChangeRes.status, 200);
});

test("Vendor Management and Auto-Push Order System workflow", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/manage/vendors");

  // 1. Create a vendor partner
  const createRes = await createVendor(testReq, admin, {
    name: "Al-Rehman Printers",
    phone: "03214567890",
    email: "alrehman@example.com",
    password: "securePassword123",
    address: "Royal Park, Urdu Bazaar, Lahore",
  });
  assert.equal(createRes.ok, true);
  assert.equal(createRes.vendor.name, "Al-Rehman Printers");
  assert.equal(createRes.vendor.email, "alrehman@example.com");

  // Verify created user account with role VENDOR
  const userRow = sqlite
    .prepare("SELECT email, role, active FROM users WHERE email=?")
    .get("alrehman@example.com");
  assert.equal(userRow.role, "VENDOR");
  assert.equal(userRow.active, 1);

  // Duplicate email rejection
  await assert.rejects(
    () =>
      createVendor(testReq, admin, {
        name: "Duplicate Press",
        phone: "03009999999",
        email: "alrehman@example.com",
        password: "anotherPassword123",
      }),
    /already exists/,
  );

  // 2. List vendors
  const vendorList = await listVendors(admin);
  assert.equal(vendorList.length, 1);
  assert.equal(vendorList[0].name, "Al-Rehman Printers");
  assert.equal(vendorList[0].assigned_orders_count, 0);

  // 3. Update vendor
  const updateRes = await updateVendor(testReq, admin, createRes.vendor.id, {
    name: "Al-Rehman Printing Press",
    phone: "03214567899",
  });
  assert.equal(updateRes.ok, true);
  const updatedVendor = sqlite
    .prepare("SELECT name, phone FROM vendors WHERE id=?")
    .get(createRes.vendor.id);
  assert.equal(updatedVendor.name, "Al-Rehman Printing Press");
  assert.equal(updatedVendor.phone, "03214567899");

  // 4. Place an Other City order and confirm payment
  const { id: bookId } = await saveBook(bookInput("VEND101", { title: "Vendor Test Book", pages: 120, active: true }), admin, request);
  const otherCart = {
    name: "Sarfraz Khan",
    phone: "03001122334",
    city: "Rawalpindi",
    address: "House 12, Satellite Town, Rawalpindi",
    delivery_type: "other",
    campus_id: null,
    items: [{ id: bookId, quantity: 2 }],
  };
  const q = await quote(request, otherCart);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);

  // Verify order in pending state, then approve payment -> CONFIRMED
  const currentOrder = await getOrder(request, placed.id, admin);
  await decidePayment(request, admin, placed.id, "approve", "Payment verified", currentOrder.version);
  const confirmedOrder = await getOrder(request, placed.id, admin);
  assert.equal(confirmedOrder.status, "CONFIRMED");

  // 5. Send order to Vendor ("assignOrderToVendor")
  const assignRes = await assignOrderToVendor(
    testReq,
    admin,
    placed.id,
    createRes.vendor.id,
    "Urgent printing required for exam",
  );
  assert.equal(assignRes.ok, true);
  assert.equal(assignRes.status, "PROCESSING");
  assert.equal(assignRes.vendor.id, createRes.vendor.id);
  assert.ok(assignRes.whatsappUrl.includes("wa.me"));

  // Check database fields
  const dbOrder = sqlite
    .prepare("SELECT status, vendor_id, vendor_notes FROM orders WHERE id=?")
    .get(placed.id);
  assert.equal(dbOrder.status, "PROCESSING");
  assert.equal(dbOrder.vendor_id, createRes.vendor.id);
  assert.equal(dbOrder.vendor_notes, "Urgent printing required for exam");

  // Verify workload count updated in listVendors
  const vendorsAfterAssign = await listVendors(admin);
  assert.equal(vendorsAfterAssign[0].assigned_orders_count, 1);
  assert.equal(vendorsAfterAssign[0].printing_orders_count, 1);

  // 6. Vendor User Context & Permissions
  const vendorUser = {
    id: createRes.vendor.user_id,
    vendor_id: createRes.vendor.id,
    email: "alrehman@example.com",
    name: "Al-Rehman Printing Press",
    role: "VENDOR",
    permissions: [],
    campus_id: null,
    must_change: 0,
  };

  // Vendor sees only their assigned orders
  const vendorOrders = await listOrders(vendorUser);
  assert.equal(vendorOrders.rows.length, 1);
  assert.equal(vendorOrders.rows[0].id, placed.id);

  // Another vendor does not see this order
  const otherVendorUser = {
    id: "other_vendor_user",
    vendor_id: "other_vendor_id",
    email: "other@example.com",
    name: "Other Press",
    role: "VENDOR",
    permissions: [],
    campus_id: null,
    must_change: 0,
  };
  const otherVendorOrders = await listOrders(otherVendorUser);
  assert.equal(otherVendorOrders.rows.length, 0);

  // 7. Other City fulfillment by Vendor: Vendor attaches Courier Name & Tracking
  const courierRes = await setCourierTracking(
    testReq,
    vendorUser,
    placed.id,
    "TCS Express",
    "TCS-77889900",
  );
  assert.equal(courierRes.ok, true);
  assert.equal(courierRes.status, "SHIPPED");

  // Tracking page lookup by student reflects courier info
  const trackRes = await GET(new Request("http://127.0.0.1:5173/api/orders/" + placed.reference));
  assert.equal(trackRes.status, 200);
  const trackData = await trackRes.json();
  assert.equal(trackData.status, "SHIPPED");
  assert.equal(trackData.courier_name, "TCS Express");
  assert.equal(trackData.courier_tracking_id, "TCS-77889900");

  // 8. Lahore / Campus protection: Vendor CANNOT attach courier tracking or mark as shipped
  // Place a Lahore order and assign to vendor
  const lahoreCart = {
    name: "Hamza Tariq",
    phone: "03112233445",
    city: "Lahore",
    address: "Model Town, Lahore",
    delivery_type: "lahore",
    campus_id: null,
    items: [{ id: bookId, quantity: 1 }],
  };
  const lahoreQ = await quote(request, lahoreCart);
  const lahoreSlip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(lahoreSlip, hash(guest), "proof/" + lahoreSlip, lahoreSlip, lahoreQ.total);
  const lahorePlaced = await submitOrder(request, lahoreQ.id, lahoreSlip);
  const lahoreOrd = await getOrder(request, lahorePlaced.id, admin);
  await decidePayment(request, admin, lahorePlaced.id, "approve", "Approved", lahoreOrd.version);
  await assignOrderToVendor(testReq, admin, lahorePlaced.id, createRes.vendor.id, "Office batch");

  // Vendor attempts to attach courier or mark Lahore order as shipped -> rejected
  await assert.rejects(
    () => setCourierTracking(testReq, vendorUser, lahorePlaced.id, "TCS", "12345"),
    /only for Other City orders/,
  );

  // 8a. Vendor Print Marking
  const printRes = await vendorPrint(testReq, vendorUser, lahorePlaced.id, true);
  assert.equal(printRes.ok, true);
  assert.ok(printRes.vendor_printed_at);
  const printedDb = sqlite.prepare("SELECT vendor_printed_at FROM orders WHERE id=?").get(lahorePlaced.id);
  assert.equal(printedDb.vendor_printed_at, printRes.vendor_printed_at);

  // Vendor unmarking printed status
  const unprintRes = await vendorPrint(testReq, vendorUser, lahorePlaced.id, false);
  assert.equal(unprintRes.ok, true);
  assert.equal(unprintRes.vendor_printed_at, null);

  // Other vendor cannot access or mark print status
  await assert.rejects(
    () => vendorPrint(testReq, otherVendorUser, lahorePlaced.id, true),
    /Order not found/,
  );
  await assert.rejects(
    () => vendorDispatchOffice(testReq, otherVendorUser, lahorePlaced.id),
    /Order not found/,
  );

  // 8b. Vendor Dispatch to Bookstore Office (Lahore & Campus orders)
  const dispatchRes = await vendorDispatchOffice(testReq, vendorUser, lahorePlaced.id, "Sent with rider");
  assert.equal(dispatchRes.ok, true);
  assert.equal(dispatchRes.status, "SHIPPED");
  assert.ok(dispatchRes.vendor_dispatched_at);
  const lahoreDispatchedDb = sqlite.prepare("SELECT status, vendor_dispatched_at FROM orders WHERE id=?").get(lahorePlaced.id);
  assert.equal(lahoreDispatchedDb.status, "SHIPPED");
  assert.equal(lahoreDispatchedDb.vendor_dispatched_at, dispatchRes.vendor_dispatched_at);

  // Other City order cannot be sent to office (must be via courier with tracking)
  await assert.rejects(
    () => vendorDispatchOffice(testReq, vendorUser, placed.id),
    /Other city orders must be dispatched via courier/,
  );

  // Admin can mark Lahore order as DELIVERED once received at Bookstore office
  const lahoreDbOrd = sqlite.prepare("SELECT version FROM orders WHERE id=?").get(lahorePlaced.id);
  const adminDeliver = await changeStatus(
    testReq,
    admin,
    lahorePlaced.id,
    "DELIVERED",
    "Delivered by Bookstore office to student",
    lahoreDbOrd.version,
  );
  assert.equal(adminDeliver.status, "DELIVERED");

  // 9. Deletion safety: Cannot delete vendor with assigned orders
  await assert.rejects(
    () => deleteVendor(testReq, admin, createRes.vendor.id),
    /Cannot delete vendor with.*assigned order/,
  );
});

test("Vendor queue decrement on print, batch printing, and Other City direct delivered flow", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/test");

  // Create Book
  const { id: bookId } = await saveBook(bookInput("VTEST-01"), admin, request);

  // Create Vendor
  const vendorRes = await createVendor(testReq, admin, {
    name: "Tahir Book Binding",
    phone: "03009988776",
    email: "tahir@example.com",
    password: "Password123!",
  });
  const vendorUser = {
    id: vendorRes.vendor.user_id,
    vendor_id: vendorRes.vendor.id,
    email: "tahir@example.com",
    name: "Tahir Book Binding",
    role: "VENDOR",
    permissions: [],
    campus_id: null,
    must_change: 0,
  };

  // Helper to place and push order to vendor
  const createAndPushOrder = async (name, city, delivery_type) => {
    const cart = {
      name,
      phone: "03211234567",
      city,
      address: `House 1, ${city}`,
      delivery_type,
      campus_id: null,
      items: [{ id: bookId, quantity: 1 }],
    };
    const q = await quote(request, cart);
    const slip = crypto.randomUUID();
    sqlite
      .prepare(
        "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
      )
      .run(slip, hash(guest), "proof/" + slip, slip, q.total);
    const placed = await submitOrder(request, q.id, slip);
    const ord = await getOrder(request, placed.id, admin);
    await decidePayment(request, admin, placed.id, "approve", "Approved", ord.version);
    await assignOrderToVendor(testReq, admin, placed.id, vendorRes.vendor.id, "Batch item");
    return placed;
  };

  const ord1 = await createAndPushOrder("Student 1", "Faisalabad", "other");
  const ord2 = await createAndPushOrder("Student 2", "Multan", "other");
  const ord3 = await createAndPushOrder("Student 3", "Lahore", "lahore");

  // Initial state: 3 orders in Printing Queue
  let vendorQueue = await listOrders(vendorUser, "", "PROCESSING");
  assert.equal(vendorQueue.status_counts["PROCESSING"], 3, "Initially 3 unprinted orders in queue");
  assert.equal(vendorQueue.status_counts["PRINTED"], 0, "Initially 0 printed orders");
  assert.equal(vendorQueue.rows.length, 3, "3 rows in queue");

  // Vendor marks 1 order as printed -> queue decrements from 3 to 2!
  await vendorPrint(testReq, vendorUser, ord1.id, true);

  vendorQueue = await listOrders(vendorUser, "", "PROCESSING");
  assert.equal(vendorQueue.status_counts["PROCESSING"], 2, "Queue count decremented to 2");
  assert.equal(vendorQueue.status_counts["PRINTED"], 1, "Printed count incremented to 1");
  assert.equal(vendorQueue.rows.length, 2, "Only 2 unprinted orders remain in queue");
  assert.equal(vendorQueue.rows.some((r) => r.id === ord1.id), false, "Marked order left the In Printing queue");

  // Printed tab shows the marked order
  const printedTab = await listOrders(vendorUser, "", "PROCESSING", "", "", 1, "", undefined, "", "1");
  assert.equal(printedTab.rows.length, 1, "1 order in Printed / Ready tab");
  assert.equal(printedTab.rows[0].id, ord1.id);

  // Batch mark remaining 2 orders as printed
  const batchPrintRes = await batchVendorPrint(testReq, vendorUser, [ord2.id, ord3.id], true);
  assert.equal(batchPrintRes.ok, true);
  assert.equal(batchPrintRes.count, 2);

  vendorQueue = await listOrders(vendorUser, "", "PROCESSING");
  assert.equal(vendorQueue.status_counts["PROCESSING"], 0, "In Printing queue is now 0");
  assert.equal(vendorQueue.status_counts["PRINTED"], 3, "All 3 orders now in Printed tab");
  assert.equal(vendorQueue.rows.length, 0, "No unprinted rows in queue");

  // Batch dispatch office for Lahore order (ord3)
  const batchDispatchRes = await batchVendorDispatchOffice(testReq, vendorUser, [ord3.id], "Office delivery");
  assert.equal(batchDispatchRes.ok, true);
  assert.equal(batchDispatchRes.count, 1);

  const ord3Db = sqlite.prepare("SELECT status, vendor_dispatched_at FROM orders WHERE id=?").get(ord3.id);
  assert.equal(ord3Db.status, "SHIPPED");
  assert.ok(ord3Db.vendor_dispatched_at);

  // Other City order (ord1): Vendor adds courier and marks directly as DELIVERED
  const courierDelivered = await setCourierTracking(
    testReq,
    vendorUser,
    ord1.id,
    "Leopards",
    "LEO-998877",
    "DELIVERED",
  );
  assert.equal(courierDelivered.ok, true);
  assert.equal(courierDelivered.status, "DELIVERED");

  const ord1Db = sqlite.prepare("SELECT status, courier_name, courier_tracking_id FROM orders WHERE id=?").get(ord1.id);
  assert.equal(ord1Db.status, "DELIVERED");
  assert.equal(ord1Db.courier_name, "Leopards");
  assert.equal(ord1Db.courier_tracking_id, "LEO-998877");

  // Vendor attaches courier tracking for ord2 -> moves to SHIPPED
  await setCourierTracking(
    testReq,
    vendorUser,
    ord2.id,
    "TCS",
    "TCS-554433",
  );
  const ord2Shipped = sqlite.prepare("SELECT status, version FROM orders WHERE id=?").get(ord2.id);
  assert.equal(ord2Shipped.status, "SHIPPED");

  // Both Admin and Vendor can mark a shipped Other City order as DELIVERED
  const adminDeliverOrd2 = await changeStatus(
    testReq,
    admin,
    ord2.id,
    "DELIVERED",
    "Admin marked as delivered",
    ord2Shipped.version,
  );
  assert.equal(adminDeliverOrd2.status, "DELIVERED");
});

test("Printing Queue Management: Add to Queue, Mark Printed, Unmark Printed, Remove from Queue, and Batch Operations", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/test");
  const adminUser = {
    id: "admin",
    name: "QA Admin",
    email: "qa@example.invalid",
    role: "SUPER_ADMIN",
    campus_id: null,
    permissions: ["orders.update", "orders.manage"],
  };

  const { id: bookId } = await saveBook(bookInput("PQTEST-01"), adminUser, request);
  const createConfirmedOrder = async (name, city, delivery_type) => {
    const cart = {
      name,
      phone: "03211234567",
      city,
      address: `House 1, ${city}`,
      delivery_type,
      campus_id: null,
      items: [{ id: bookId, quantity: 1 }],
    };
    const q = await quote(request, cart);
    const slip = crypto.randomUUID();
    const digest = crypto.randomUUID();
    sqlite
      .prepare(
        "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
      )
      .run(slip, hash(guest), "proof/" + slip, digest, q.total);
    const placed = await submitOrder(request, q.id, slip);
    const ord = await getOrder(request, placed.id, adminUser);
    await decidePayment(request, adminUser, placed.id, "approve", "Approved", ord.version);
    return placed;
  };

  const ord1 = await createConfirmedOrder("Queue Student 1", "Lahore", "campus");
  const ord2 = await createConfirmedOrder("Queue Student 2", "Rawalpindi", "other");

  // 1. Initially both orders are in CONFIRMED
  const initDb1 = sqlite.prepare("SELECT status, vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.equal(initDb1.status, "CONFIRMED");
  assert.equal(initDb1.vendor_printed_at, null);

  // 2. Add single order to Printing Queue: CONFIRMED -> PROCESSING
  const qRes1 = await setPrintingQueue(testReq, adminUser, ord1.id, true);
  assert.equal(qRes1.ok, true);
  assert.equal(qRes1.status, "PROCESSING");
  assert.equal(qRes1.in_queue, true);

  const dbAfterAdd = sqlite.prepare("SELECT status, vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.equal(dbAfterAdd.status, "PROCESSING");
  assert.equal(dbAfterAdd.vendor_printed_at, null);

  // Verify listOrders with printed="0" includes ord1
  const unprintedList = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "0");
  assert.ok(unprintedList.rows.some((r) => r.id === ord1.id), "ord1 appears in Printing Queue");

  // Verify listOrders with printed="1" does NOT include ord1
  const printedListBefore = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "1");
  assert.ok(!printedListBefore.rows.some((r) => r.id === ord1.id), "ord1 is not yet printed");

  // 3. Mark as Printed
  const printRes = await vendorPrint(testReq, adminUser, ord1.id, true);
  assert.equal(printRes.ok, true);
  assert.ok(printRes.vendor_printed_at);

  // Now ord1 is in printed list, and removed from unprinted queue
  const unprintedListAfterPrint = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "0");
  assert.ok(!unprintedListAfterPrint.rows.some((r) => r.id === ord1.id), "ord1 no longer in unprinted queue");

  const printedListAfterPrint = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "1");
  assert.ok(printedListAfterPrint.rows.some((r) => r.id === ord1.id), "ord1 appears in Printed / Ready list");

  // 4. Unmark Printed -> moves back into Printing Queue
  const unmarkPrintRes = await vendorPrint(testReq, adminUser, ord1.id, false);
  assert.equal(unmarkPrintRes.ok, true);
  assert.equal(unmarkPrintRes.vendor_printed_at, null);

  const unprintedListAfterUnmark = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "0");
  assert.ok(unprintedListAfterUnmark.rows.some((r) => r.id === ord1.id), "ord1 is back in unprinted queue");

  // 5. Remove from Printing Queue: reverts PROCESSING -> CONFIRMED
  const removeQRes = await setPrintingQueue(testReq, adminUser, ord1.id, false);
  assert.equal(removeQRes.ok, true);
  assert.equal(removeQRes.status, "CONFIRMED");
  assert.equal(removeQRes.in_queue, false);

  const dbAfterRemove = sqlite.prepare("SELECT status, vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.equal(dbAfterRemove.status, "CONFIRMED");
  assert.equal(dbAfterRemove.vendor_printed_at, null);

  // 6. Batch operations: Add ord1 and ord2 to Printing Queue
  const batchAddRes = await batchSetPrintingQueue(testReq, adminUser, [ord1.id, ord2.id], true);
  assert.equal(batchAddRes.ok, true);
  assert.equal(batchAddRes.count, 2);

  const dbBatch1 = sqlite.prepare("SELECT status FROM orders WHERE id=?").get(ord1.id);
  const dbBatch2 = sqlite.prepare("SELECT status FROM orders WHERE id=?").get(ord2.id);
  assert.equal(dbBatch1.status, "PROCESSING");
  assert.equal(dbBatch2.status, "PROCESSING");

  // Batch remove from Printing Queue
  const batchRemoveRes = await batchSetPrintingQueue(testReq, adminUser, [ord1.id, ord2.id], false);
  assert.equal(batchRemoveRes.ok, true);
  assert.equal(batchRemoveRes.count, 2);

  const dbBatchRemove1 = sqlite.prepare("SELECT status FROM orders WHERE id=?").get(ord1.id);
  const dbBatchRemove2 = sqlite.prepare("SELECT status FROM orders WHERE id=?").get(ord2.id);
  assert.equal(dbBatchRemove1.status, "CONFIRMED");
  assert.equal(dbBatchRemove2.status, "CONFIRMED");
});

test("Order Export: generates Sheet 1 (detailed orders) and Sheet 2 (consolidated book quantity summary) for Qanchi Campus & Lahore", async () => {
  const sampleOrders = [
    {
      reference: "QA-0101-0001",
      name: "Ali Raza",
      phone: "03001234567",
      address: "VU Qanchi Campus",
      city: "Lahore",
      items: [
        { code: "CS101", title: "Introduction to Computing", quantity: 5 },
        { code: "BIF401", title: "Bioinformatics 1", quantity: 2 },
      ],
    },
    {
      reference: "QA-0101-0002",
      name: "Fatima Noor",
      phone: "03007654321",
      address: "Model Town",
      city: "Lahore",
      items: [
        { code: "CS101", title: "Introduction to Computing", quantity: 5 },
        { code: "BIF501", title: "Bioinformatics 2", quantity: 3 },
      ],
    },
    {
      reference: "QA-0101-0003",
      name: "Usman Tariq",
      phone: "03219876543",
      address: "Gulberg III",
      city: "Lahore",
      items: [
        { code: "ACC501", title: "Business Finance", quantity: 10 },
        { code: "ACC311", title: "Fundamentals of Auditing", quantity: 6 },
      ],
    },
  ];

  // 1. Verify Sheet 1 (detailed orders) structure and totals
  const s1Data = orderSheet(sampleOrders);
  // Header row has 7 columns (without address/mobile by default)
  assert.equal(s1Data[0][0].value, "Sr No");
  assert.equal(s1Data[0][1].value, "Order Number");
  assert.equal(s1Data[0][2].value, "Student Name");
  assert.equal(s1Data[0][3].value, "Book Code");
  assert.equal(s1Data[0][4].value, "Book Name");
  assert.equal(s1Data[0][5].value, "Quantity");
  assert.equal(s1Data[0][6].value, "Total Books");

  // Grand total in Sheet 1: 5 + 2 + 5 + 3 + 10 + 6 = 31
  const s1Footer = s1Data[s1Data.length - 1];
  assert.equal(s1Footer[5].value, "(Total Books: 31)");

  // 2. Verify Sheet 2 (consolidated book summary) aggregation, sorting, and styling
  const s2Data = bookSummarySheet(sampleOrders);
  // Header row has 4 columns: Sr No, Book Code, Book Name, Quantity
  assert.deepEqual(
    s2Data[0].map((c) => c.value),
    ["Sr No", "Book Code", "Book Name", "Quantity"]
  );

  // Aggregated rows should be sorted by Book Code:
  // 1. ACC311 -> 6
  // 2. ACC501 -> 10
  // 3. BIF401 -> 2
  // 4. BIF501 -> 3
  // 5. CS101  -> 10 (5 from Order 1 + 5 from Order 2 aggregated!)
  const dataRows = s2Data.slice(1, -1);
  assert.equal(dataRows.length, 5);

  assert.equal(dataRows[0][0].value, 1);
  assert.equal(dataRows[0][1].value, "ACC311");
  assert.equal(dataRows[0][2].value, "Fundamentals of Auditing");
  assert.equal(dataRows[0][3].value, 6);

  assert.equal(dataRows[1][0].value, 2);
  assert.equal(dataRows[1][1].value, "ACC501");
  assert.equal(dataRows[1][2].value, "Business Finance");
  assert.equal(dataRows[1][3].value, 10);

  assert.equal(dataRows[2][0].value, 3);
  assert.equal(dataRows[2][1].value, "BIF401");
  assert.equal(dataRows[2][2].value, "Bioinformatics 1");
  assert.equal(dataRows[2][3].value, 2);

  assert.equal(dataRows[3][0].value, 4);
  assert.equal(dataRows[3][1].value, "BIF501");
  assert.equal(dataRows[3][2].value, "Bioinformatics 2");
  assert.equal(dataRows[3][3].value, 3);

  assert.equal(dataRows[4][0].value, 5);
  assert.equal(dataRows[4][1].value, "CS101");
  assert.equal(dataRows[4][2].value, "Introduction to Computing");
  assert.equal(dataRows[4][3].value, 10, "CS101 aggregated count should be 5 + 5 = 10");

  // Footer row: 4 cells [null, null, (Total Books: 31), null]
  const s2Footer = s2Data[s2Data.length - 1];
  assert.equal(s2Footer[0], null);
  assert.equal(s2Footer[1], null);
  assert.equal(s2Footer[2].value, "(Total Books: 31)");
  assert.equal(s2Footer[2].columnSpan, 2);
  assert.equal(s2Footer[3], null);

  // 3. Verify multi-sheet Excel generation and reading
  const orderColumns = [
    { width: 10 },
    { width: 24 },
    { width: 26 },
    { width: 16 },
    { width: 46 },
    { width: 12 },
    { width: 14 },
  ];

  const buffer = await writeExcelFile([
    {
      sheet: "Qanchi Campus Lahore",
      data: s1Data,
      columns: orderColumns,
      stickyRowsCount: 1,
    },
    {
      sheet: "Books Summary",
      data: s2Data,
      columns: BOOK_SUMMARY_SHEET_COLUMNS,
      stickyRowsCount: 1,
    },
  ]).toBuffer();

  assert.equal(buffer.subarray(0, 2).toString(), "PK");

  // Read all sheets using readXlsxFile from read-excel-file
  const sheets = await readXlsxFile(buffer);
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0].sheet, "Qanchi Campus Lahore");
  assert.equal(sheets[1].sheet, "Books Summary");

  // Verify Sheet 2 contents from parsed Excel
  const s2ReadRows = sheets[1].data;
  assert.deepEqual(s2ReadRows[0], ["Sr No", "Book Code", "Book Name", "Quantity"]);
  assert.deepEqual(s2ReadRows[1], [1, "ACC311", "Fundamentals of Auditing", 6]);
  assert.deepEqual(s2ReadRows[5], [5, "CS101", "Introduction to Computing", 10]);
  assert.deepEqual(s2ReadRows[6], [null, null, "(Total Books: 31)", null]);

  // 4. Verify Other City standalone export contains only 1 sheet (no summary sheet)
  const otherCityBuffer = await writeExcelFile(orderSheet(sampleOrders, { includeAddress: true }), {
    sheet: "Other City",
    columns: orderColumns,
  }).toBuffer();
  const otherCitySheets = await readSheet(otherCityBuffer);
  // Returns single sheet rows directly
  assert.equal(otherCitySheets[0][0], "Sr No");
  assert.equal(otherCitySheets[0][1], "Order Number");
});









