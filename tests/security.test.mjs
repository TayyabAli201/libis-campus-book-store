import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { env } from "./helpers/cloudflare-test-env.mjs";

// Exercise the real authentication and SQL against disposable SQLite, without
// reading credentials, rotating passwords or changing the running bookstore.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "cloudflare:workers" ||
      specifier === "@bookstore-runtime"
    )
      return {
        url: new URL("./helpers/cloudflare-test-env.mjs", import.meta.url).href,
        shortCircuit: true,
      };
    if (
      specifier === "./db" &&
      context.parentURL?.endsWith("/lib/server/security.ts")
    )
      return {
        url: new URL("../lib/server/db.ts", import.meta.url).href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
const { authenticate, passwordHash, hash, csrf, rate, cookie } =
  await import("../lib/server/security.ts");
const password = "Disposable-Test-Password-493!";
test("CSRF accepts a configured proxy origin and rejects arbitrary forwarded hosts", () => {
  env.APP_ORIGIN = "https://bookstore.example";
  try {
    const make = (origin, extra = {}) =>
      new Request("http://localhost:3000/api/orders", {
        headers: { origin, "X-Requested-With": "CampusBookstore", ...extra },
      });
    assert.doesNotThrow(() => csrf(make("https://bookstore.example")));
    assert.throws(
      () =>
        csrf(
          make("https://attacker.example", {
            "x-forwarded-host": "attacker.example",
          }),
        ),
      /origin/,
    );
    assert.throws(
      () => csrf(make("https://bookstore.example", { "X-Requested-With": "" })),
      /origin/,
    );
  } finally {
    delete env.APP_ORIGIN;
  }
});
const encoded = passwordHash(password);
const request = new Request("http://127.0.0.1:5173/api/login", {
  method: "POST",
  headers: { "cf-connecting-ip": "127.0.0.1" },
});
function database(t) {
  t.mock.method(Date, "now", () => 1790982030000);
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    readFileSync(
      new URL("../drizzle/0000_modern_marrow.sql", import.meta.url),
      "utf8",
    ),
  );
  sqlite
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,role,must_change,created_at) VALUES(?,?,?,?,?,0,?)",
    )
    .run(
      "qa-admin",
      "qa@example.invalid",
      "QA admin",
      encoded,
      "SUPER_ADMIN",
      new Date().toISOString(),
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
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  t.after(() => sqlite.close());
  return sqlite;
}
test("successful sign-ins do not exhaust the failed-login budget", async (t) => {
  const sqlite = database(t);
  for (let i = 0; i < 12; i++) {
    const result = await authenticate(
      request,
      " QA@example.invalid ",
      password,
      "admin",
    );
    assert.match(result.token, /^[a-f0-9]{64}$/);
  }
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM sessions").get().count,
    12,
  );
});
test("successful login clears earlier failures; repeated bad passwords still lock out", async (t) => {
  database(t);
  for (let i = 0; i < 7; i++)
    await assert.rejects(
      authenticate(request, "qa@example.invalid", "wrong", "admin"),
      (error) => error.status === 401,
    );
  await authenticate(request, "qa@example.invalid", password, "admin");
  for (let i = 0; i < 8; i++)
    await assert.rejects(
      authenticate(request, "qa@example.invalid", "wrong", "admin"),
      (error) => error.status === 401,
    );
  await assert.rejects(
    authenticate(request, "qa@example.invalid", password, "admin"),
    (error) => {
      assert.equal(error.status, 429);
      assert.ok(error.retryAfterSeconds > 0 && error.retryAfterSeconds <= 900);
      assert.match(error.message, /Try again in \d+ minutes?\./);
      return true;
    },
  );
});
test("network burst protection still blocks excessive login traffic", async (t) => {
  const sqlite = database(t);
  const window = Math.floor(Date.now() / 1000 / 60);
  sqlite
    .prepare("INSERT INTO rate_limits(id,count,expires_at) VALUES(?,60,?)")
    .run(hash(`login-requests:127.0.0.1:${window}`), (window + 1) * 60);
  await assert.rejects(
    authenticate(request, "qa@example.invalid", password, "admin"),
    (error) => error.status === 429,
  );
  assert.equal(
    sqlite.prepare("SELECT COUNT(*) AS count FROM sessions").get().count,
    0,
  );
});
test("expired failure windows do not block a valid login", async (t) => {
  const sqlite = database(t);
  const window = Math.floor(Date.now() / 1000 / 900);
  sqlite
    .prepare("INSERT INTO rate_limits(id,count,expires_at) VALUES(?,99,?)")
    .run(hash(`login-email:qa@example.invalid:${window - 1}`), window * 900);
  const result = await authenticate(
    request,
    "qa@example.invalid",
    password,
    "admin",
  );
  assert.ok(result.token);
});

test("Vercel isolates rate limits by client IP and sets secure cookies behind its proxy", async (t) => {
  database(t);
  env.VERCEL = "1";
  try {
    const first = new Request("http://localhost:3000/api/orders", {
      headers: { "x-forwarded-for": "192.0.2.1", "cf-connecting-ip": "shared" },
    });
    const second = new Request("http://localhost:3000/api/orders", {
      headers: { "x-forwarded-for": "192.0.2.2", "cf-connecting-ip": "shared" },
    });
    await rate(first, "vercel-test", 1);
    await rate(second, "vercel-test", 1);
    await assert.rejects(
      rate(first, "vercel-test", 1),
      (error) => error.status === 429,
    );
    assert.match(cookie(first, "cbs_session", "test", 60), /; Secure$/);
  } finally {
    delete env.VERCEL;
  }
});
