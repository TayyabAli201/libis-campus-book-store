import type { Client, InValue, ResultSet } from "@libsql/client";

function result<T>(data: ResultSet) {
  return {
    success: true,
    results: data.rows.map((row) =>
      Object.fromEntries(Object.entries(row)),
    ) as T[],
    meta: {
      changes: data.rowsAffected,
      last_row_id: Number(data.lastInsertRowid ?? 0),
    },
  };
}

export class LibsqlStatement {
  private client: Client;
  sql: string;
  values: InValue[];
  constructor(client: Client, sql: string, values: InValue[] = []) {
    this.client = client;
    this.sql = sql;
    this.values = values;
  }
  bind(...values: unknown[]) {
    return new LibsqlStatement(this.client, this.sql, values as InValue[]);
  }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const data = await this.all<Record<string, unknown>>();
    const row = data.results[0];
    return (row ? (column ? row[column] : row) : null) as T | null;
  }
  async all<T = Record<string, unknown>>() {
    return result<T>(
      await this.client.execute({ sql: this.sql, args: this.values }),
    );
  }
  async run() {
    return this.all();
  }
}

export class LibsqlDatabase {
  private client: Client;
  constructor(client: Client) {
    this.client = client;
  }
  prepare(sql: string) {
    return new LibsqlStatement(this.client, sql);
  }
  async batch(statements: LibsqlStatement[]) {
    // D1's atomic batch is required by checkout guards and payment decisions.
    const data = await this.client.batch(
      statements.map((s) => ({ sql: s.sql, args: s.values })),
      "write",
    );
    return data.map((row) => result(row));
  }
}
