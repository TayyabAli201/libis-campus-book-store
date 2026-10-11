import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { LibsqlDatabase } from "../lib/server/libsql-database.ts";
import { createVercelBucket } from "../lib/server/vercel-bucket.ts";
import { migrateTurso } from "../scripts/turso-migrations.mjs";

test("Turso schema migrations are repeatable and preserve existing catalog rows", async (t) => {
  const client = createClient({ url: ":memory:" });
  t.after(() => client.close());
  await migrateTurso(client, () => {});
  await client.execute(
    "INSERT INTO pricing_categories(id,rate) VALUES('D',600)",
  );
  await client.execute(
    "INSERT INTO books(id,code,course_code,course_name,title,author,description,pages,category,active,created_at) VALUES('book','QA101','QA','QA','Draft book','','',NULL,'D',0,'2026-01-01')",
  );
  await migrateTurso(client, () => {});
  const db = new LibsqlDatabase(client);
  assert.equal(
    await db
      .prepare("SELECT COUNT(*) n FROM __bookstore_migrations")
      .first("n"),
    7,
  );
  assert.equal(
    (await db.prepare("SELECT * FROM books WHERE id=?").bind("book").first())
      .title,
    "Draft book",
  );
  assert.equal(
    await db.prepare("SELECT * FROM books WHERE id=?").bind("missing").first(),
    null,
  );
});

test("Turso transaction guard rolls back preceding writes and keeps statements independently bound", async (t) => {
  const client = createClient({ url: ":memory:" });
  t.after(() => client.close());
  const db = new LibsqlDatabase(client);
  await client.execute(
    "CREATE TABLE sample(id TEXT PRIMARY KEY,value INTEGER CHECK(value>0))",
  );
  const insert = db.prepare("INSERT INTO sample(id,value) VALUES(?,?)");
  await db.batch([insert.bind("first", 1), insert.bind("second", 2)]);
  await assert.rejects(
    db.batch([
      db.prepare("UPDATE sample SET value=99 WHERE id=?").bind("first"),
      insert.bind("invalid", 0),
    ]),
    /constraint/i,
  );
  assert.deepEqual(
    (await db.prepare("SELECT * FROM sample ORDER BY id").all()).results,
    [
      { id: "first", value: 1 },
      { id: "second", value: 2 },
    ],
  );
});

test("Vercel files remain private and preserve existing object keys and content types", async () => {
  const calls = [];
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  });
  const bucket = createVercelBucket({
    async put(...args) {
      calls.push(["put", ...args]);
      return {};
    },
    async get(...args) {
      calls.push(["get", ...args]);
      return args[0] === "missing"
        ? null
        : { statusCode: 200, stream, blob: { contentType: "image/png" } };
    },
    async del(...args) {
      calls.push(["del", ...args]);
    },
  });
  await bucket.put("proofs/test-id", new Uint8Array([1, 2, 3]), {
    httpMetadata: { contentType: "image/png" },
  });
  assert.equal(calls[0][1], "proofs/test-id");
  assert.equal(calls[0][3].access, "private");
  assert.equal(calls[0][3].allowOverwrite, false);
  assert.equal(calls[0][3].addRandomSuffix, false);
  assert.equal(calls[0][3].contentType, "image/png");
  assert.equal((await bucket.get("proofs/test-id")).body, stream);
  assert.equal(calls[1][2].access, "private");
  assert.equal(await bucket.get("missing"), null);
  await bucket.delete("proofs/test-id");
  assert.deepEqual(calls.at(-1), ["del", "proofs/test-id"]);
});
