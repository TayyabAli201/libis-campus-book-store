import { runtime } from "@/lib/server/db";
export const dynamic = "force-dynamic";
export default function robots() {
  const origin = String(
    runtime().APP_ORIGIN ||
      "https://campus-bookstore-hub.bilal807854.chatgpt.site",
  );
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/campus", "/api", "/checkout", "/cart", "/orders"],
    },
    sitemap: origin + "/sitemap.xml",
  };
}
