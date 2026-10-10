import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { PDFDocument } from "pdf-lib";
if (process.env.TEST_DISPOSABLE_DB !== "1")
  throw new Error(
    "Use a disposable local database and set TEST_DISPOSABLE_DB=1. This suite creates records and changes credentials.",
  );
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:5173";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  throw new Error(
    "Integration tests only run against an explicitly local database.",
  );
const env = Object.fromEntries(
  fs
    .readFileSync(".dev.vars", "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), JSON.parse(l.slice(i + 1))];
    }),
);
const saved = ".sites-runtime/test-admin.json";
let adminPassword = fs.existsSync(saved)
  ? JSON.parse(fs.readFileSync(saved)).password
  : env.BOOTSTRAP_PASSWORD;
const results = [];
function pass(name) {
  results.push(name);
  console.log("PASS " + name);
}
function client() {
  let cookies = {};
  return async (path, body, options = {}) => {
    const method = options.method || (body === undefined ? "GET" : "POST");
    const headers = {
      Cookie: Object.entries(cookies)
        .map(([k, v]) => k + "=" + v)
        .join("; "),
      ...(method === "GET"
        ? {}
        : {
            Origin: origin,
            "X-Requested-With": "CampusBookstore",
            "Content-Type": "application/json",
          }),
      ...options.headers,
    };
    const r = await fetch(origin + "/api/" + path, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : options.raw
            ? body
            : JSON.stringify(body),
      redirect: "manual",
    });
    for (const c of r.headers.getSetCookie()) {
      const pair = c.split(";")[0],
        i = pair.indexOf("=");
      cookies[pair.slice(0, i)] = pair.slice(i + 1);
    }
    let data;
    if (options.binary) data = new Uint8Array(await r.arrayBuffer());
    else {
      const txt = await r.text();
      try {
        data = JSON.parse(txt);
      } catch {
        data = { error: txt.slice(0, 500) };
      }
    }
    if (options.expect !== undefined)
      assert.equal(
        r.status,
        options.expect,
        `${path}: ${JSON.stringify(data)}`,
      );
    else if (!r.ok)
      throw new Error(`${path}: HTTP ${r.status}: ${JSON.stringify(data)}`);
    return { data, status: r.status, headers: r.headers };
  };
}
const admin = client(),
  guest = client(),
  stranger = client();
await guest("session");
await stranger("session");
await stranger("manage/books", undefined, { expect: 401 });
pass("Anonymous users cannot access management APIs");
await guest(
  "quote",
  {},
  { headers: { Origin: "https://evil.invalid" }, expect: 403 },
);
pass("Cross-origin mutations are rejected");
const login = await admin("login", {
  email: env.BOOTSTRAP_EMAIL,
  password: adminPassword,
  portal: "admin",
});
if (login.data.must_change) {
  await admin("manage/settings", undefined, { expect: 428 });
  adminPassword = "QaOnly-" + randomBytes(16).toString("hex") + "A1";
  await admin("profile", {
    name: "QA Administrator",
    current_password: env.BOOTSTRAP_PASSWORD,
    new_password: adminPassword,
  });
  fs.mkdirSync(".sites-runtime", { recursive: true });
  fs.writeFileSync(saved, JSON.stringify({ password: adminPassword }));
  await admin("manage/settings", undefined, { expect: 401 });
  await admin("login", {
    email: env.BOOTSTRAP_EMAIL,
    password: adminPassword,
    portal: "admin",
  });
  pass("Bootstrap forces password rotation and revokes old sessions");
}
const catalog = (await guest("catalog")).data;
const cs = catalog.books.find((b) => b.code === "CS101");
assert.equal(cs.price, 350 * 600);
assert.equal(catalog.prices.length, 4);
assert.deepEqual(
  catalog.prices.map((p) => p.id),
  ["A", "B", "C", "D"],
);
pass("Exactly four categories and server-computed page pricing");
const stamp = Date.now().toString().slice(-7),
  tempPassword = "Campus-Test-" + randomBytes(9).toString("hex") + "A1";
