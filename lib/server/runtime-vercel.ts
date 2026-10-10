import { createClient } from "@libsql/client";
import { LibsqlDatabase } from "./libsql-database";
import { createVercelBucket } from "./vercel-bucket";

let database: LibsqlDatabase | undefined;

function getDatabase(): LibsqlDatabase {
  if (!database) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url)
      throw new Error(
        "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel before opening the bookstore.",
      );
    if (process.env.VERCEL && !/^(libsql|https):\/\//.test(url))
      throw new Error(
        "Vercel requires a remote Turso database; local files are not persistent.",
      );
    database = new LibsqlDatabase(
      createClient({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
        intMode: "number",
      }),
    );
  }
  return database;
}

const storage = createVercelBucket(undefined, getDatabase);

export const env = {
  ...process.env,
  // Vercel's Function request-body limit is 4.5 MB; leave room for headers.
  MAX_UPLOAD_MB: 4,
  APP_ORIGIN:
    process.env.APP_ORIGIN ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  get DB() {
    return getDatabase() as unknown as D1Database;
  },
  get BUCKET() {
    return storage as unknown as R2Bucket;
  },
};
