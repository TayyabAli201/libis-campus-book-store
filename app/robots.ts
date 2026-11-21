import { runtime } from "@/lib/server/db";
export const dynamic = "force-dynamic";
export default function robots() {
  const origin = String(
    runtime().APP_ORIGIN || "https://www.dghhub.com",
  );
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/campus",
        "/vendor",
        "/api",
        "/checkout",
        "/cart",
        "/orders",
      ],
    },
    sitemap: origin + "/sitemap.xml",
  };
}
