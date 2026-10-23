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
const { catalog, saveBook, importBooks, clearBooks, clearBooksPreview, getSettings } =
  await import("../lib/server/catalog.ts");
const { upload } = await import("../lib/server/uploads.ts");
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
  removeCourierTracking,
  updateActualCourierCharges,
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
} = await import("../lib/server/orders.ts");
const {
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
} = await import("../lib/server/vendors.ts");
const {
  getVendorWhatsAppMessage,
  getVendorWhatsAppUrl,
  getOrderWhatsAppMessage,
  formatWhatsAppPhone,
  isOtherCityOrder,
  getStudentRefundWhatsAppMessage,
  getStudentRefundWhatsAppUrl,
  getVendorPendingBooksWhatsAppMessage,
  getVendorPendingBooksWhatsAppUrl,
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
    "0009_vendor_ledger.sql",
    "0010_due_payments.sql",
    "0011_actual_courier_charges.sql",
    "0012_item_received_and_refunds.sql",
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

test("Vendor Printing Rules: Admin assigns vendor -> defaults to Printing Queue; Admin cannot mark print; Vendor marks/unmarks print and batch prints", async (t) => {
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

  // 1. Create a vendor partner
  const vRes = await createVendor(testReq, adminUser, {
    name: "Test Printing Press",
    phone: "03001122334",
    email: "testpress@example.com",
    password: "Password123!",
  });
  const vendorUser = {
    id: vRes.vendor.user_id,
    name: vRes.vendor.name,
    email: vRes.vendor.email,
    role: "VENDOR",
    vendor_id: vRes.vendor.id,
    campus_id: null,
    permissions: ["orders.read"],
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
  const ord2 = await createConfirmedOrder("Queue Student 2", "Lahore", "lahore");

  // 2. Initially both orders are in CONFIRMED without vendor
  const initDb1 = sqlite.prepare("SELECT status, vendor_id, vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.equal(initDb1.status, "CONFIRMED");
  assert.equal(initDb1.vendor_id, null);
  assert.equal(initDb1.vendor_printed_at, null);

  // 3. Super Admin assigns order to vendor -> defaults to PROCESSING (Printing Queue) with vendor_printed_at = null
  const assignRes = await assignOrderToVendor(testReq, adminUser, ord1.id, vRes.vendor.id, "Urgent print");
  assert.equal(assignRes.ok, true);
  assert.equal(assignRes.status, "PROCESSING");

  const dbAfterAssign = sqlite.prepare("SELECT status, vendor_id, vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.equal(dbAfterAssign.status, "PROCESSING");
  assert.equal(dbAfterAssign.vendor_id, vRes.vendor.id);
  assert.equal(dbAfterAssign.vendor_printed_at, null, "Vendor printed status is null by default in printing queue");

    // 4. Customer CANNOT mark order as printed, but Super Admin CAN mark order as printed
  const custUser = {
    id: "cust-test",
    name: "Customer",
    email: "customer@example.invalid",
    role: "CUSTOMER",
    vendor_id: null,
    campus_id: null,
    permissions: [],
  };
  await assert.rejects(
    () => vendorPrint(testReq, custUser, ord1.id, true),
    /Permission denied to update print status/
  );
  await assert.rejects(
    () => batchVendorPrint(testReq, custUser, [ord1.id], true),
    /Permission denied for batch print marking/
  );

  // Super Admin CAN mark order as printed
  const adminPrintRes = await vendorPrint(testReq, adminUser, ord1.id, true);
  assert.equal(adminPrintRes.ok, true);
  const adminBatchPrintRes = await batchVendorPrint(testReq, adminUser, [ord1.id], true);
  assert.equal(adminBatchPrintRes.ok, true);
  // Revert back for subsequent vendor test steps
  await vendorPrint(testReq, adminUser, ord1.id, false);

  // 5. Vendor CAN mark order as printed
  const printRes = await vendorPrint(testReq, vendorUser, ord1.id, true);
  assert.equal(printRes.ok, true);
  assert.ok(printRes.vendor_printed_at);

  const dbAfterPrint = sqlite.prepare("SELECT vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.ok(dbAfterPrint.vendor_printed_at);

  // 6. Super Admin can see order in listOrders printed / ready list
  const printedList = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "1");
  assert.ok(printedList.rows.some((r) => r.id === ord1.id), "ord1 appears in Printed / Ready list for Super Admin");

  // 7. Vendor can unmark printed status (moves order back into vendor printing queue)
  const unprintRes = await vendorPrint(testReq, vendorUser, ord1.id, false);
  assert.equal(unprintRes.ok, true);
  assert.equal(unprintRes.vendor_printed_at, null);

  const dbAfterUnprint = sqlite.prepare("SELECT vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  assert.equal(dbAfterUnprint.vendor_printed_at, null);

  const unprintedList = await listOrders(adminUser, "", "PROCESSING", "", "", 1, "", 15, "", "0");
  assert.ok(unprintedList.rows.some((r) => r.id === ord1.id), "ord1 is back in Printing Queue for Super Admin");

  // 8. Assign ord2 and batch mark both as printed by vendor
  await assignOrderToVendor(testReq, adminUser, ord2.id, vRes.vendor.id, "Batch order");
  const batchRes = await batchVendorPrint(testReq, vendorUser, [ord1.id, ord2.id], true);
  assert.equal(batchRes.ok, true);
  assert.equal(batchRes.count, 2);

  const dbBatch1 = sqlite.prepare("SELECT vendor_printed_at FROM orders WHERE id=?").get(ord1.id);
  const dbBatch2 = sqlite.prepare("SELECT vendor_printed_at FROM orders WHERE id=?").get(ord2.id);
  assert.ok(dbBatch1.vendor_printed_at);
  assert.ok(dbBatch2.vendor_printed_at);

  // 9. Test Mark All Printed with allInQueue: true in 1 click
  const unmarkAllRes = await batchVendorPrint(testReq, vendorUser, { allInQueue: true, printed: false });
  assert.equal(unmarkAllRes.ok, true);
  assert.equal(unmarkAllRes.count >= 2, true);

  const markAllRes = await batchVendorPrint(testReq, vendorUser, { allInQueue: true, printed: true });
  assert.equal(markAllRes.ok, true);
  assert.equal(markAllRes.count >= 2, true);

  // 10. Test "Send All to Qanchi Campus" with allEligible: true in 1 click across all pages
  const dispatchAllRes = await batchVendorDispatchOffice(testReq, vendorUser, { allEligible: true });
  assert.equal(dispatchAllRes.ok, true);
  assert.equal(dispatchAllRes.count >= 2, true);

  const dbDispatched1 = sqlite.prepare("SELECT status, vendor_dispatched_at FROM orders WHERE id=?").get(ord1.id);
  const dbDispatched2 = sqlite.prepare("SELECT status, vendor_dispatched_at FROM orders WHERE id=?").get(ord2.id);
  assert.equal(dbDispatched1.status, "SHIPPED");
  assert.ok(dbDispatched1.vendor_dispatched_at);
  assert.equal(dbDispatched2.status, "SHIPPED");
  assert.ok(dbDispatched2.vendor_dispatched_at);
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

test("Super Admin Bulk Send to Vendor: assigns verified orders in batch, rejects unverified orders, and moves to printing queue", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/test");
  const adminUser = { id: "admin", email: "qa@example.invalid", role: "SUPER_ADMIN" };
  const regularUser = { id: "vendor1", email: "vendor@example.invalid", role: "VENDOR" };

  const { id: bookId } = await saveBook(bookInput("BULK-01"), adminUser, request);

  // 1. Create a vendor
  const vRes = await createVendor(testReq, adminUser, {
    name: "Premier Print House",
    phone: "03007788990",
    email: "premier@example.com",
    password: "securePassword123",
  });
  assert.equal(vRes.ok, true);

  // Helper to place orders
  const placeOrder = async (name, city, deliveryType) => {
    const orderCart = { ...cart(bookId, 2), name, city, delivery_type: deliveryType };
    const q = await quote(request, orderCart);
    const slip = crypto.randomUUID();
    sqlite
      .prepare(
        "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
      )
      .run(slip, hash(guest), "proof/" + slip, slip, q.total);
    const placed = await submitOrder(request, q.id, slip);
    return placed;
  };

  const ord1 = await placeOrder("Student Verified 1", "Lahore", "campus");
  const ord2 = await placeOrder("Student Verified 2", "Islamabad", "other");
  const ord3Unverified = await placeOrder("Student Unverified 3", "Karachi", "other");

  // Verify payment for ord1 and ord2 (moves to CONFIRMED and VERIFIED)
  const o1 = await getOrder(request, ord1.id, adminUser);
  await decidePayment(request, adminUser, ord1.id, "approve", "Approved payment 1", o1.version);

  const o2 = await getOrder(request, ord2.id, adminUser);
  await decidePayment(request, adminUser, ord2.id, "approve", "Approved payment 2", o2.version);

  // ord3 remains PAYMENT_PENDING with unverified payment
  const db3Before = sqlite.prepare("SELECT status FROM payments WHERE order_id=?").get(ord3Unverified.id);
  assert.equal(db3Before.status, "PENDING");

  // 2. Non-admin cannot batch assign orders to vendor (403)
  await assert.rejects(
    () => batchAssignOrdersToVendor(testReq, regularUser, [ord1.id, ord2.id], vRes.vendor.id),
    /Only Super Admin can assign orders to vendors/,
  );

  // 3. Super Admin batch assigns all 3 orders: only verified ones (ord1 and ord2) must be assigned
  const bulkRes = await batchAssignOrdersToVendor(
    testReq,
    adminUser,
    [ord1.id, ord2.id, ord3Unverified.id],
    vRes.vendor.id,
    "Urgent semester print run",
  );

  assert.equal(bulkRes.ok, true);
  assert.equal(bulkRes.count, 2, "Only 2 verified orders should be assigned; unverified is skipped");

  // Verify ord1 in database
  const db1 = sqlite.prepare("SELECT status, vendor_id, vendor_printed_at, vendor_notes FROM orders WHERE id=?").get(ord1.id);
  assert.equal(db1.status, "PROCESSING");
  assert.equal(db1.vendor_id, vRes.vendor.id);
  assert.equal(db1.vendor_printed_at, null, "Order is in Printing Queue by default");
  assert.equal(db1.vendor_notes, "Urgent semester print run");

  // Verify ord2 in database
  const db2 = sqlite.prepare("SELECT status, vendor_id, vendor_printed_at FROM orders WHERE id=?").get(ord2.id);
  assert.equal(db2.status, "PROCESSING");
  assert.equal(db2.vendor_id, vRes.vendor.id);
  assert.equal(db2.vendor_printed_at, null);

  // Verify ord3 was NOT assigned to vendor (unverified payment protection)
  const db3After = sqlite.prepare("SELECT status, vendor_id FROM orders WHERE id=?").get(ord3Unverified.id);
  assert.equal(db3After.vendor_id, null, "Unverified order must NOT be sent to vendor");
  assert.notEqual(db3After.status, "PROCESSING");

  // Verify single assignOrderToVendor also rejects unverified order
  await assert.rejects(
    () => assignOrderToVendor(testReq, adminUser, ord3Unverified.id, vRes.vendor.id),
    /Only orders with verified payment can be sent to a vendor/,
  );
});

test("Payment proof uploads accept JPEG and PNG pictures only, strictly rejecting PDF and other formats with 415", async (t) => {
  const sqlite = database(t);
  env.BUCKET = {
    put: async () => {},
    get: async () => null,
  };
  const { id: bookId } = await saveBook(bookInput("PROOF-01"), admin, request);
  const q = await quote(request, cart(bookId, 1));

  // 1. PDF binary with application/pdf header must be rejected with 415
  const pdfBytes = new TextEncoder().encode("%PDF-1.4 sample pdf content for payment proof");
  const pdfReq = new Request(`http://127.0.0.1:5173/api/proofs?quote=${q.id}`, {
    method: "POST",
    headers: {
      cookie: "cbs_guest=" + guest,
      Origin: "http://127.0.0.1:5173",
      "X-Requested-With": "CampusBookstore",
      "Content-Type": "application/pdf",
    },
    body: pdfBytes,
  });
  const pdfRes = await POST(pdfReq);
  assert.equal(pdfRes.status, 415);
  const pdfBody = await pdfRes.json();
  assert.match(
    pdfBody.error,
    /Only picture uploads \(JPEG, JPG, PNG\) are allowed\. PDF and other file formats are not accepted\./,
  );

  // 2. Text / generic binary file must also be rejected with 415
  const txtBytes = new TextEncoder().encode("plain text invoice instead of picture");
  const txtReq = new Request(`http://127.0.0.1:5173/api/proofs?quote=${q.id}`, {
    method: "POST",
    headers: {
      cookie: "cbs_guest=" + guest,
      Origin: "http://127.0.0.1:5173",
      "X-Requested-With": "CampusBookstore",
      "Content-Type": "text/plain",
    },
    body: txtBytes,
  });
  const txtRes = await POST(txtReq);
  assert.equal(txtRes.status, 415);

  // 3. Valid PNG upload must succeed (200)
  const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3, 4, 5]);
  const pngReq = new Request(`http://127.0.0.1:5173/api/proofs?quote=${q.id}`, {
    method: "POST",
    headers: {
      cookie: "cbs_guest=" + guest,
      Origin: "http://127.0.0.1:5173",
      "X-Requested-With": "CampusBookstore",
      "Content-Type": "image/png",
    },
    body: pngBytes,
  });
  const pngRes = await POST(pngReq);
  assert.equal(pngRes.status, 200);
  const pngBody = await pngRes.json();
  assert.ok(pngBody.id, "Upload returns slip id");

  // 4. Valid JPEG upload must succeed (200)
  const jpegBytes = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0]);
  const jpegReq = new Request(`http://127.0.0.1:5173/api/proofs?quote=${q.id}`, {
    method: "POST",
    headers: {
      cookie: "cbs_guest=" + guest,
      Origin: "http://127.0.0.1:5173",
      "X-Requested-With": "CampusBookstore",
      "Content-Type": "image/jpeg",
    },
    body: jpegBytes,
  });
  const jpegRes = await POST(jpegReq);
  assert.equal(jpegRes.status, 200);
  const jpegBody = await jpegRes.json();
  assert.ok(jpegBody.id, "Upload returns slip id");
});

test("Super Admin status update to SHIPPED auto-stamps vendor_printed_at and vendor_dispatched_at when vendor forgets to mark printed", async (t) => {
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

  const vRes = await createVendor(testReq, adminUser, {
    name: "Sync Printing Press",
    phone: "03009988776",
    email: "syncpress@example.com",
    password: "Password123!",
  });

  const { id: bookId } = await saveBook(bookInput("SYNC-01"), adminUser, request);

  const cartData = {
    name: "Sync Student",
    phone: "03211112233",
    city: "Lahore",
    address: "House 5, Lahore",
    delivery_type: "campus",
    campus_id: null,
    items: [{ id: bookId, quantity: 1 }],
  };
  const q = await quote(request, cartData);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);
  const ord = await getOrder(request, placed.id, adminUser);
  await decidePayment(request, adminUser, placed.id, "approve", "Approved", ord.version);

  // Send to vendor -> PROCESSING (Printing Queue), vendor_printed_at is NULL
  await assignOrderToVendor(testReq, adminUser, placed.id, vRes.vendor.id);
  const beforeShip = sqlite.prepare("SELECT status, vendor_printed_at, vendor_dispatched_at FROM orders WHERE id=?").get(placed.id);
  assert.equal(beforeShip.status, "PROCESSING");
  assert.equal(beforeShip.vendor_printed_at, null);
  assert.equal(beforeShip.vendor_dispatched_at, null);

  // Super Admin receives physical books at office and marks order as SHIPPED
  const freshOrd = await getOrder(request, placed.id, adminUser);
  await changeStatus(
    testReq,
    adminUser,
    placed.id,
    "SHIPPED",
    "Books received at Bookstore Office and marked Shipped",
    freshOrd.version,
  );

  // Verify that vendor_printed_at and vendor_dispatched_at were automatically stamped!
  const afterShip = sqlite.prepare("SELECT status, vendor_printed_at, vendor_dispatched_at FROM orders WHERE id=?").get(placed.id);
  assert.equal(afterShip.status, "SHIPPED");
  assert.ok(afterShip.vendor_printed_at, "vendor_printed_at must be auto-stamped when marked Shipped");
  assert.ok(afterShip.vendor_dispatched_at, "vendor_dispatched_at must be auto-stamped for Lahore/Campus orders");
});

test("Vendor Pricing Control, auto-calculation formula, retail price privacy, and payment ledger system", async (t) => {
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

  // 1. Admin creates vendor with custom rates: 1.60 Rs per page, 30 Rs binding
  const vRes = await createVendor(testReq, adminUser, {
    name: "Ledger Press",
    phone: "03001234999",
    email: "ledgerpress@example.com",
    password: "Password123!",
    per_page_rate: 1.60,
    binding_rate: 30.00,
  });
  const vendorId = vRes.vendor.id;
  assert.equal(vRes.vendor.per_page_rate, 1.60);
  assert.equal(vRes.vendor.binding_rate, 30.00);

  const vendorUser = {
    id: vRes.vendor.user_id,
    name: "Ledger Press",
    email: "ledgerpress@example.com",
    role: "VENDOR",
    vendor_id: vendorId,
    permissions: [],
  };

  // 2. Create a book with 100 pages
  const { id: bookId } = await saveBook(bookInput("LEDGER-100", { pages: 100 }), adminUser, request);

  // 3. Customer places order: 1 book of 100 pages
  const cartData = {
    name: "Ledger Student",
    phone: "03219988776",
    city: "Lahore",
    address: "House 10, Lahore",
    delivery_type: "campus",
    campus_id: null,
    items: [{ id: bookId, quantity: 1 }],
  };
  const q = await quote(request, cartData);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);
  const ord = await getOrder(request, placed.id, adminUser);
  await decidePayment(request, adminUser, placed.id, "approve", "Approved", ord.version);

  // 4. Admin assigns order to vendor
  await assignOrderToVendor(testReq, adminUser, placed.id, vendorId);

  // 5. Vendor views order: Formula = (100 * 1.6) + 30 = 190 Rs
  const vendorOrd = await getOrder(testReq, placed.id, vendorUser);
  assert.equal(vendorOrd.vendor_price, 190);
  assert.equal(vendorOrd.vendor_pages, 100);
  assert.equal(vendorOrd.vendor_books, 1);
  assert.equal(vendorOrd.vendor_rate_breakdown.formula, "(100 pages × Rs. 1.6) + (1 books × Rs. 30) = Rs. 190");

  // 6. 100% Privacy check: vendor never sees retail price or slip info
  assert.equal(vendorOrd.subtotal, undefined);
  assert.equal(vendorOrd.total, undefined);
  assert.equal(vendorOrd.delivery, undefined);
  assert.equal(vendorOrd.slip_id, undefined);
  assert.equal(vendorOrd.detected_amount, undefined);
  assert.equal(vendorOrd.items[0].unit_price, undefined);

  // 7. Vendor lists orders: check vendor_overview
  const vendorList = await listOrders(vendorUser);
  assert.ok(vendorList.vendor_overview);
  assert.equal(vendorList.vendor_overview.total_assigned, 1);
  assert.equal(vendorList.vendor_overview.printing_queue_count, 1);
  assert.equal(vendorList.vendor_overview.total_earnings, 190);
  assert.equal(vendorList.vendor_overview.total_paid, 0);
  assert.equal(vendorList.vendor_overview.pending_balance, 190);

  // 8. Dynamic Rate Update: Admin updates vendor per_page_rate to 2.00 Rs and binding to 40 Rs
  await updateVendor(testReq, adminUser, vendorId, {
    per_page_rate: 2.00,
    binding_rate: 40.00,
  });

  // Check that vendor order price immediately recalculates: (100 * 2.00) + 40 = 240 Rs
  const updatedVendorOrd = await getOrder(testReq, placed.id, vendorUser);
  assert.equal(updatedVendorOrd.vendor_price, 240);
  assert.equal(updatedVendorOrd.vendor_rate_breakdown.formula, "(100 pages × Rs. 2) + (1 books × Rs. 40) = Rs. 240");

  // 9. Payment Ledger: Admin checks vendor ledger
  const initialLedger = await getVendorLedger(adminUser, vendorId);
  assert.equal(initialLedger.summary.total_earned, 240);
  assert.equal(initialLedger.summary.total_paid, 0);
  assert.equal(initialLedger.summary.pending_balance, 240);
  assert.equal(initialLedger.payments.length, 0);

  // 10. Admin records a payment to vendor: e.g. Paid Rs. 100
  const paymentEntry = await createVendorPayment(testReq, adminUser, {
    vendor_id: vendorId,
    amount: 100,
    payment_date: "2026-10-19",
    payment_method: "Bank Transfer",
    reference: "TXN-12345",
    notes: "Advance payment for printing",
  });
  assert.equal(paymentEntry.ok, true);
  assert.ok(paymentEntry.payment.id);

  // 11. Vendor checks own ledger
  const vendorLedgerAfterPay = await getVendorLedger(vendorUser);
  assert.equal(vendorLedgerAfterPay.summary.total_earned, 240);
  assert.equal(vendorLedgerAfterPay.summary.total_paid, 100);
  assert.equal(vendorLedgerAfterPay.summary.pending_balance, 140);
  assert.equal(vendorLedgerAfterPay.payments.length, 1);
  assert.equal(vendorLedgerAfterPay.payments[0].amount, 100);
  assert.equal(vendorLedgerAfterPay.payments[0].payment_method, "Bank Transfer");

  // 12. Admin deletes payment entry
  await deleteVendorPayment(testReq, adminUser, paymentEntry.payment.id);
  const ledgerAfterDelete = await getVendorLedger(adminUser, vendorId);
  assert.equal(ledgerAfterDelete.summary.total_paid, 0);
  assert.equal(ledgerAfterDelete.summary.pending_balance, 240);
  assert.equal(ledgerAfterDelete.payments.length, 0);
});

