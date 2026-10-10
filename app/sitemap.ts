import { catalog } from "@/lib/server/catalog";
import { runtime } from "@/lib/server/db";
export const dynamic = "force-dynamic";
export default async function sitemap() {
  const origin = String(
    runtime().APP_ORIGIN ||
      "https://campus-bookstore-hub.bilal807854.chatgpt.site",
  );
  let books: Awaited<ReturnType<typeof catalog>> = [];
  try {
    books = await catalog();
  } catch {}
  return [
    "",
    "/books",
    "/about",
    "/contact",
    "/faq",
    ...books.map((b) => "/books/" + b.code.toLowerCase()),
  ].map((path) => ({ url: origin + path, changeFrequency: "weekly" as const }));
}
