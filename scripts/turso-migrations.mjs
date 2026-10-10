import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const migrations = [
  "0000_modern_marrow.sql",
  "0001_swift_scream.sql",
  "0002_bizarre_thena.sql",
  "0003_clear_book_catalog.sql",
];
export async function migrateTurso(client, log = console.log) {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS __bookstore_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  for (const name of migrations) {
    const source = readFileSync(
      new URL("../drizzle/" + name, import.meta.url),
      "utf8",
    );
    const checksum = createHash("sha256").update(source).digest("hex");
    const applied = await client.execute({
      sql: "SELECT checksum FROM __bookstore_migrations WHERE name=?",
      args: [name],
    });
    if (applied.rows.length) {
      if (applied.rows[0].checksum !== checksum)
        throw new Error(`Previously applied migration was modified: ${name}`);
      continue;
    }
    const statements = source
      .split("--> statement-breakpoint")
      .map((sql) => sql.trim())
      .filter(Boolean);
    // libSQL migrate executes the schema batch atomically with foreign-key checks deferred.
    await client.migrate([
      ...statements,
      {
        sql: "INSERT INTO __bookstore_migrations(name,checksum,applied_at) VALUES(?,?,?)",
        args: [name, checksum, new Date().toISOString()],
      },
    ]);
    log(`Applied ${name}`);
  }
}
