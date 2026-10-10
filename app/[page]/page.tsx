import { Store } from "@/components/store";
import { notFound } from "next/navigation";
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
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return {
    title: page[0].toUpperCase() + page.slice(1),
    robots: ["cart", "checkout", "orders"].includes(page)
      ? { index: false, follow: false }
      : undefined,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  if (!pages.includes(page)) notFound();
  return <Store mode={page} />;
}
