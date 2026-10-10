import { globSync } from "node:fs";
import { createClient } from "@libsql/client";
import { migrateTurso } from "./turso-migrations.mjs";

const d1Files = globSync(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite")
  .filter((f) => !f.endsWith("metadata.sqlite"));

if (d1Files.length === 0) {
  console.log("No D1 SQLite files found in .wrangler state.");
}

for (const file of d1Files) {
  console.log(`Migrating local D1 database file: ${file}`);
  const client = createClient({ url: `file:${file}` });
  await migrateTurso(client, console.log);
  client.close();
}

console.log("Migration complete!");
