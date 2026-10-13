import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { user } from "./security";
import { Portal } from "@/components/portal";
import { pendingOrderCount } from "./orders";
import { getSettings } from "./catalog";
export async function PortalPage({
  portal,
  segments,
}: {
  portal: "admin" | "campus";
  segments: string[];
}) {
  const h = await headers();
  let cookieHeader = h.get("cookie") || h.get("Cookie") || "";
  try {
    const cStore = await cookies();
    const storeCookies = cStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    if (storeCookies) {
      cookieHeader = cookieHeader
        ? `${cookieHeader}; ${storeCookies}`
        : storeCookies;
    }
  } catch {}
  const reqHeaders = new Headers(h);
  if (cookieHeader) {
    reqHeaders.set("cookie", cookieHeader);
  }
  let u;
  try {
    u = await user(
      new Request("https://local.invalid", { headers: reqHeaders }),
      "profile",
      portal,
    );
  } catch {
    redirect("/" + portal + "/login");
  }
  if (
    (portal === "admin" && u.role !== "SUPER_ADMIN") ||
    (portal === "campus" && u.role !== "CAMPUS_ADMIN")
  )
    redirect("/" + portal + "/login");
  const section = segments[0] || "dashboard";
  if (section === "inventory") redirect("/" + portal + "/books");
  if (
    ![
      "dashboard",
      "orders",
      "payments",
      "books",
      "pricing",
      "campuses",
      "students",
      "reports",
      "users",
      "settings",
      "audit",
      "profile",
    ].includes(section)
  )
    notFound();
  if (u.must_change && section !== "profile")
    redirect("/" + portal + "/profile");
  if (u.role === "CAMPUS_ADMIN") {
    const required: Record<string, string> = {
      dashboard: "reports.read",
      reports: "reports.read",
      orders: "orders.read",
      students: "students.read",
      books: "books.read",
      profile: "profile",
    };
    if (
      section !== "profile" &&
      (!required[section] || !u.permissions.includes(required[section]))
    )
      return (
        <main className="section">
          <h1 className="page-title">Access unavailable</h1>
          <p>Your campus account does not have permission to view this page.</p>
          <a className="btn" href="/campus/profile">
            My profile
          </a>
        </main>
      );
  }
  const [pendingOrders, settingsRes] = await Promise.all([
    u.role === "SUPER_ADMIN" && !u.must_change ? pendingOrderCount() : 0,
    getSettings().catch(() => null),
  ]);
  const storeName = settingsRes?.settings?.store_name || "Campus Bookstore";
  return (
    <Portal
      user={u}
      section={section}
      record={segments[1]}
      pendingOrders={pendingOrders}
      storeName={storeName}
    />
  );
}
