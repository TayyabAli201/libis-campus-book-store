import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const migrations = [
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
  "0013_item_unavailable_workflow.sql",
  "0014_item_office_stock.sql",
  "0015_student_partial_handover.sql",
];
export async function migrateTurso(client, log = console.log) {
  await client.execute(
    "CREATE TABLE IF NOT EXISTS __bookstore_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  for (const name of migrations) {
    const rawSource = readFileSync(
      new URL("../drizzle/" + name, import.meta.url),
      "utf8",
    );
    const source = rawSource.replace(/\r\n/g, "\n");
    const rawChecksum = createHash("sha256").update(rawSource).digest("hex");
    const lfChecksum = createHash("sha256")
      .update(rawSource.replace(/\r\n/g, "\n"))
      .digest("hex");
    const crlfChecksum = createHash("sha256")
      .update(rawSource.replace(/\r?\n/g, "\r\n"))
      .digest("hex");
    const checksum = lfChecksum;
    const applied = await client.execute({
      sql: "SELECT checksum FROM __bookstore_migrations WHERE name=?",
      args: [name],
    });
    if (applied.rows.length) {
      const stored = applied.rows[0].checksum;
      if (stored !== lfChecksum && stored !== crlfChecksum && stored !== rawChecksum)
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
