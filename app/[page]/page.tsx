import { Store } from "@/components/store";
import { notFound } from "next/navigation";
import { getStoreInitialData } from "@/lib/server/catalog";
import { runtime } from "@/lib/server/db";

export const revalidate = 300;

const pages = [
  "books",
  "cart",
  "checkout",
  "orders",
  "track",
  "track-order",
  "about",
  "contact",
  "privacy",
  "terms",
  "shipping",
  "refund",
  "faq",
];

const pageMeta: Record<string, { title: string; description: string }> = {
  books: {
    title: "Course Books Catalog",
    description:
      "Browse and order official Virtual University handouts and academic textbooks with fast delivery across Pakistan.",
  },
  about: {
    title: "About Us",
    description:
      "Learn about Campus Bookstore, our mission, high-quality book printing, and academic support services.",
  },
  contact: {
    title: "Contact Us",
    description:
      "Reach out to our customer support team via WhatsApp, email, or visit our Lahore distribution center.",
  },
  faq: {
    title: "Frequently Asked Questions",
    description:
      "Get answers to frequently asked questions about book ordering, payment verification, Lahore delivery, and nationwide shipping.",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "Read our privacy policy regarding data protection, customer orders, cookies, and advertising practices.",
  },
  terms: {
    title: "Terms of Service",
    description:
      "Review the terms and conditions for ordering academic books and using Campus Bookstore services.",
  },
  shipping: {
    title: "Shipping & Delivery Policy",
    description:
      "Information about book delivery options: Lahore direct delivery, nationwide courier shipping, and tracking.",
  },
  refund: {
    title: "Refund & Return Policy",
    description:
      "Learn about our policies for book exchanges, reprint requests, cancellations, and student refunds.",
  },
  cart: {
    title: "Shopping Cart",
    description: "Review items in your cart and proceed to checkout.",
  },
  checkout: {
    title: "Checkout",
    description:
      "Complete your order with secure delivery and payment options.",
  },
  orders: {
    title: "My Orders",
    description: "Review and track your recent orders.",
  },
  track: {
    title: "Track Order",
    description: "Check the real-time status of your course book order.",
  },
  "track-order": {
    title: "Track Order",
    description: "Check the real-time status of your course book order.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const meta = pageMeta[page] || {
    title: page[0].toUpperCase() + page.slice(1),
    description:
      "Virtual University academic books and handouts printing services.",
  };
  const isPrivate = [
    "cart",
    "checkout",
    "orders",
    "track",
    "track-order",
  ].includes(page);
  const origin = (runtime() as any).APP_ORIGIN || "https://www.dghhub.com";
  const canonicalUrl = `${origin}/${page}`;

  return {
    title: meta.title,
    description: meta.description,
    robots: isPrivate ? { index: false, follow: false } : undefined,
    alternates: isPrivate
      ? undefined
      : {
          canonical: canonicalUrl,
        },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonicalUrl,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  if (!pages.includes(page)) notFound();

  let initial;
  try {
    initial = await getStoreInitialData();
  } catch {}

  return <Store mode={page} initial={initial} />;
}
