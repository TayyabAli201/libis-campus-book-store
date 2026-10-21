import type { Metadata } from "next";
import "./globals.css";
import "./application.css";
import "./experience.css";
import "./interactions.css";
import "./receipts.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let storeName = "Campus Bookstore";
  let tagline = "Your Campus. Your Books. One Place.";
  let logoUrl = "/favicon.svg";

  try {
    const { settings } = await getSettings();
    if (settings?.store_name) storeName = settings.store_name;
    if (settings?.header_tagline) tagline = settings.header_tagline;
    if (settings?.logo_url) logoUrl = settings.logo_url;
  } catch {}

  return {
    title: {
      default: `${storeName} | ${tagline}`,
      template: `%s | ${storeName}`,
    },
    description: `Find university course books by code at ${storeName}. Clear book prices, secure payment proof and order tracking.`,
    openGraph: {
      title: storeName,
      description: tagline,
      type: "website",
      ...(logoUrl !== "/favicon.svg" ? { images: [logoUrl] } : {}),
    },
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
