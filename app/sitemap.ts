import { catalog } from "@/lib/server/catalog";
import { runtime } from "@/lib/server/db";
import { getAllBlogPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const origin = String(
    runtime().APP_ORIGIN || "https://www.dghhub.com",
  );
  let books: Awaited<ReturnType<typeof catalog>> = [];
  try {
    books = await catalog();
  } catch {}
  const blogPosts = getAllBlogPosts();
  return [
    "",
    "/books",
    "/about",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
    "/shipping",
    "/refund",
    "/blog",
    ...blogPosts.map((p) => "/blog/" + p.slug),
    ...books.map((b) => "/books/" + b.code.toLowerCase()),
  ].map((path) => ({ url: origin + path, changeFrequency: "weekly" as const }));
}
