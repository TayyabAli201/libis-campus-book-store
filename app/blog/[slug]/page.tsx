import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost, getAllBlogPosts } from "@/lib/blog";
import { getSettings } from "@/lib/server/catalog";
import { runtime } from "@/lib/server/db";
import { Calendar, Clock, ArrowLeft, BookOpen, Share2 } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Article Not Found" };

  const origin = (runtime() as any).APP_ORIGIN || "https://www.dghhub.com";
  const canonicalUrl = `${origin}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      url: canonicalUrl,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  let storeName = "Campus Bookstore";
  let logoUrl: string | null = null;
  try {
    const { settings } = await getSettings();
    if (settings?.store_name) storeName = settings.store_name;
    if (settings?.logo_url) logoUrl = settings.logo_url;
  } catch {}

  const origin = (runtime() as any).APP_ORIGIN || "https://www.dghhub.com";
  const articleUrl = `${origin}/blog/${post.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: articleUrl,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: storeName,
      logo: {
        "@type": "ImageObject",
        url: logoUrl ? `${origin}${logoUrl}` : `${origin}/favicon.ico`,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <main className="section" style={{ maxWidth: 840, margin: "0 auto", padding: "40px 16px" }}>
        <nav style={{ marginBottom: 28 }}>
          <Link
            href="/blog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--primary, #0284c7)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to All Guides & Articles</span>
          </Link>
        </nav>

        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <span
              style={{
                background: "var(--accent-tint, #e0f2fe)",
                color: "var(--primary, #0284c7)",
                fontWeight: 700,
                fontSize: "0.75rem",
                padding: "3px 10px",
                borderRadius: "999px",
                textTransform: "uppercase",
              }}
            >
              {post.category}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar size={14} />
              {post.date}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Clock size={14} />
              {post.readingTime}
            </span>
          </div>

          <h1 style={{ fontSize: "2.3rem", fontWeight: 800, lineHeight: 1.25, margin: "0 0 16px 0" }}>
            {post.title}
          </h1>

          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
            {post.excerpt}
          </p>
        </header>

        <AdSlot slotId="blog-top" />

        <article
          className="blog-content panel"
          style={{
            padding: "32px",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            background: "var(--card-bg, #ffffff)",
            fontSize: "1.05rem",
            lineHeight: 1.8,
          }}
        >
          {post.content.map((paragraph, idx) => (
            <p key={idx} style={{ marginBottom: 20 }}>
              {paragraph}
            </p>
          ))}

          <div
            style={{
              marginTop: 40,
              padding: "24px",
              borderRadius: "8px",
              background: "var(--card-muted, #f8fafc)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.1rem", fontWeight: 700 }}>
              Ready to Order Your Course Materials?
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "0.95rem", color: "var(--muted)" }}>
              Browse over hundreds of active Virtual University handouts, review page counts, and get delivery in Lahore or across Pakistan.
            </p>
            <Link href="/books" className="btn primary">
              Browse Course Books Catalog &rarr;
            </Link>
          </div>
        </article>

        <AdSlot slotId="blog-bottom" />
      </main>
    </>
  );
}
