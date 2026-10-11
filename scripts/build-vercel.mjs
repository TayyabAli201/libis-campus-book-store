import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (process.env.TURSO_DATABASE_URL) {
  try {
    const { createClient } = await import("@libsql/client");
    const { migrateTurso } = await import("./turso-migrations.mjs");
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    try {
      await migrateTurso(client, console.log);
      console.log("Turso database schema verified and up to date.");
    } finally {
      client.close();
    }
  } catch (err) {
    console.error("Warning: Turso migration step failed:", err.message);
  }
}

const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/next/dist/bin/next", import.meta.url),
    ),
    "build",
  ],
  { stdio: "inherit", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (!existsSync(new URL("../.next/routes-manifest.json", import.meta.url)))
  throw new Error(
    "Next.js did not produce the routes manifest required by Vercel.",
  );
console.log("Vercel build verified: .next/routes-manifest.json exists.");
