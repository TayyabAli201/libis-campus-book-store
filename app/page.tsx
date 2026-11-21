import { Store } from "@/components/store";
import { Suspense } from "react";
import { Loading } from "@/components/shared";
import { getStoreInitialData } from "@/lib/server/catalog";
import { runtime } from "@/lib/server/db";

export const revalidate = 300;

export async function generateMetadata() {
  let storeName = "Campus Bookstore";
  let tagline = "Official Virtual University academic handouts and book printing services.";
  try {
    const data = await getStoreInitialData();
    if (data?.settings?.store_name) storeName = data.settings.store_name;
    if (data?.settings?.header_tagline) tagline = data.settings.header_tagline;
  } catch {}
  const origin = (runtime() as any).APP_ORIGIN || "https://www.dghhub.com";
  return {
    title: `${storeName} | Virtual University Handouts & Books`,
    description: tagline,
    alternates: {
      canonical: origin,
    },
    openGraph: {
      title: storeName,
      description: tagline,
      url: origin,
    },
  };
}

export default async function Home() {
  let initial;
  try {
    initial = await getStoreInitialData();
  } catch {}

  const origin = (runtime() as any).APP_ORIGIN || "https://www.dghhub.com";
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: initial?.settings?.store_name || "Campus Bookstore",
    url: origin,
    logo: initial?.settings?.logo_url ? `${origin}${initial.settings.logo_url}` : `${origin}/favicon.ico`,
    contactPoint: initial?.settings?.whatsapp
      ? {
          "@type": "ContactPoint",
          telephone: initial.settings.whatsapp,
          contactType: "customer service",
        }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Suspense
        fallback={
          <div
            className="section"
            style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}
          >
            <Loading />
          </div>
        }
      >
        <Store mode="home" initial={initial} />
      </Suspense>
    </>
  );
}
