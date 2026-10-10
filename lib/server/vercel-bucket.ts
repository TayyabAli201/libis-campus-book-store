import { get, put, del } from "@vercel/blob";

// Keep original object keys, so existing proof/cover API authorization stays intact.
export function createVercelBucket(
  operations = { get, put, del },
  getDb?: () => any,
) {
  const isCustomOperations =
    operations.put !== put || operations.get !== get || operations.del !== del;

  return {
    async put(
      key: string,
      bytes: Uint8Array,
      options?: { httpMetadata?: { contentType?: string } },
    ) {
      if (isCustomOperations) {
        return operations.put(key, Buffer.from(bytes), {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: options?.httpMetadata?.contentType,
        });
      }

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          return await operations.put(key, Buffer.from(bytes), {
            access: "private",
            addRandomSuffix: false,
            allowOverwrite: false,
            contentType: options?.httpMetadata?.contentType,
          });
        } catch (err) {
          console.warn(
            "Vercel Blob put failed, falling back to database storage:",
            err,
          );
          if (!getDb) throw err;
        }
      }

      if (getDb) {
        const db = getDb();
        await db
          .prepare(
            "CREATE TABLE IF NOT EXISTS storage_objects (key TEXT PRIMARY KEY, content BLOB NOT NULL, content_type TEXT NOT NULL, created_at TEXT NOT NULL)",
          )
          .run();
        await db
          .prepare(
            "INSERT OR REPLACE INTO storage_objects(key, content, content_type, created_at) VALUES (?, ?, ?, ?)",
          )
          .bind(
            key,
            Buffer.from(bytes),
            options?.httpMetadata?.contentType || "application/octet-stream",
            new Date().toISOString(),
          )
          .run();
        return { url: `/api/proofs/${key.replace(/^proofs\//, "")}` };
      }

      return operations.put(key, Buffer.from(bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: options?.httpMetadata?.contentType,
      });
    },

    async get(key: string) {
      if (isCustomOperations) {
        const object = await operations.get(key, {
          access: "private",
          useCache: false,
        });
        if (!object || object.statusCode !== 200) return null;
        return {
          body: object.stream,
          httpMetadata: { contentType: object.blob.contentType },
        };
      }

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const object = await operations.get(key, {
            access: "private",
            useCache: false,
          });
          if (object && object.statusCode === 200) {
            return {
              body: object.stream,
              httpMetadata: { contentType: object.blob.contentType },
            };
          }
        } catch (err) {
          console.warn(
            "Vercel Blob get failed, checking database storage:",
            err,
          );
        }
      }

      if (getDb) {
        try {
          const db = getDb();
          const row = await db
            .prepare(
              "SELECT content, content_type FROM storage_objects WHERE key=?",
            )
            .bind(key)
            .first();
          if (row) {
            return {
              body: row.content,
              httpMetadata: { contentType: row.content_type },
            };
          }
        } catch {}
      }

      return null;
    },

    async delete(key: string) {
      if (isCustomOperations) {
        await operations.del(key);
        return;
      }

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          await operations.del(key);
        } catch {}
      }

      if (getDb) {
        try {
          const db = getDb();
          await db
            .prepare("DELETE FROM storage_objects WHERE key=?")
            .bind(key)
            .run();
        } catch {}
      }
    },
  };
}
