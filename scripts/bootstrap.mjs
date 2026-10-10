// Run against a fresh, migrated database. Values must come from the environment.
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
if (!process.env.BOOTSTRAP_TOKEN)
  throw new Error("Set BOOTSTRAP_TOKEN before running bootstrap.");
const r = await fetch(origin + "/api/setup", {
  method: "POST",
  headers: { Authorization: "Bearer " + process.env.BOOTSTRAP_TOKEN },
});
const d = await r.json();
if (!r.ok) throw new Error(d.error);
console.log("Database initialized. Sign in and change the temporary password.");
