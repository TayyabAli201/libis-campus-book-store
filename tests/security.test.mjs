import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync } from "node:fs";
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
    if (specifier.startsWith("@/"))
      return {
        url: new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href,
        shortCircuit: true,
      };
    if (
      specifier.startsWith(".") &&
      (context.parentURL?.includes("/lib/") ||
        context.parentURL?.includes("/app/")) &&
      !/\.[a-z]+$/.test(specifier)
    ) {
      const url = new URL(specifier + ".ts", context.parentURL);
      if (existsSync(url)) return { url: url.href, shortCircuit: true };
    }
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
const { POST } = await import("../app/api/[...path]/route.ts");
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
  for (const file of [
    "0000_modern_marrow.sql",
    "0005_password_resets.sql",
    "0017_password_resets_security.sql",
  ]) {
    sqlite.exec(
      readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8"),
    );
  }
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

function makeApiRequest(path, body, headers = {}) {
  return new Request(`http://127.0.0.1:5173${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requested-with": "CampusBookstore",
      origin: "http://127.0.0.1:5173",
      "cf-connecting-ip": "127.0.0.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("forgot-password returns generic message without leaking email existence or sent_to", async (t) => {
  const sqlite = database(t);

  // Non-existent email
  const resUnknown = await POST(
    makeApiRequest("/api/forgot-password", { email: "nobody@example.invalid" }),
  );
  assert.equal(resUnknown.status, 200);
  const dataUnknown = await resUnknown.json();
  assert.equal(
    dataUnknown.message,
    "If an account matches that email, a verification code has been sent.",
  );
  assert.equal(dataUnknown.sent_to, undefined);

  // Existing user
  const resUser = await POST(
    makeApiRequest("/api/forgot-password", { email: "qa@example.invalid" }),
  );
  assert.equal(resUser.status, 200);
  const dataUser = await resUser.json();
  assert.equal(
    dataUser.message,
    "If an account matches that email, a verification code has been sent.",
  );
  assert.equal(dataUser.sent_to, undefined);

  // Check stored record: code and token MUST be hashed (64 hex characters)
  const record = sqlite
    .prepare("SELECT * FROM password_resets WHERE lower(email)='qa@example.invalid'")
    .get();
  assert.ok(record, "Password reset record created");
  assert.match(record.code, /^[a-f0-9]{64}$/, "Code must be stored as SHA-256 hash");
  assert.match(record.token, /^[a-f0-9]{64}$/, "Token must be stored as SHA-256 hash");
  assert.equal(record.attempts, 0);
  assert.equal(record.used, 0);
});

test("reset-password locks out after 5 wrong code attempts", async (t) => {
  const sqlite = database(t);
  const code = "834912";
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO password_resets(id, user_id, email, code, token, expires_at, used, created_at, attempts) VALUES(?, ?, ?, ?, ?, ?, 0, ?, 0)",
    )
    .run(
      "reset-1",
      "qa-admin",
      "qa@example.invalid",
      hash(code),
      hash("some-token"),
      now + 900000,
      new Date(now).toISOString(),
    );

  // 4 wrong attempts
  for (let i = 1; i <= 4; i++) {
    const res = await POST(
      makeApiRequest(
        "/api/reset-password",
        {
          email: "qa@example.invalid",
          code: "000000",
          new_password: "New-Password-1234!",
        },
        { "cf-connecting-ip": `192.0.2.${i}` },
      ),
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Invalid/);
    const record = sqlite
      .prepare("SELECT attempts, used FROM password_resets WHERE id='reset-1'")
      .get();
    assert.equal(record.attempts, i);
    assert.equal(record.used, 0);
  }

  // 5th wrong attempt locks out and invalidates code
  const res5 = await POST(
    makeApiRequest(
      "/api/reset-password",
      {
        email: "qa@example.invalid",
        code: "000000",
        new_password: "New-Password-1234!",
      },
      { "cf-connecting-ip": "192.0.2.5" },
    ),
  );
  assert.equal(res5.status, 400);
  const body5 = await res5.json();
  assert.match(body5.error, /Too many failed attempts/);
  const record5 = sqlite
    .prepare("SELECT attempts, used FROM password_resets WHERE id='reset-1'")
    .get();
  assert.equal(record5.attempts, 5);
  assert.equal(record5.used, 1);

  // Now even with rate limit cleared and the correct code, the reset record is rejected because it was invalidated
  sqlite.exec("DELETE FROM rate_limits");
  const resCorrect = await POST(
    makeApiRequest(
      "/api/reset-password",
      {
        email: "qa@example.invalid",
        code: code,
        new_password: "New-Password-1234!",
      },
      { "cf-connecting-ip": "192.0.2.6" },
    ),
  );
  assert.equal(resCorrect.status, 400);
});

test("reset-password rejects expired reset codes", async (t) => {
  const sqlite = database(t);
  const code = "654321";
  const now = Date.now();
  sqlite
    .prepare(
      "INSERT INTO password_resets(id, user_id, email, code, token, expires_at, used, created_at, attempts) VALUES(?, ?, ?, ?, ?, ?, 0, ?, 0)",
    )
    .run(
      "reset-exp",
      "qa-admin",
      "qa@example.invalid",
      hash(code),
      hash("token-exp"),
      now - 1000,
      new Date(now - 100000).toISOString(),
    );

  const res = await POST(
    makeApiRequest("/api/reset-password", {
      email: "qa@example.invalid",
      code: code,
      new_password: "New-Password-1234!",
    }),
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /Invalid or expired/);
});

test("reset-password rate limits attempts per IP and per email", async (t) => {
  database(t);
  const testIp = "198.51.100.99";
  // 5 attempts are allowed
  for (let i = 0; i < 5; i++) {
    const res = await POST(
      makeApiRequest(
        "/api/reset-password",
        {
          email: "qa@example.invalid",
          code: "999999",
          new_password: "New-Password-1234!",
        },
        { "cf-connecting-ip": testIp },
      ),
    );
    assert.equal(res.status, 400);
  }

  // 6th attempt triggers 429
  const resBlocked = await POST(
    makeApiRequest(
      "/api/reset-password",
      {
        email: "qa@example.invalid",
        code: "999999",
        new_password: "New-Password-1234!",
      },
      { "cf-connecting-ip": testIp },
    ),
  );
  assert.equal(resBlocked.status, 429);
  const body = await resBlocked.json();
  assert.match(body.error, /Too many attempts/);
});