test("Admin Order Editing: adjust quantity, exclude books, auto-recalculate total, and enforce status locking", async (t) => {
  const sqlite = database(t);
  const { id: book1Id } = await saveBook(
    bookInput("EDIT101", { title: "Edit Book One", pages: 100, active: true }),
    admin,
    request,
  );
  const { id: book2Id } = await saveBook(
    bookInput("EDIT102", { title: "Edit Book Two", pages: 200, active: true }),
    admin,
    request,
  );

  const cart = {
    name: "Hassan Ali",
    phone: "03009988776",
    city: "Lahore",
    address: "Johar Town, Lahore",
    delivery_type: "lahore",
    campus_id: null,
    items: [
      { id: book1Id, quantity: 5 },
      { id: book2Id, quantity: 2 },
    ],
  };

  const q = await quote(request, cart);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);

  const initialOrder = await getOrder(request, placed.id, admin);
  assert.equal(initialOrder.items.length, 2);
  const b1Item = initialOrder.items.find((it) => it.code === "EDIT101");
  const b2Item = initialOrder.items.find((it) => it.code === "EDIT102");
  assert.equal(b1Item.quantity, 5);
  assert.equal(b2Item.quantity, 2);

  const b1UnitPrice = b1Item.unit_price;
  const b2UnitPrice = b2Item.unit_price;
  const delivery = initialOrder.delivery;

  // 1. Adjust quantity: change Book 1 from 5 copies to 1 copy
  const edit1 = await editOrderItems(
    request,
    admin,
    placed.id,
    [
      { id: b1Item.id, quantity: 1 },
      { id: b2Item.id, quantity: 2 },
    ],
    "Student accidentally selected 5 copies",
  );

  assert.equal(edit1.ok, true);
  const expectedSubtotal1 = (b1UnitPrice * 1) + (b2UnitPrice * 2);
  assert.equal(edit1.subtotal, expectedSubtotal1);
  assert.equal(edit1.total, expectedSubtotal1 + delivery);

  const orderAfterEdit1 = await getOrder(request, placed.id, admin);
  assert.equal(orderAfterEdit1.subtotal, expectedSubtotal1);
  assert.equal(orderAfterEdit1.total, expectedSubtotal1 + delivery);
  const updatedB1 = orderAfterEdit1.items.find((it) => it.code === "EDIT101");
  assert.equal(updatedB1.quantity, 1);

  // Check order history contains the audit note
  const history1 = orderAfterEdit1.history;
  const latestHistory1 = history1[history1.length - 1];
  assert.ok(latestHistory1.note.includes("EDIT101 (5 → 1)"));
  assert.ok(latestHistory1.note.includes("Student accidentally selected 5 copies"));

  // 2. Exclude/Remove Book 2 completely from the order
  const edit2 = await editOrderItems(
    request,
    admin,
    placed.id,
    [
      { id: b1Item.id, quantity: 1 },
    ],
    "Customer cancelled second book",
  );

  assert.equal(edit2.ok, true);
  const expectedSubtotal2 = b1UnitPrice * 1;
  assert.equal(edit2.subtotal, expectedSubtotal2);
  assert.equal(edit2.total, expectedSubtotal2 + delivery);

  const orderAfterEdit2 = await getOrder(request, placed.id, admin);
  assert.equal(orderAfterEdit2.items.length, 1);
  assert.equal(orderAfterEdit2.items[0].code, "EDIT101");
  assert.equal(orderAfterEdit2.items[0].quantity, 1);
  assert.equal(orderAfterEdit2.subtotal, expectedSubtotal2);
  assert.equal(orderAfterEdit2.total, expectedSubtotal2 + delivery);

  // 3. Reject empty items (cannot remove all books)
  await assert.rejects(
    () => editOrderItems(request, admin, placed.id, [], "Remove all"),
    /Order must retain at least one book/,
  );

  // 4. Reject unauthorized users (non-admin student/guest)
  const studentUser = { id: "std_1", role: "STUDENT", permissions: [] };
  await assert.rejects(
    () => editOrderItems(request, studentUser, placed.id, [{ id: b1Item.id, quantity: 1 }]),
    /permission/,
  );

  // 5. Status locking: When order is printed by vendor, editing must be blocked
  sqlite.prepare("UPDATE orders SET vendor_printed_at=? WHERE id=?").run("2026-10-19 12:00:00", placed.id);
  await assert.rejects(
    () => editOrderItems(request, admin, placed.id, [{ id: b1Item.id, quantity: 2 }]),
    /already been marked as printed by the vendor/,
  );

  // Clear vendor_printed_at and mark as DELIVERED -> terminal status locking
  sqlite.prepare("UPDATE orders SET vendor_printed_at=NULL, status='DELIVERED' WHERE id=?").run(placed.id);
  await assert.rejects(
    () => editOrderItems(request, admin, placed.id, [{ id: b1Item.id, quantity: 2 }]),
    /Cannot edit items for order in Delivered status/,
  );
});

