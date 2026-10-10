import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";
import { scryptSync, randomBytes } from "node:crypto";

function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$3$${salt}$${scryptSync(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
}

const dir = "f:/BookStore/.wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = readdirSync(dir).filter(f => f.endsWith(".sqlite") && f !== "metadata.sqlite");

if (!files.length) {
  console.log("No sqlite database file found.");
  process.exit(1);
}

const dbPath = `${dir}/${files[0]}`;
console.log("Database path:", dbPath);
const db = new DatabaseSync(dbPath);

// Clear rate limits
db.exec("DELETE FROM rate_limits");
console.log("Rate limits cleared.");

// Get users
const users = db.prepare("SELECT id, email, name, role, active, must_change FROM users").all();
console.log("Existing Users:", users);

// Reset admin password to AdminPass123! and must_change = 0
const adminHash = passwordHash("AdminPass123!");
const update = db.prepare("UPDATE users SET password_hash=?, must_change=0, active=1 WHERE email='admin@campusbookstore.com'");
const res = update.run(adminHash);
console.log("Admin password updated:", res);

if (!users.some(u => u.email === 'admin@campusbookstore.com')) {
  console.log("Admin user missing! Creating super admin user...");
  const insert = db.prepare("INSERT INTO users(id, email, name, password_hash, role, must_change, active, created_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?)");
  insert.run(crypto.randomUUID(), "admin@campusbookstore.com", "Super Admin", adminHash, "SUPER_ADMIN", new Date().toISOString());
  console.log("Created admin@campusbookstore.com!");
}
