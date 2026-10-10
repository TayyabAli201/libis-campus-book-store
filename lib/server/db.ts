import { env } from "@bookstore-runtime";
export const runtime = () => env as Cloudflare.Env & Record<string, unknown>;
export const db = () => {
  if (!env.DB) throw new Error("Database binding unavailable");
  return env.DB;
};
export const bucket = () => {
  if (!env.BUCKET) throw new Error("Storage binding unavailable");
  return env.BUCKET;
};
export const one = <T = Record<string, any>>(
  query: string,
  ...values: unknown[]
) =>
  db()
    .prepare(query)
    .bind(...values)
    .first<T>();
export const all = async <T = Record<string, any>>(
  query: string,
  ...values: unknown[]
) =>
  (
    await db()
      .prepare(query)
      .bind(...values)
      .all<T>()
  ).results;
export const stmt = (query: string, ...values: unknown[]) =>
  db()
    .prepare(query)
    .bind(...values);
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export function guard(query: string, ...values: unknown[]) {
  return stmt(
    `INSERT INTO transaction_guards(id,ok) VALUES (?,CASE WHEN (${query}) THEN 1 ELSE 0 END)`,
    uid(),
    ...values,
  );
}
export async function batch(statements: D1PreparedStatement[]) {
  try {
    return await db().batch([
      ...statements,
      stmt("DELETE FROM transaction_guards"),
    ]);
  } catch (e) {
    const m = String(e);
    if (/constraint|unique/i.test(m))
      throw new AppError(
        409,
        "This record or price changed. Refresh and try again.",
      );
    throw e;
  }
}
export class AppError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
export function auditStmt(
  actor: string,
  action: string,
  entity: string,
  before: unknown,
  after: unknown,
  req?: Request,
) {
  return stmt(
    "INSERT INTO audit_logs(id,actor,action,entity,before,after,device,created_at) VALUES(?,?,?,?,?,?,?,?)",
    uid(),
    actor,
    action,
    entity,
    before === undefined ? null : JSON.stringify(before),
    after === undefined ? null : JSON.stringify(after),
    (req?.headers.get("user-agent") || "system").slice(0, 250),
    now(),
  );
}