test("Partial Payment / Due Balance / Remaining Margin Management Scenario", async (t) => {
  const sqlite = database(t);
  const adminUser = admin;
  const staffUser = {
    id: "staff_1",
    email: "staff@vu.edu.pk",
    role: "ADMIN",
    permissions: ["orders.update", "orders.read"],
  };
  const studentUser = {
    id: "std_due_1",
    email: "student@vu.edu.pk",
    role: "STUDENT",
    permissions: [],
  };
  const testReq = request;

  // 1. Create a fresh book for this scenario
  const bookRes = await saveBook(
    bookInput("DUE-101", {
      title: "Due Management Test Book",
      pages: 200,
      category: "D",
      fixed_price: 170000, // Rs. 1700 (2 copies @ 1700 = 3400 + 100 delivery = 3500 total)
    }),
    adminUser,
    testReq,
  );
  const bookId = bookRes.id;

  // 2. Student places an order: 2 copies of DUE-101 (Rs. 3000 + Rs. 500 delivery = Rs. 3500 total)
  const cart = {
    name: "Ahmad Raza",
    phone: "03001234567",
    city: "Lahore",
    address: "House 123, Street 4, Lahore",
    delivery_type: "lahore",
    campus_id: null,
    items: [{ id: bookId, quantity: 2 }],
  };
  const q = await quote(testReq, cart);
  const totalBill = q.total; // 350000 cents (Rs. 3,500)
  assert.equal(totalBill, 350000, "Total order bill is Rs. 3,500");

  const slip = crypto.randomUUID();
  const digest = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, digest, 340000); // Student sent Rs. 3,400 (Rs. 100 less)

  const placed = await submitOrder(testReq, q.id, slip);

  // 3. Super Admin reviews and approves with partial payment:
  // Paid: 340000 (Rs. 3,400), Due: 10000 (Rs. 100)
  const pendingOrd = await getOrder(testReq, placed.id, adminUser);
  assert.equal(pendingOrd.status, "PAYMENT_PENDING");

  const approveRes = await decidePayment(
    testReq,
    adminUser,
    placed.id,
    "approve",
    "Verified partial payment",
    pendingOrd.version,
    340000,
    "Rs. 100 pending - will collect on delivery",
  );

  assert.equal(approveRes.status, "CONFIRMED");
  assert.equal(approveRes.amount_paid, 340000);
  assert.equal(approveRes.due_amount, 10000);
  assert.equal(approveRes.due_status, "DUE_PENDING");

  // 4. Verify order state when retrieved by Super Admin
  const confirmedOrd = await getOrder(testReq, placed.id, adminUser);
  assert.equal(confirmedOrd.amount_paid, 340000);
  assert.equal(confirmedOrd.due_amount, 10000);
  assert.equal(confirmedOrd.due_status, "DUE_PENDING");
  assert.equal(confirmedOrd.due_note, "Rs. 100 pending - will collect on delivery");
  assert.equal(confirmedOrd.payment_logs.length, 1);
  assert.equal(confirmedOrd.payment_logs[0].amount, 340000);
  assert.equal(confirmedOrd.payment_logs[0].type, "ADVANCE");
  assert.equal(confirmedOrd.payment_logs[0].actor, adminUser.email);

  // 5. Verify Customer / Student view (Privacy):
  // Customer sees amount_paid & due_amount for clear notice, but due_note and payment_logs are 100% stripped!
  const studentView = await getOrder(testReq, placed.id);
  assert.equal(studentView.amount_paid, 340000);
  assert.equal(studentView.due_amount, 10000);
  assert.equal(studentView.due_status, "DUE_PENDING");
  assert.equal(studentView.due_note, undefined, "Private due note must be hidden from student");
  assert.equal(studentView.payment_logs, undefined, "Private payment logs must be hidden from student");

  // Public tracking view
  const trackingView = await getOrder(testReq, placed.id, undefined, "tracking");
  assert.equal(trackingView.amount_paid, 340000);
  assert.equal(trackingView.due_amount, 10000);
  assert.equal(trackingView.due_status, "DUE_PENDING");
  assert.equal(trackingView.due_note, undefined);
  assert.equal(trackingView.payment_logs, undefined);

  // 6. Verify Non-Super Admin Staff restrictions (Privacy & RBAC):
  // Non-superadmin cannot see due amounts in listOrders and cannot record due payments!
  const staffList = await listOrders(staffUser);
  for (const r of staffList.rows) {
    assert.equal(r.amount_paid, undefined);
    assert.equal(r.due_amount, undefined);
    assert.equal(r.due_note, undefined);
  }

  await assert.rejects(
    () => recordDuePayment(testReq, staffUser, placed.id, 10000, "Staff attempt"),
    /Only Super Admin can record due payments/,
    "Staff must be rejected with 403 when trying to record due payments",
  );

  await assert.rejects(
    () => updateDueNote(testReq, staffUser, placed.id, "Staff note"),
    /Only Super Admin can update due notes/,
    "Staff must be rejected with 403 when trying to update due notes",
  );

  // 7. Verify WhatsApp Customer Notification includes remaining due
  const waMsg = getOrderWhatsAppMessage(confirmedOrd);
  assert.ok(waMsg.includes("Remaining Due: Rs. 100"), "WhatsApp message must notify customer of remaining due balance");
  assert.ok(waMsg.includes("Advance Paid: Rs. 3,400"), "WhatsApp message must display advance paid");

  // 8. Super Admin updates private due note
  const updateNoteRes = await updateDueNote(
    testReq,
    adminUser,
    placed.id,
    "Student confirmed cash on delivery to rider",
  );
  assert.equal(updateNoteRes.ok, true);
  const afterNoteOrd = await getOrder(testReq, placed.id, adminUser);
  assert.equal(afterNoteOrd.due_note, "Student confirmed cash on delivery to rider");

  // 9. Customer pays due balance: Super Admin records subsequent collection of Rs. 100 (10000 cents)
  const collectRes = await recordDuePayment(
    testReq,
    adminUser,
    placed.id,
    10000,
    "Cash received by delivery rider upon doorstep handover",
  );
  assert.equal(collectRes.ok, true);
  assert.equal(collectRes.amount_paid, 350000);
  assert.equal(collectRes.due_amount, 0);
  assert.equal(collectRes.due_status, "PAID");

  // 10. Verify order state after full clearance
  const clearedOrd = await getOrder(testReq, placed.id, adminUser);
  assert.equal(clearedOrd.amount_paid, 350000);
  assert.equal(clearedOrd.due_amount, 0);
  assert.equal(clearedOrd.due_status, "PAID");
  assert.equal(clearedOrd.payment_logs.length, 2);
  assert.equal(clearedOrd.payment_logs[1].amount, 10000);
  assert.equal(clearedOrd.payment_logs[1].type, "FULL_PAYMENT");
  assert.equal(clearedOrd.payment_logs[1].actor, adminUser.email);
  assert.ok(clearedOrd.payment_logs[1].note.includes("Cash received by delivery rider"));

  // 11. WhatsApp notification now does NOT contain pending due text since due_amount is 0
  const clearedWaMsg = getOrderWhatsAppMessage(clearedOrd);
  assert.ok(!clearedWaMsg.includes("Remaining Due:"), "WhatsApp message must not show remaining due once cleared");

  // 12. Cannot record payment when balance is already 0
  await assert.rejects(
    () => recordDuePayment(testReq, adminUser, placed.id, 5000, "Extra pay"),
    /already has no remaining due balance/,
  );

  // 13. Auto-recalculation when Super Admin edits items on a partially paid order
  // Create another order, partially pay, then edit quantity
  const slip2 = crypto.randomUUID();
  const digest2 = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip2, hash(guest), "proof/" + slip2, digest2, 300000);

  const placed2 = await submitOrder(testReq, (await quote(testReq, cart)).id, slip2);
  const ord2Before = await getOrder(testReq, placed2.id, adminUser);
  await decidePayment(testReq, adminUser, placed2.id, "approve", "Approved", ord2Before.version, 300000); // Paid 3000, Due 500

  const ord2Paid = await getOrder(testReq, placed2.id, adminUser);
  assert.equal(ord2Paid.due_amount, 50000); // 500 due

  // Admin edits order: reduce quantity from 2 to 1 (new total: Rs. 1500 + 500 = Rs. 2000)
  const itemToEdit = ord2Paid.items[0];
  await editOrderItems(testReq, adminUser, placed2.id, [{ id: itemToEdit.id, quantity: 1 }], "Reduced qty");

  const ord2AfterEdit = await getOrder(testReq, placed2.id, adminUser);
  assert.equal(ord2AfterEdit.total, 180000); // Total is now 1800 (1 copy @ 1700 + 100 delivery)
  // Paid was 3000, which exceeds 1800 -> due becomes 0, due_status becomes PAID
  assert.equal(ord2AfterEdit.due_amount, 0);
  assert.equal(ord2AfterEdit.due_status, "PAID");
});