const campusA = (
  await admin("manage/campuses", {
    code: "QA-A-" + stamp,
    name: "QA Campus A",
    city: "Lahore",
    active: true,
    permissions: [
      "orders.read",
      "orders.update",
      "students.read",
      "books.read",
      "reports.read",
    ],
  })
).data.id;
const campusB = (
  await admin("manage/campuses", {
    code: "QA-B-" + stamp,
    name: "QA Campus B",
    city: "Karachi",
    active: true,
    permissions: ["orders.read", "books.read"],
  })
).data.id;
await admin("manage/users", {
  name: "QA Campus User",
  email: `qa-${stamp}@example.test`,
  role: "CAMPUS_ADMIN",
  campus_id: campusB,
  active: true,
  password: tempPassword,
});
const campus = client();
await campus("login", {
  email: `qa-${stamp}@example.test`,
  password: tempPassword,
  portal: "campus",
});
await campus("profile", {
  name: "QA Campus User",
  current_password: tempPassword,
  new_password: tempPassword + "Changed",
});
await campus("login", {
  email: `qa-${stamp}@example.test`,
  password: tempPassword + "Changed",
  portal: "campus",
});
await campus("manage/pricing", undefined, { expect: 403 });
await campus("manage/settings", undefined, { expect: 403 });
await campus("manage/users", undefined, { expect: 403 });
pass("Campus accounts cannot access super-admin APIs");
const testBook = {
  code: "QA-" + stamp,
  course_code: "QA101",
  course_name: "QA Course",
  title: "QA concurrency fixture",
  author: "Test",
  description: "Local automated-test book",
  cover: null,
  pages: 100,
  category: "B",
  fixed_price: null,
  campus_id: campusA,
  active: true,
  stock: 1,
  threshold: 1,
};
const bookId = (await admin("manage/books", testBook)).data.id;
await admin("manage/books", testBook, { expect: 409 });
pass("Unique book codes are enforced by the database");
const customer = {
  name: "Test Student",
  phone: "03001234567",
  city: "Lahore",
  address: "Test address, local QA only",
  instructions: "Test order",
  delivery_type: "lahore",
  campus_id: campusA,
  items: [{ id: bookId, quantity: 1 }],
  total: 1,
  delivery: 0,
};
const q = (await guest("quote", customer)).data;
assert.equal(q.total, 35000 + 50000);
pass("Forged browser prices and delivery totals are ignored");
await guest(
  "quote",
  { ...customer, items: [{ id: bookId, quantity: 2 }] },
  { expect: 409 },
);
await guest(
  "quote",
  {
    ...customer,
    items: [
      { id: bookId, quantity: 1 },
      { id: bookId, quantity: 1 },
    ],
  },
  { expect: 400 },
);
await guest("quote", { ...customer, city: "Karachi" }, { expect: 400 });
pass(
  "Excess quantities, duplicate cart rows and delivery mismatches are rejected",
);
await guest(
  "orders",
  { quote_id: q.id, slip_id: crypto.randomUUID() },
  { expect: 400 },
);
pass("Order submission requires an owned payment proof");
await guest("proofs?quote=" + q.id, Buffer.from("not a png"), {
  raw: true,
  headers: { "Content-Type": "image/png" },
  expect: 415,
});
pass("Disguised file types are rejected");
const pdf = await PDFDocument.create();
pdf.addPage().drawText("LOCAL QA PROOF " + stamp + " - NOT A PAYMENT");
const bytes = await pdf.save();
const proof = (
  await guest("proofs?quote=" + q.id, bytes, {
    raw: true,
    headers: { "Content-Type": "application/pdf" },
  })
).data;
assert.equal(proof.status, "OCR_FAILED");
assert.equal(proof.detected_amount, null);
pass("Unconfigured OCR honestly falls back to manual review");
const q2 = (await stranger("quote", customer)).data;
const proof2 = (
  await stranger("proofs?quote=" + q2.id, bytes, {
    raw: true,
    headers: { "Content-Type": "application/pdf" },
  })
).data;
const concurrent = await Promise.all([
  guest("orders", { quote_id: q.id, slip_id: proof.id }, { expect: 201 }),
  stranger("orders", { quote_id: q2.id, slip_id: proof2.id }, { expect: 201 }),
]);
const order = concurrent[0].data;
const books = (await admin("manage/books")).data;
assert.equal(books.find((b) => b.id === bookId).stock, undefined);
assert.ok(concurrent[1].data.id);
pass("Concurrent orders can be placed without stock limits");
const retry = (await guest("orders", { quote_id: q.id, slip_id: proof.id }))
  .data;
