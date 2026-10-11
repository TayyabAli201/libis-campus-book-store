import { Store } from "@/components/store";
import { catalog, getSettings } from "@/lib/server/catalog";
import { all } from "@/lib/server/db";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const b = (await catalog(code)).find(
    (b) => b.code.toLowerCase() === code.toLowerCase(),
  );
  return {
    title: b?.title || "Book not found",
    description: b ? `${b.code}: ${b.title}. ${b.pages} pages.` : undefined,
    openGraph: { title: b?.title, description: b?.description },
  };
}
export default async function BookPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [{ settings }, books, campuses, prices] = await Promise.all([
    getSettings(),
    catalog(code),
    all<any>("SELECT id,name,city FROM campuses WHERE active=1"),
    all<any>("SELECT id,rate,binding_rate FROM pricing_categories ORDER BY id"),
  ]);
  const book = books.find((b) => b.code.toLowerCase() === code.toLowerCase());
  if (!book) notFound();
  const structured = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    bookFormat: "https://schema.org/Paperback",
    numberOfPages: book.pages,
    sku: book.code,
    offers: {
      "@type": "Offer",
      priceCurrency: "PKR",
      price: book.price === null ? undefined : book.price / 100,
      availability: book.active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <Store
        mode="book"
        bookCode={code}
        initial={{ settings, books, campuses, prices }}
      />
    </>
  );
}