test("Vendor Ledger automatically credits actual courier delivery charges for Other City orders, while keeping internal costs hidden from students", async (t) => {
  const sqlite = database(t);
  const adminUser = {
    id: "admin",
    name: "QA Admin",
    email: "qa@example.invalid",
    role: "SUPER_ADMIN",
    permissions: ["orders.update", "orders.manage"],
  };

  // 1. Create a vendor with Rs. 2.00 / page and Rs. 50 / book binding
  const { vendor: vendorRecord } = await createVendor(request, adminUser, {
    name: "Express Print Works",
    phone: "03112233445",
    email: "express@example.com",
    password: "Password123!",
    per_page_rate: 2.00,
    binding_rate: 50.00,
  });
  const vendorId = vendorRecord.id;
  const vendorUser = {
    id: vendorRecord.user_id,
    name: "Express Print Works",
    email: "express@example.com",
    role: "VENDOR",
    vendor_id: vendorId,
    permissions: [],
  };

  // 2. Create a book with 80 pages
  const { id: bookId } = await saveBook(bookInput("CS-OTHER-CITY", { pages: 80 }), adminUser, request);

  // 3. Customer places Other City order (e.g. Faisalabad, delivery_type: "other")
  const cartData = {
    name: "Other City Student",
    phone: "03001234567",
    city: "Faisalabad",
    address: "House 123, Street 4, Faisalabad",
    delivery_type: "other",
    campus_id: null,
    items: [{ id: bookId, quantity: 2 }], // 2 books of 80 pages each = 160 pages, 2 books
  };
  const q = await quote(request, cartData);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);
  const ord = await getOrder(request, placed.id, adminUser);
  await decidePayment(request, adminUser, placed.id, "approve", "Approved", ord.version);

  // 4. Assign order to vendor
  await assignOrderToVendor(request, adminUser, placed.id, vendorId);

  // Expected Printing Cost = (160 pages * 2.00) + (2 books * 50) = 320 + 100 = Rs. 420
  const ledgerBeforeCourier = await getVendorLedger(adminUser, vendorId);
  assert.equal(ledgerBeforeCourier.summary.total_printing_cost, 420);
  assert.equal(ledgerBeforeCourier.summary.total_courier_charges, 0);
  assert.equal(ledgerBeforeCourier.summary.courier_orders_count, 0);
  assert.equal(ledgerBeforeCourier.summary.total_earned, 420);
  assert.equal(ledgerBeforeCourier.summary.pending_balance, 420);

  // 5. Vendor dispatches via TCS Courier, entering actual courier expense of Rs. 380
  const attachRes = await setCourierTracking(
    request,
    vendorUser,
    placed.id,
    "TCS",
    "TCS-99887766",
    "SHIPPED",
    380, // Actual courier charges
  );
  assert.equal(attachRes.ok, true);
  assert.equal(attachRes.actual_courier_charges, 380);

  // 6. Vendor Ledger Khata check: Printing (420) + Courier (380) = Rs. 800
  const ledgerAfterCourier = await getVendorLedger(adminUser, vendorId);
  assert.equal(ledgerAfterCourier.summary.total_printing_cost, 420);
  assert.equal(ledgerAfterCourier.summary.total_courier_charges, 380);
  assert.equal(ledgerAfterCourier.summary.courier_orders_count, 1);
  assert.equal(ledgerAfterCourier.summary.total_earned, 800);
  assert.equal(ledgerAfterCourier.summary.pending_balance, 800);

  // Order breakdown in ledger
  assert.ok(ledgerAfterCourier.orders);
  assert.equal(ledgerAfterCourier.orders.length, 1);
  const ledgerOrder = ledgerAfterCourier.orders[0];
  assert.equal(ledgerOrder.id, placed.id);
  assert.equal(ledgerOrder.printing_cost, 420);
  assert.equal(ledgerOrder.actual_courier_charges, 380);
  assert.equal(ledgerOrder.total_credit, 800);
  assert.equal(ledgerOrder.courier_name, "TCS");
  assert.equal(ledgerOrder.courier_tracking_id, "TCS-99887766");

  // 7. Student Privacy Check: student tracking NEVER leaks actual_courier_charges
  const studentTrack = await getOrder(request, placed.id, undefined, "tracking");
  assert.equal(studentTrack.courier_name, "TCS");
  assert.equal(studentTrack.courier_tracking_id, "TCS-99887766");
  assert.equal(studentTrack.actual_courier_charges, undefined);



  // 8. Super Admin adjusts actual courier charges to Rs. 420 (e.g. vendor had extra weight charge)
  await updateActualCourierCharges(request, adminUser, placed.id, 420);
  const ledgerAfterUpdate = await getVendorLedger(vendorUser);
  assert.equal(ledgerAfterUpdate.summary.total_courier_charges, 420);
  assert.equal(ledgerAfterUpdate.summary.total_earned, 840); // 420 + 420 = 840
  assert.equal(ledgerAfterUpdate.summary.pending_balance, 840);
  assert.equal(ledgerAfterUpdate.orders[0].actual_courier_charges, 420);
  assert.equal(ledgerAfterUpdate.orders[0].total_credit, 840);

  // 9. Vendor removes courier tracking: actual_courier_charges resets to 0
  await removeCourierTracking(request, vendorUser, placed.id);
  const ledgerAfterRemove = await getVendorLedger(adminUser, vendorId);
  assert.equal(ledgerAfterRemove.summary.total_courier_charges, 0);
  assert.equal(ledgerAfterRemove.summary.total_courier_charges, 0);
  assert.equal(ledgerAfterRemove.summary.total_earned, 420);
  assert.equal(ledgerAfterRemove.summary.pending_balance, 420);
  assert.equal(ledgerAfterRemove.orders[0].actual_courier_charges, 0);
  assert.equal(ledgerAfterRemove.orders[0].total_credit, 420);
});


