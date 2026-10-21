import { getSettings } from "@/lib/server/catalog";
import { bucket } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { settings } = await getSettings();
    if (settings?.logo_url) {
      if (settings.logo_url.startsWith("/api/covers/")) {
        const id = settings.logo_url.replace("/api/covers/", "").split("?")[0];
        const obj = await bucket().get("covers/" + id);
        if (obj) {
          return new Response(obj.body, {
            headers: {
              "Content-Type": obj.httpMetadata?.contentType || "image/png",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
      return Response.redirect(settings.logo_url, 307);
    }
  } catch {}

  // Default green book icon SVG
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#126957"/><path d="M6 8q5-2 10 1 5-3 10-1v16q-5-2-10 1-5-3-10-1Zm10 1v16" fill="none" stroke="#e7efe2" stroke-width="2"/></svg>',
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
