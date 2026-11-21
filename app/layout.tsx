import type { Metadata } from "next";
import { Barlow_Condensed, Lora } from "next/font/google";
import "./globals.css";
import "./application.css";
import "./experience.css";
import "./interactions.css";
import "./receipts.css";
import { Providers } from "@/components/providers";
import { getSettings } from "@/lib/server/catalog";

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-barlow-condensed",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-lora",
});

export const revalidate = 300;

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
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