test("Site logo branding can be uploaded, saved in settings, and updated or cleared", async (t) => {
  const sqlite = database(t);
  const uploads = new Map();
  env.BUCKET = {
    put: async (key, val, meta) => {
      uploads.set(key, { val, meta });
    },
    get: async (key) => {
      const obj = uploads.get(key);
      if (!obj) return null;
      return { body: obj.val, httpMetadata: obj.meta?.httpMetadata };
    },
  };

  const adminUser = {
    id: "admin-logo-test",
    email: "admin@example.com",
    role: "SUPER_ADMIN",
    permissions: ["settings.write", "settings.read", "books.write"],
  };

  // 1. Initial settings should have default/null logo
  const initial = await getSettings();
  assert.equal(initial.settings.logo_url, null);

  // 2. Admin uploads a PNG brand logo
  const adminSession = "logo-admin-session";
  sqlite.exec("UPDATE users SET must_change=0 WHERE id='admin'");
  sqlite
    .prepare("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)")
    .run(hash(adminSession), "admin", Date.now() + 60000, "2026-01-01");

  const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
  const logoReq = new Request("http://127.0.0.1:5173/api/covers", {
    method: "POST",
    headers: {
      origin: "http://127.0.0.1:5173",
      cookie: "cbs_admin_session=" + adminSession,
      "content-type": "image/png",
      "content-length": String(pngHeader.length),
      "x-requested-with": "CampusBookstore",
    },
    body: pngHeader,
  });

  const uploadRes = await upload(logoReq, true);
  assert.ok(uploadRes.url.startsWith("/api/covers/"));

  // 3. Save settings with new logo_url
  const updatedSettings = {
    ...initial.settings,
    logo_url: uploadRes.url,
  };

  sqlite.prepare("UPDATE settings SET value=?, version=version+1 WHERE id=1").run(
    JSON.stringify(updatedSettings),
  );

  const reloaded = await getSettings();
  assert.equal(reloaded.settings.logo_url, uploadRes.url);

  // 4. Admin removes logo (revert to null/icon)
  const clearedSettings = {
    ...reloaded.settings,
    logo_url: "",
  };

  sqlite.prepare("UPDATE settings SET value=?, version=version+1 WHERE id=1").run(
    JSON.stringify(clearedSettings),
  );

  const afterClear = await getSettings();
  assert.equal(afterClear.settings.logo_url, null);
});

