import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { createClient } from "@libsql/client";
import { migrateTurso } from "./turso-migrations.mjs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

// Always creates a fresh disposable DB; never reads the local bookstore's files or credentials.
await mkdir(".sites-runtime", { recursive: true });
const databasePath = `.sites-runtime/vercel-test-${randomUUID()}.sqlite`;
const url = `file:${databasePath}`;
const client = createClient({ url });
await migrateTurso(client, () => {});
const port = process.env.VERCEL_TEST_PORT || "5181";
const origin = `http://127.0.0.1:${port}`;
const bootstrapToken = randomBytes(32).toString("hex");
const password = "Qa-" + randomBytes(24).toString("hex") + "!";
const testEnv = {
  ...process.env,
  TURSO_DATABASE_URL: url,
  TURSO_AUTH_TOKEN: "",
  APP_ORIGIN: origin,
  BOOTSTRAP_EMAIL: "vercel-qa@example.invalid",
  BOOTSTRAP_PASSWORD: password,
  BOOTSTRAP_TOKEN: bootstrapToken,
};
delete testEnv.VERCEL;
let logs = "";
const server = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { env: testEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
);
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});
const request = async (path, body, cookie = "", headers = {}) => {
  const r = await fetch(origin + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      "X-Requested-With": "CampusBookstore",
      "Content-Type": "application/json",
      Cookie: cookie,
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(data)}`);
  return { r, data };
};
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin + "/admin/login")).ok) {
        ready = true;
        break;
      }
    } catch {}
    if (server.exitCode !== null)
      throw new Error("Native server exited before startup.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, "Native Next.js server did not start.");
  await request("/api/setup", {}, "", {
    Authorization: `Bearer ${bootstrapToken}`,
  });
  // Temporary QA account only. The real deployment retains forced first-login rotation.
  await client.execute("UPDATE users SET must_change=0");
  const login = await request("/api/login", {
    email: "vercel-qa@example.invalid",
    password,
    portal: "admin",
  });
  const adminCookie = login.r.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(adminCookie.includes("cbs_session="));
  const catalog = await request("/api/catalog");
  assert.ok(catalog.data.books.length > 0);
  assert.equal(catalog.data.settings.max_upload_mb, 4);
  const session = await request("/api/session");
  const guestCookie = session.r.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(guestCookie.includes("cbs_guest="));
  const customer = {
    name: "QA Student",
    phone: "03000000000",
    city: "Lahore",
    address: "QA address",
    delivery_type: "lahore",
    campus_id: null,
    items: [{ id: catalog.data.books[0].id, quantity: 2 }],
  };
  const quoted = await request("/api/quote", customer, guestCookie);
  const slipId = randomUUID();
  const quotedRow = await client.execute({
    sql: "SELECT owner FROM quotes WHERE id=?",
    args: [quoted.data.id],
  });
  await client.execute({
    sql: "INSERT INTO payment_slips(id,owner,object_key,mime,size,digest,ocr_status,detected_amount,ocr_message,created_at) VALUES(?,?,?,'image/png',10,?,'AMOUNT_MATCHED',?,'QA',?)",
    args: [
      slipId,
      quotedRow.rows[0].owner,
      "proofs/qa",
      randomUUID(),
      quoted.data.total,
      new Date().toISOString(),
    ],
  });
  const placed = await request(
    "/api/orders",
    { quote_id: quoted.data.id, slip_id: slipId },
    guestCookie,
  );
  const tracked = await request("/api/orders/" + placed.data.reference);
  assert.equal(tracked.data.tracking_only, true);
  assert.equal("address" in tracked.data, false);
  const count = await request(
    "/api/manage/orders/pending-count",
    undefined,
    adminCookie,
  );
  assert.equal(count.data.count, 1);
  await request(
    "/api/manage/orders/" + placed.data.id,
    { action: "approve", version: 1, note: "QA verified" },
    adminCookie,
  );
  assert.equal(
    (await request("/api/manage/orders/pending-count", undefined, adminCookie))
      .data.count,
    0,
  );
  const pdf = await fetch(
    origin + "/api/orders/" + placed.data.id + "/receipt",
    { headers: { Cookie: guestCookie } },
  );
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get("content-type"), "application/pdf");
  assert.equal(
    (await fetch(origin + "/api/orders/" + placed.data.id + "/receipt")).status,
    404,
  );
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  assert.ok((await home.text()).includes("Your Campus"));
  console.log(
    "Native Next.js smoke test passed: setup, login, catalog, quote, checkout, public tracking, pending badge, confirmation, private PDF and security headers.",
  );
} catch (error) {
  console.error(
    logs
      .replaceAll(password, "[redacted]")
      .replaceAll(bootstrapToken, "[redacted]"),
  );
  throw error;
} finally {
  if (process.platform === "win32")
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
  else server.kill();
  await new Promise((resolve) =>
    server.exitCode !== null ? resolve() : server.once("exit", resolve),
  );
  client.close();
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      await rm(databasePath + suffix, { force: true });
    } catch (error) {
      if (error.code !== "EBUSY") throw error;
    }
  }
}
