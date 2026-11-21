import Link from "next/link";
import { getAllBlogPosts } from "@/lib/blog";
import { getSettings } from "@/lib/server/catalog";
import { runtime } from "@/lib/server/db";
import { Calendar, Clock, ArrowRight, BookOpen } from "lucide-react";

export const revalidate = 300;

export async function generateMetadata() {
  let storeName = "Campus Bookstore";
  try {
    const { settings } = await getSettings();
    if (settings?.store_name) storeName = settings.store_name;
  } catch {}
  const origin = (runtime() as any).APP_ORIGIN || "https://www.dghhub.com";
  return {
    title: "Blog & Student Resources",
    description:
      "Articles, exam preparation guides, and academic handout updates for Virtual University students across Pakistan.",
    alternates: {
      canonical: `${origin}/blog`,
    },
    openGraph: {
      title: "Blog & Student Resources",
      description:
        "Articles, exam preparation guides, and academic handout updates for Virtual University students across Pakistan.",
      url: `${origin}/blog`,
    },
  };
}

export default async function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <main className="section" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 16px" }}>
      <header style={{ marginBottom: 40, textAlign: "center" }}>
        <div className="static-eyebrow-pill" style={{ margin: "0 auto 12px auto", display: "inline-flex" }}>
          <BookOpen size={14} className="sparkle-icon" />
          <span>STUDENT GUIDES & ARTICLES</span>
        </div>
        <h1 className="static-hero-title" style={{ fontSize: "2.2rem", margin: "10px 0" }}>
          Campus Bookstore Blog
        </h1>
        <p className="static-hero-subtitle" style={{ maxWidth: 640, margin: "0 auto", color: "var(--muted)" }}>
          Helpful guides, exam study tips, and announcements regarding Virtual University course materials and printing services.
        </p>
      </header>

      <div style={{ display: "grid", gap: 24 }}>
        {posts.map((post) => (
          <article
            key={post.slug}
            className="panel"
            style={{
              padding: "28px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--card-bg, #ffffff)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <span
                style={{
                  background: "var(--accent-tint, #e0f2fe)",
                  color: "var(--primary, #0284c7)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
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

            <h2 style={{ fontSize: "1.4rem", fontWeight: 750, margin: "0 0 10px 0", lineHeight: 1.3 }}>
              <Link
                href={`/blog/${post.slug}`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {post.title}
              </Link>
            </h2>

            <p style={{ color: "var(--muted)", margin: "0 0 18px 0", lineHeight: 1.6, fontSize: "0.95rem" }}>
              {post.excerpt}
            </p>

            <Link
              href={`/blog/${post.slug}`}
              className="btn compact"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 650,
                fontSize: "0.88rem",
              }}
            >
              <span>Read Full Article</span>
              <ArrowRight size={14} />
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