test("Item Received Tracking and Student Refund Workflow: admin item-level delivery and refund on unavailable books", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/orders");
  const adminUser = { id: "admin", email: "admin@vu.edu.pk", role: "SUPER_ADMIN", permissions: ["orders.update", "orders.manage"] };

  // 1. Create vendor and two books
  const vRes = await createVendor(testReq, adminUser, {
    name: "Master Prints",
    phone: "03211112222",
    email: "masterprints@example.com",
    password: "Password123!",
    page_rate: 1.5,
    binding_rate: 50,
    active: true,
  });

  const { id: book1Id } = await saveBook(bookInput("BOOK101", { title: "Math", pages: 100 }), adminUser, request);
  const { id: book2Id } = await saveBook(bookInput("BOOK102", { title: "Physics", pages: 200 }), adminUser, request);

  // 2. Customer places order with 2 books
  const cart = {
    name: "Ahmed Ali",
    phone: "03009998877",
    city: "Lahore",
    address: "Model Town Lahore",
    delivery_type: "lahore",
    campus_id: null,
    items: [
      { id: book1Id, quantity: 1 },
      { id: book2Id, quantity: 1 },
    ],
  };

  const q = await quote(request, cart);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);
  const orderId = placed.id;

  // 3. Mark payment accepted in full (advance paid)
  const ordBeforePay = await getOrder(request, orderId, adminUser);
  await decidePayment(request, adminUser, orderId, "approve", "Full advance paid via EasyPaisa", ordBeforePay.version);

  // Assign to vendor
  await assignOrderToVendor(testReq, adminUser, orderId, vRes.vendor.id, "Please print fast");

  // Verify order details: 2 items, received_from_vendor = 0
  let currentOrder = await getOrder(request, orderId, adminUser);
  assert.equal(currentOrder.items.length, 2);
  assert.equal(currentOrder.items[0].received_from_vendor, 0);
  assert.equal(currentOrder.items[1].received_from_vendor, 0);
  assert.equal(currentOrder.refund_due, 0);
  assert.equal(currentOrder.refund_status, "NONE");

  // 4. Partial Book Arrival: Vendor delivers book 1, but book 2 is still pending
  const item1Id = currentOrder.items[0].id;
  const item2Id = currentOrder.items[1].id;
  
  const toggleRes1 = await toggleOrderItemReceived(testReq, adminUser, orderId, item1Id, true);
  assert.equal(toggleRes1.ok, true);
  assert.equal(toggleRes1.received_from_vendor, 1);

  currentOrder = await getOrder(request, orderId, adminUser);
  const foundItem1 = currentOrder.items.find(i => i.id === item1Id);
  const foundItem2 = currentOrder.items.find(i => i.id === item2Id);
  assert.equal(foundItem1.received_from_vendor, 1);
  assert.equal(foundItem2.received_from_vendor, 0);

  // Toggle all received
  await setAllOrderItemsReceived(testReq, adminUser, orderId, true);
  currentOrder = await getOrder(request, orderId, adminUser);
  assert.equal(currentOrder.items.every(i => i.received_from_vendor === 1), true);

  // Reset all received
  await setAllOrderItemsReceived(testReq, adminUser, orderId, false);
  currentOrder = await getOrder(request, orderId, adminUser);
  assert.equal(currentOrder.items.every(i => i.received_from_vendor === 0), true);

  // 5. Unavailable Book Scenario:
  // Book 2 is unavailable/out of stock. Admin removes Book 2 from order items.
  const editRes = await editOrderItems(request, adminUser, orderId, [
    { id: item1Id, quantity: 1 },
  ]);
    assert.equal(editRes.ok, true);
  assert.ok(editRes.refund_due > 0, "Refund due is calculated when items removed from paid order");
  assert.equal(editRes.refund_status, "REFUND_PENDING");

  currentOrder = await getOrder(request, orderId, adminUser);
  assert.equal(currentOrder.items.length, 1);
  const refundDueAmount = currentOrder.refund_due;
  assert.ok(refundDueAmount > 0);
  assert.equal(currentOrder.refund_status, "REFUND_PENDING");

  // Check vendor ledger: vendor cost now only includes Book 1 (100 pages), Book 2 (200 pages) is EXCLUDED
  const ledger = await getVendorLedger(adminUser, vRes.vendor.id);
  const orderLedgerRow = ledger.orders.find(o => o.id === orderId);
  assert.ok(orderLedgerRow);
  assert.equal(orderLedgerRow.total_pages, 100, "Ledger total_pages excludes deleted book");
  assert.equal(orderLedgerRow.total_books, 1, "Ledger total_books excludes deleted book");

  // 6. Record Student Refund
  const refundRes = await recordStudentRefund(
    testReq,
    adminUser,
    orderId,
    refundDueAmount,
    "JazzCash",
    "TID-987654321",
    "Refunded for unavailable Physics book"
  );
  assert.equal(refundRes.ok, true);
  assert.equal(refundRes.refund_status, "REFUNDED");
  assert.equal(refundRes.refund_amount, refundDueAmount);

  // Verify DB state after refund
  currentOrder = await getOrder(request, orderId, adminUser);
  assert.equal(currentOrder.refund_status, "REFUNDED");
  assert.equal(currentOrder.refund_amount, refundDueAmount);
  assert.ok(currentOrder.refund_note.includes("TID-987654321"));
  assert.ok(currentOrder.refund_paid_at);

  // Non-admin cannot record refund
  const custUser = { id: "cust", email: "cust@example.invalid", role: "CUSTOMER" };
  await assert.rejects(
    () => recordStudentRefund(testReq, custUser, orderId, 100, "Cash", "", ""),
    /Only Super Admin can record student refunds/
  );
});

