import type { Metadata } from "next";
import "./globals.css";
import "./application.css";
import "./experience.css";
import "./interactions.css";
import "./receipts.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Campus Bookstore | Your Campus. Your Books. One Place.",
    template: "%s | Campus Bookstore",
  },
  description:
    "Find university course books by code. Clear book prices, secure payment proof and order tracking.",
  openGraph: {
    title: "Campus Bookstore",
    description: "Your Campus. Your Books. One Place.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