assert.equal(retry.id, order.id);
assert.equal(retry.replayed, true);
pass("Submitting the same quote twice is idempotent");
const publicTracking = (await stranger("orders/" + order.reference)).data;
assert.equal(publicTracking.reference, order.reference);
assert.equal(publicTracking.tracking_only, true);
assert.equal("phone" in publicTracking, false);
assert.equal("address" in publicTracking, false);
await stranger("orders/" + order.id + "/receipt", undefined, { expect: 404 });
await campus("manage/orders/" + order.id, undefined, { expect: 404 });
const campusList = (await campus("manage/orders")).data;
assert.equal(
  campusList.rows.some((o) => o.id === order.id),
  false,
);
pass(
  "Order ID tracking is public; receipts and campus tenant boundaries stay protected",
);
assert.equal("tracking" in order, false);
assert.equal("tracking_hash" in publicTracking, false);
pass("Order tracking needs no separate key and excludes stored credentials");
let details = (await admin("manage/orders/" + order.id)).data;
await admin(
  "manage/orders/" + order.id,
  { action: "status", status: "SHIPPED", version: details.version, note: "" },
  { expect: 409 },
);
await admin("manage/orders/" + order.id, {
  action: "approve",
  version: details.version,
  note: "QA bank verification",
});
await admin(
  "manage/orders/" + order.id,
  { action: "approve", version: details.version, note: "" },
  { expect: 409 },
);
assert.equal(
  (await admin("manage/orders/" + order.id)).data.inventory_state,
  "RELEASED",
);
pass("Approval is idempotent and rejects illegal status jumps");
details = (await guest("orders/" + order.id)).data;
assert.equal(details.payment_status, "VERIFIED");
const receipt = (
  await guest("orders/" + order.id + "/receipt", undefined, { binary: true })
).data;
assert.equal(new TextDecoder().decode(receipt.slice(0, 5)), "%PDF-");
const rd = await PDFDocument.load(receipt);
assert.ok(rd.getPageCount() >= 1);
pass("Authenticated receipt endpoint generates a readable PDF");
details = (await admin("manage/orders/" + order.id)).data;
await admin("manage/orders/" + order.id, {
  action: "status",
  status: "CANCELLED",
  version: details.version,
  note: "QA cancellation",
});
assert.equal(
  (await admin("manage/orders/" + order.id)).data.status,
  "CANCELLED",
);
pass("Cancelling an unshipped order works without inventory");
const campuses = (await admin("manage/campuses")).data;
const c = campuses.find((c) => c.id === campusB);
await admin("manage/campuses/" + campusB, {
  ...c,
  permissions: JSON.parse(c.permissions),
  active: false,
});
await campus("manage/orders", undefined, { expect: 401 });
pass("Disabling a campus immediately revokes its sessions");
const audit = (await admin("manage/audit")).data;
assert.ok(audit.some((a) => a.action === "PAYMENT_APPROVE"));
assert.ok(audit.some((a) => a.action === "ORDER_STATUS"));
assert.ok(!JSON.stringify(audit).includes(tempPassword));
pass("Payment decisions are audited without passwords");
const newq = (await guest("quote", customer)).data;
const secondPdf = await PDFDocument.create();
secondPdf.addPage().drawText("SECOND QA RECEIPT " + stamp);
const newBytes = await secondPdf.save();
const newproof = (
  await guest("proofs?quote=" + newq.id, newBytes, {
    raw: true,
    headers: { "Content-Type": "application/pdf" },
  })
).data;
const prices = (await admin("manage/pricing")).data.prices;
const p = prices.find((p) => p.id === "D");
await admin("manage/pricing", {
  category: "D",
  rate: p.rate + 1,
  version: p.version,
  confirmed: true,
});
await guest(
  "orders",
  { quote_id: newq.id, slip_id: newproof.id },
  { expect: 409 },
);
const changed = (await guest("catalog")).data.books.find(
  (b) => b.id === bookId,
);
assert.equal(changed.price, 100 * (p.rate + 1));
const p2 = (await admin("manage/pricing")).data.prices.find(
  (p) => p.id === "D",
);
await admin("manage/pricing", {
  category: "D",
  rate: p.rate,
  version: p2.version,
  confirmed: true,
});
pass("Student category edits reprice books and stale quotes are rejected");
const report = (await admin("manage/reports")).data;
assert.ok(report.stats.total_orders >= 1);
assert.equal(typeof report.stats.total_sales, "number");
pass("Reports return persisted order and catalog aggregates");
await admin("manage/books/" + bookId, {}, { method: "DELETE" });
pass("Book deletion preserves historical records by archiving");
fs.mkdirSync(".sites-runtime", { recursive: true });
fs.writeFileSync(
  ".sites-runtime/integration-results.json",
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      passed: results.length,
      tests: results,
    },
    null,
    2,
  ),
);
console.log(`\n${results.length} integration scenarios passed.`);