test("Delivered orders protection: terminal delivered orders cannot be marked as printed or sent to vendor", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/orders");
  const adminUser = { id: "admin", email: "admin@vu.edu.pk", role: "SUPER_ADMIN", permissions: ["orders.update", "orders.manage"] };

  const vRes = await createVendor(testReq, adminUser, {
    name: "Terminal Test Vendor",
    phone: "03009990000",
    email: "terminalvendor@example.com",
    password: "Password123!",
  });

  const { id: bookId } = await saveBook(bookInput("TERM101", { title: "Terminal Book", pages: 120 }), adminUser, request);

  const cart = {
    name: "Terminal Student",
    phone: "03210001122",
    city: "Lahore",
    address: "Johar Town, Lahore",
    delivery_type: "lahore",
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
  const orderId = placed.id;

  const ord = await getOrder(request, orderId, adminUser);
  await decidePayment(request, adminUser, orderId, "approve", "Approved", ord.version);

  // Move order to DELIVERED status
  sqlite.prepare("UPDATE orders SET status='DELIVERED', updated_at=datetime('now') WHERE id=?").run(orderId);

  // 1. vendorPrint must reject delivered orders
  await assert.rejects(
    () => vendorPrint(testReq, adminUser, orderId, true),
    /Cannot update print status for order in Delivered status/
  );

  // 2. assignOrderToVendor must reject delivered orders
  await assert.rejects(
    () => assignOrderToVendor(testReq, adminUser, orderId, vRes.vendor.id),
    /Cannot assign order in DELIVERED status to a vendor/
  );

  // 3. batchVendorPrint must safely filter out delivered orders and not touch them
  const batchPrintRes = await batchVendorPrint(testReq, adminUser, [orderId], true);
  assert.equal(batchPrintRes.ok, true);
  assert.equal(batchPrintRes.count, 0);

  // 4. batchAssignOrdersToVendor must skip delivered orders
  const batchAssignRes = await batchAssignOrdersToVendor(testReq, adminUser, [orderId], vRes.vendor.id);
  assert.equal(batchAssignRes.ok, true);
  assert.equal(batchAssignRes.count, 0);
});

