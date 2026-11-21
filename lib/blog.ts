export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  readingTime: string;
  category: string;
  content: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-order-virtual-university-handouts-online",
    title: "How to Order Virtual University Handouts Online: A Complete Guide",
    excerpt:
      "A step-by-step walkthrough for Virtual University students on how to browse course codes, verify handouts, and get fast home delivery across Pakistan.",
    date: "2026-11-15",
    author: "Campus Bookstore Team",
    readingTime: "4 min read",
    category: "Student Guide",
    content: [
      "Virtual University of Pakistan (VU) offers a comprehensive online learning curriculum. However, studying from digital screens for extended hours during midterm and final exam preparation can cause eye fatigue. High-quality printed handouts make revision, highlighting, and note-taking significantly more effective.",
      "In this guide, we will walk you through how you can easily order your semester course books and handouts from Campus Bookstore (DGH Hub) and receive them directly at your doorstep in Lahore or anywhere in Pakistan.",
      "Step 1: Find Your Books by Course Code. You can quickly search for any VU subject code (such as CS101, ENG101, MTH101, BIF401, ACC311, etc.) on our Books page. Our catalog provides exact page counts and standardized student pricing.",
      "Step 2: Add Books to Your Cart. Review the edition, page count, and binding options. Our checkout displays the total transparently, including local delivery or nationwide courier rates.",
      "Step 3: Transfer Payment & Upload Proof. We provide direct bank account transfer and Meezan Bank QR payment options. Once transferred, upload your payment receipt screenshot. Our administrative team will verify the payment and queue your books for high-speed laser printing.",
      "Step 4: Real-time Order Tracking. Every order generates a unique Order Reference (e.g. DDMM-XXXX). You can track your order status in real time on our Track Order page without needing to remember account passwords.",
      "Have questions about your semester books? You can reach our dedicated support team directly via WhatsApp for quick assistance.",
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug.toLowerCase());
}

export function getAllBlogPosts(): BlogPost[] {
  return BLOG_POSTS;
}
