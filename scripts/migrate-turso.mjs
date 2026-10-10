import { createClient } from "@libsql/client";
import { existsSync } from "node:fs";
import { migrateTurso } from "./turso-migrations.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.TURSO_DATABASE_URL)
  throw new Error(
    "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local or the shell environment.",
  );
if (
  process.env.VERCEL &&
  !/^(libsql|https):\/\//.test(process.env.TURSO_DATABASE_URL)
)
  throw new Error("Vercel requires a remote database.");
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
try {
  await migrateTurso(client);
  console.log("Database schema is ready. Existing records were preserved.");
} finally {
  client.close();
}
