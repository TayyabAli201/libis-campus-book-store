import { globSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import { migrations } from "./turso-migrations.mjs";

const d1Files = globSync(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite")
  .filter((f) => !f.endsWith("metadata.sqlite"));

if (d1Files.length === 0) {
  console.log("No D1 SQLite files found in .wrangler state.");
}

for (const file of d1Files) {
  console.log(`Migrating local D1 database file: ${file}`);
  const client = createClient({ url: `file:${file}` });
  await client.execute(
    "CREATE TABLE IF NOT EXISTS __bookstore_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );

  for (const name of migrations) {
    const rawSource = readFileSync(
      new URL("../drizzle/" + name, import.meta.url),
      "utf8",
    );
    const checksum = createHash("sha256")
      .update(rawSource.replace(/\r\n/g, "\n"))
      .digest("hex");

    const applied = await client.execute({
      sql: "SELECT checksum FROM __bookstore_migrations WHERE name=?",
      args: [name],
    });
    if (applied.rows.length) {
      continue;
    }

    const statements = rawSource
      .replace(/\r\n/g, "\n")
      .split("--> statement-breakpoint")
      .map((sql) => sql.trim())
      .filter(Boolean);

    for (const sql of statements) {
      try {
        await client.execute(sql);
      } catch (err) {
        if (
          err.message?.includes("duplicate column name") ||
          err.message?.includes("already exists")
        ) {
          console.log(`Note: ${err.message} (skipping statement)`);
        } else {
          throw err;
        }
      }
    }

    await client.execute({
      sql: "INSERT OR REPLACE INTO __bookstore_migrations(name,checksum,applied_at) VALUES(?,?,?)",
      args: [name, checksum, new Date().toISOString()],
    });
    console.log(`Applied ${name}`);
  }
  client.close();
}

console.log("Migration complete!");
