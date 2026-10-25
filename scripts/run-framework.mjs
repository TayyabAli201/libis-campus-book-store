import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command))
  throw new Error("Expected dev or build.");
if (command === "build" && process.env.VERCEL === "1") {
  await import("./build-vercel.mjs");
  process.exit(0);
}
if (command === "dev" && fs.existsSync(".env.local")) {
  try {
    process.loadEnvFile(".env.local");
    try {
      await import("./migrate-local.mjs");
    } catch {}
    if (process.env.TURSO_DATABASE_URL) {
      const { createClient } = await import("@libsql/client");
      const { migrateTurso } = await import("./turso-migrations.mjs");
      const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      try {
        await migrateTurso(client, () => {});
      } finally {
        client.close();
      }
    }
  } catch {}
}
const managedLinux = readExecutionProfile() === "managed-linux";

if (managedLinux && command === "build") {
  const result = spawnSync(
    "bash",
    [fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(
  managedLinux
    ? "../node_modules/vite/bin/vite.js"
    : "../node_modules/vinext/dist/cli.js",
  import.meta.url,
);
process.argv = [
  process.execPath,
  fileURLToPath(cli),
  command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []),
  ...args,
];
await import(cli.href);
