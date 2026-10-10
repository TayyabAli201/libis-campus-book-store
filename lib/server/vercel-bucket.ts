import { get, put, del } from "@vercel/blob";

// Keep original object keys, so existing proof/cover API authorization stays intact.
export function createVercelBucket(operations = { get, put, del }) {
  return {
    async put(
      key: string,
      bytes: Uint8Array,
      options?: { httpMetadata?: { contentType?: string } },
    ) {
      return operations.put(key, Buffer.from(bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: options?.httpMetadata?.contentType,
      });
    },
    async get(key: string) {
      const object = await operations.get(key, {
        access: "private",
        useCache: false,
      });
      if (!object || object.statusCode !== 200) return null;
      return {
        body: object.stream,
        httpMetadata: { contentType: object.blob.contentType },
      };
    },
    async delete(key: string) {
      await operations.del(key);
    },
  };
}
