import { createClient } from "@libsql/client";
import { scryptSync, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
} else if (existsSync(".dev.vars")) {
  process.loadEnvFile(".dev.vars");
} else if (existsSync(".env.example")) {
  process.loadEnvFile(".env.example");
}

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

const adminEmail = (process.env.ADMIN_EMAIL || "admin@campusbookstore.com").trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || "AdminPass123!";

function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$3$${salt}$${scryptSync(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}

if (!url) {
  console.error("❌ ERROR: TURSO_DATABASE_URL environment variable is missing.");
  console.error("Please ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in .env.local or shell environment.");
  process.exit(1);
}

console.log(`Connecting to Turso Database: ${url}`);

const client = createClient({
  url,
  authToken: token,
});

try {
  // 1. Clear rate limits and expired sessions
  await client.execute("DELETE FROM rate_limits");
  await client.execute("DELETE FROM sessions");
  console.log("✅ Cleared rate limits and active session tokens.");

  // 2. Check if admin user exists
  const hash = passwordHash(adminPassword);
  const existing = await client.execute({
    sql: "SELECT id, email, role FROM users WHERE email = ?",
    args: [adminEmail],
  });

  if (existing.rows.length > 0) {
    // Update existing super admin account
    await client.execute({
      sql: "UPDATE users SET password_hash = ?, role = 'SUPER_ADMIN', active = 1, must_change = 0 WHERE email = ?",
      args: [hash, adminEmail],
    });
    console.log(`✅ Updated existing Admin account (${adminEmail}).`);
  } else {
    // Insert new super admin account
    await client.execute({
      sql: "INSERT INTO users(id, email, name, password_hash, role, must_change, active, created_at) VALUES(?, ?, ?, ?, 'SUPER_ADMIN', 0, 1, ?)",
      args: [crypto.randomUUID(), adminEmail, "Super Admin", hash, new Date().toISOString()],
    });
    console.log(`✅ Created fresh Super Admin account (${adminEmail}).`);
  }

  console.log("\n=========================================");
  console.log("🎉 SUPER ADMIN CREDENTIALS RESET SUCCESS!");
  console.log(`📧 Email:    ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log("=========================================\n");
} catch (error) {
  console.error("❌ Failed to reset admin credentials:", error);
  process.exit(1);
} finally {
  client.close();
}