test("Admin Enhancements: student refund WhatsApp notification, vendor pending books summary, and REFUNDS_DUE tab", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/orders");
  const adminUser = { id: "admin", email: "admin@vu.edu.pk", role: "SUPER_ADMIN", permissions: ["orders.update", "orders.manage"] };

  const vRes = await createVendor(testReq, adminUser, {
    name: "Pending Summary Vendor",
    phone: "03001234567",
    email: "summaryvendor@example.com",
    password: "Password123!",
  });
  const vendorId = vRes.vendor.id;

  const { id: b1 } = await saveBook(bookInput("ENH101", { title: "Enhancement Book 1", pages: 100 }), adminUser, request);
  const { id: b2 } = await saveBook(bookInput("ENH102", { title: "Enhancement Book 2", pages: 150 }), adminUser, request);

  const cart = {
    name: "Refund Student",
    phone: "03112223344",
    address: "Johar Town, Lahore",
    city: "Lahore",
    delivery_type: "lahore",
    campus_id: null,
    items: [
      { id: b1, code: "ENH101", quantity: 1 },
      { id: b2, code: "ENH102", quantity: 2 },
    ],
  };

  const q = await quote(request, cart);
  const slip = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA','2026-01-01')",
    )
    .run(slip, hash(guest), "proof/" + slip, slip, q.total);
  const placed = await submitOrder(request, q.id, slip);
  const orderId = placed.id;

  const ord = await getOrder(request, orderId, adminUser);
  await decidePayment(request, adminUser, orderId, "approve", "Approved", ord.version);
  await assignOrderToVendor(testReq, adminUser, orderId, vendorId);

  // 1. Verify getVendorPendingBooks returns the 2 books assigned to vendor
  const pendingSummary = await getVendorPendingBooks(adminUser, vendorId);
  assert.equal(pendingSummary.ok, true);
  assert.equal(pendingSummary.vendor.id, vendorId);
  assert.equal(pendingSummary.totalPendingQty, 3); // 1 copy of ENH101 + 2 copies of ENH102
  assert.equal(pendingSummary.totalPendingTitles, 2);
  assert.ok(pendingSummary.whatsappMessage.includes("ENH101"));
  assert.ok(pendingSummary.whatsappMessage.includes("ENH102"));
  assert.ok(pendingSummary.whatsappUrl.includes("03001234567"));

  // 2. Student advance refund scenario:
  // Admin edits order items (e.g. ENH102 is out of print, removed from order) with standardized reason tag
  const item1Id = ord.items.find(i => i.code === "ENH101").id;
  const editRes = await editOrderItems(
    request,
    adminUser,
    orderId,
    [{ id: item1Id, quantity: 1 }],
    "Out of Print / Market Unavailable - Student informed book not needed"
  );
  assert.equal(editRes.ok, true);
  assert.ok(editRes.refund_due > 0);
  assert.equal(editRes.refund_status, "REFUND_PENDING");

  // Verify listOrders with status="REFUNDS_DUE" filter returns this order and count > 0
  const refundOrders = await listOrders(adminUser, "", "REFUNDS_DUE");
  assert.ok(refundOrders.rows.some(o => o.id === orderId));
  assert.ok(refundOrders.status_counts["REFUNDS_DUE"] >= 1);

  // 3. Verify getStudentRefundWhatsAppUrl helper
  const updatedOrder = await getOrder(request, orderId, adminUser);
  const refundWaUrl = getStudentRefundWhatsAppUrl(
    updatedOrder,
    updatedOrder.refund_due,
    "JazzCash",
    "TID-999888",
    "Out of Print / Market Unavailable"
  );
  assert.ok(refundWaUrl.includes("wa.me/03112223344"));
  assert.ok(refundWaUrl.includes(encodeURIComponent("Assalam-o-Alaikum Refund Student!")));
  assert.ok(refundWaUrl.includes(encodeURIComponent("JazzCash")));

  // 4. Record refund and verify REFUNDS_DUE count decrements
  await recordStudentRefund(
    testReq,
    adminUser,
    orderId,
    updatedOrder.refund_due,
    "JazzCash",
    "TID-999888",
    "Refund processed"
  );
  const afterRefundOrders = await listOrders(adminUser, "", "REFUNDS_DUE");
  assert.ok(!afterRefundOrders.rows.some(o => o.id === orderId));
});

test("Vendor Remove from Printing: requires mandatory reason and unassigns vendor from order", async (t) => {
  const sqlite = database(t);
  const testReq = new Request("http://127.0.0.1:5173/api/orders");
  const adminUser = { id: "admin", email: "admin@vu.edu.pk", role: "SUPER_ADMIN", permissions: ["orders.update", "orders.manage"] };

  const vRes = await createVendor(testReq, adminUser, {
    name: "Al-Huda Press",
    phone: "03221114455",
    email: "alhuda@example.com",
    password: "Password123!",
  });
  const vendorId = vRes.vendor.id;
  const vendorUser = { id: vRes.vendor.user_id, vendor_id: vendorId, email: "alhuda@example.com", role: "VENDOR" };

  const { id: bookId } = await saveBook(bookInput("UNAS101", { title: "Unassign Book", pages: 180 }), adminUser, request);

  const cart = {
    name: "Revert Student",
    phone: "03335557788",
    address: "Model Town, Lahore",
    city: "Lahore",
    delivery_type: "lahore",
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
  const orderId = placed.id;

  const ord = await getOrder(request, orderId, adminUser);
  await decidePayment(request, adminUser, orderId, "approve", "Approved", ord.version);

  // Assign order to Al-Huda Press -> status is now PROCESSING
  await assignOrderToVendor(testReq, adminUser, orderId, vendorId);
  const inQueueOrder = await getOrder(request, orderId, adminUser);
  assert.equal(inQueueOrder.status, "PROCESSING");
  assert.equal(inQueueOrder.vendor_id, vendorId);

  // 1. Vendor attempts to remove from printing WITHOUT a reason -> MUST FAIL with 400
  await assert.rejects(
    () => setPrintingQueue(testReq, vendorUser, orderId, false, ""),
    /Please provide a valid reason for removing this order from printing/
  );

  await assert.rejects(
    () => setPrintingQueue(testReq, vendorUser, orderId, false, "  "),
    /Please provide a valid reason for removing this order from printing/
  );

  // 2. Vendor provides reason and removes from printing
  const removeRes = await setPrintingQueue(
    testReq,
    vendorUser,
    orderId,
    false,
    "Paper / Cover Stock Shortage - 80gsm paper out of stock"
  );
  assert.equal(removeRes.ok, true);
  assert.equal(removeRes.status, "CONFIRMED");
  assert.equal(removeRes.vendor_id, null);

  // 3. Verify order in DB has vendor_id = NULL
  const revertedOrder = await getOrder(request, orderId, adminUser);
  assert.equal(revertedOrder.status, "CONFIRMED");
  assert.equal(revertedOrder.vendor_id, null);
  assert.equal(revertedOrder.vendor_printed_at, null);

  // Verify order history records vendor name and exact reason
  const history = sqlite.prepare("SELECT * FROM order_history WHERE order_id=? ORDER BY created_at DESC").all(orderId);
  const latestHistory = history[0];
  assert.ok(latestHistory.note.includes("Al-Huda Press"));
  assert.ok(latestHistory.note.includes("Paper / Cover Stock Shortage"));

  // 4. Verify listOrders shows order in CONFIRMED and without vendor assignment (ready to be reassigned)
  const confirmedList = await listOrders(adminUser, "", "CONFIRMED");
  const confirmedRow = confirmedList.rows.find(o => o.id === orderId);
  assert.ok(confirmedRow);
  assert.equal(confirmedRow.vendor_id, null);
  assert.equal(confirmedRow.vendor_name, null);

  // 5. Admin can now re-assign this order to another vendor!
  const vRes2 = await createVendor(testReq, adminUser, {
    name: "Target Press 2",
    phone: "03330001122",
    email: "target2@example.com",
    password: "Password123!",
  });
  const reassignRes = await assignOrderToVendor(testReq, adminUser, orderId, vRes2.vendor.id);
  assert.equal(reassignRes.ok, true);
  const reassignedOrder = await getOrder(request, orderId, adminUser);
  assert.equal(reassignedOrder.status, "PROCESSING");
  assert.equal(reassignedOrder.vendor_id, vRes2.vendor.id);
});
