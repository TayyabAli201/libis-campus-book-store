"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  BookOpen,
  LayoutDashboard,
  ShoppingBag,
  ShieldCheck,
  Library,
  Coins,
  Building2,
  Users,
  Settings,
  ScrollText,
  LogOut,
  UserRound,
  BarChart3,
  Plus,
  Download,
  Upload,
  Copy,
  ExternalLink,
  RefreshCw,
  Bell,
  Trash2,
  ArrowUpRight,
  ArrowRightCircle,
  Clock3,
  CheckCircle2,
  Truck,
  Bike,
  MapPin,
  Navigation,
  X,
  Eye,
  Globe,
  Mail,
  Share2,
  CreditCard,
  Clock,
  Package,
  Search,
  Calendar,
  ListFilter,
  Factory,
  Send,
  MessageCircle,
  Printer,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  api,
  Blank,
  Loading,
  Field,
  Choose,
  MultiChoose,
  DateRangePicker,
  formatDateDMY,
  errorText,
  Status,
  TableActionButton,
  DataTable,
  Confirm,
  csv,
  download,
} from "./shared";
import { ThemeSwitch } from "./providers";
import { OrderReceipt, ReceiptButtons } from "./store";
import {
  money,
  categoryLabel,
  statuses,
  transitions,
  permissions,
  getWhatsAppUrl,
  getVendorWhatsAppUrl,
  formatWhatsAppPhone,
  isOtherCityOrder,
  isCampusOrder,
  isLahoreOrder,
  type User,
  type Vendor,
  type Book,
  type StoreSettings,
} from "@/lib/contracts";
const Charts = dynamic(() => import("./report-charts"), {
  loading: () => <Loading />,
});
const nav = [
  ["dashboard", "Overview", LayoutDashboard, "reports.read"],
  ["orders", "Orders", ShoppingBag, "orders.read"],
  ["books", "Books", Library, "books.read"],
  ["pricing", "Pricing management", Coins, "admin"],
  ["campuses", "Campuses", Building2, "admin"],
  ["vendors", "Vendors", Factory, "admin"],
  ["students", "Students", Users, "students.read"],
  ["reports", "Reports", BarChart3, "reports.read"],
  ["users", "User accounts", Users, "admin"],
  ["settings", "Settings", Settings, "admin"],
  ["audit", "Audit log", ScrollText, "admin"],
  ["profile", "My profile", UserRound, "profile"],
] as const;

export function BrandText({ name = "Campus Bookstore" }: { name?: string }) {
  const parts = (name || "Campus Bookstore").trim().split(/\s+/);
  if (parts.length > 1) {
    return (
      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" }}>
        <strong style={{ fontWeight: 750 }}>{parts[0]}</strong>
        <span style={{ fontWeight: 400 }}>{parts.slice(1).join(" ")}</span>
      </span>
    );
  }
  return <strong style={{ fontWeight: 750, whiteSpace: "nowrap" }}>{parts[0] || "Campus"}</strong>;
}

export function Login({
  portal,
  storeName = "Campus Bookstore",
}: {
  portal: "admin" | "campus" | "vendor";
  storeName?: string;
}) {
  const signingIn = useRef(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState<"none" | "request" | "verify">("none");
  const [forgotEmail, setForgotEmail] = useState("admin@campusbookstore.com");
  const [resetCode, setResetCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tokenParam = sp.get("reset_token");
      const emailParam = sp.get("email");
      if (tokenParam) {
        setResetToken(tokenParam);
        if (emailParam) setForgotEmail(emailParam);
        setForgotMode("verify");
      }
    }
  }, []);

  return (
    <main className="login-page">
      <section className="login-story">
        <a href="/" className="brand">
          <BookOpen />
          <BrandText name={storeName} />
        </a>
        <div>
          <span className="eyebrow">
            {portal === "admin"
              ? "THE CONTROL ROOM"
              : portal === "vendor"
                ? "VENDOR HUB"
                : "YOUR CAMPUS, CONNECTED"}
          </span>
          <h1>
            Good books.
            <br />
            Better possibilities.
          </h1>
          <p>
            {portal === "admin"
              ? "Every book, every order, every campus. Thoughtfully managed from one place."
              : portal === "vendor"
                ? "Direct access to assigned print orders, batch fulfillment and courier tracking."
                : "A clear view of your campus orders, students and course materials."}
          </p>
        </div>
        <span>
          {storeName} /{" "}
          {portal === "admin"
            ? "Super Admin"
            : portal === "vendor"
              ? "Vendor Portal"
              : "Campus Portal"}
        </span>
      </section>
      <section className="login-form">
        <div>
          <ThemeSwitch />
          <span className="eyebrow">
            {forgotMode === "none"
              ? "WELCOME BACK"
              : "ACCOUNT RECOVERY"}
          </span>
          <h2>
            {forgotMode === "none"
              ? portal === "admin"
                ? "Admin sign in"
                : portal === "vendor"
                  ? "Vendor sign in"
                  : "Campus sign in"
              : forgotMode === "request"
                ? "Reset Admin Password"
                : "Enter Verification Code"}
          </h2>
          <p>
            {forgotMode === "none"
              ? portal === "vendor"
                ? "Sign in to manage and fulfill your assigned print orders."
                : "Use the account provided by your administrator."
              : forgotMode === "request"
                ? "We will send a 6-digit verification code to tayyabali201@gmail.com."
                : "Check tayyabali201@gmail.com for your code, then set your new password."}
          </p>

          {successNotice && (
            <div
              className="notice"
              style={{
                marginBottom: 16,
                background: "var(--accent)",
                borderColor: "var(--primary)",
              }}
            >
              {successNotice}
            </div>
          )}

          {forgotMode === "none" ? (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                if (signingIn.current) return;
                signingIn.current = true;
                setBusy(true);
                setError("");
                try {
                  const r = await api("login", { email, password, portal });
                  location.href = `/${portal}/${r.must_change ? "profile" : portal === "vendor" ? "orders" : "dashboard"}`;
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  signingIn.current = false;
                  setBusy(false);
                }
              }}
            >
              <Field label="Email address">
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {portal === "admin" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: -4,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--primary)",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={() => {
                      setForgotMode("request");
                      setError("");
                      setSuccessNotice("");
                      if (email) setForgotEmail(email);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <button className="btn primary full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : forgotMode === "request" ? (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                setSuccessNotice("");
                try {
                  const r = await api("forgot-password", { email: forgotEmail });
                  setSuccessNotice(
                    r.message ||
                      "A 6-digit reset code has been sent to tayyabali201@gmail.com.",
                  );
                  setForgotMode("verify");
                } catch (err) {
                  setError(errorText(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Admin email address">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@campusbookstore.com"
                />
              </Field>
              <p className="small-text">
                The verification code will be sent to{" "}
                <strong>tayyabali201@gmail.com</strong>.
              </p>
              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <button className="btn primary full" disabled={busy}>
                {busy ? "Sending code…" : "Send Reset Code"}
              </button>
              <button
                type="button"
                className="btn full"
                disabled={busy}
                onClick={() => {
                  setForgotMode("none");
                  setError("");
                }}
              >
                Cancel / Back to Sign in
              </button>
            </form>
          ) : (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                if (newPassword !== confirmPassword) {
                  setError("Passwords do not match.");
                  return;
                }
                setBusy(true);
                try {
                  const r = await api("reset-password", {
                    code: resetCode ? resetCode.trim() : undefined,
                    token: resetToken || undefined,
                    new_password: newPassword,
                  });
                  toast.success("Password reset successfully!");
                  setSuccessNotice(
                    r.message ||
                      "Password reset successfully! Please sign in with your new password.",
                  );
                  setEmail(forgotEmail);
                  setPassword("");
                  setResetCode("");
                  setResetToken("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setForgotMode("none");
                } catch (err) {
                  setError(errorText(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {!resetToken && (
                <Field label="6-Digit Verification Code">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) =>
                      setResetCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="123456"
                    style={{
                      letterSpacing: "4px",
                      fontSize: "1.15rem",
                      fontWeight: "bold",
                    }}
                  />
                </Field>
              )}
              <Field label="New Password">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 12 characters, A-Z, a-z, 0-9"
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                />
              </Field>
              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <button className="btn primary full" disabled={busy}>
                {busy ? "Updating password…" : "Confirm New Password"}
              </button>
              <button
                type="button"
                className="btn full"
                disabled={busy}
                onClick={() => {
                  setForgotMode("none");
                  setError("");
                }}
              >
                Back to Sign in
              </button>
            </form>
          )}

          <p className="small-text">
            {portal === "campus"
              ? "Campus accounts are created by Super Admin. Contact your administrator for access or a password reset."
              : portal === "vendor"
                ? "Vendor accounts are provisioned by Bookstore Administration. Contact the admin office for access."
                : "Use your secure administrator account. Passwords can be reset via email verification."}
          </p>
          <a href="/" className="text-link">
            Return to the bookstore
          </a>
        </div>
      </section>
    </main>
  );
}
export function Portal({
  user,
  section = "dashboard",
  record,
  pendingOrders = 0,
  storeName = "Campus Bookstore",
}: {
  user: User;
  section?: string;
  record?: string;
  pendingOrders?: number;
  storeName?: string;
}) {
  const isAdmin = user.role === "SUPER_ADMIN",
    isVendor = user.role === "VENDOR",
    base = isAdmin ? "/admin" : isVendor ? "/vendor" : "/campus";
  const title = nav.find((n) => n[0] === section)?.[1] || "Overview";
  const [pendingCount, setPendingCount] = useState(pendingOrders);
  const [currentStoreName, setCurrentStoreName] = useState(storeName);

  useEffect(() => {
    setCurrentStoreName(storeName);
  }, [storeName]);

  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.store_name) {
        setCurrentStoreName(e.detail.store_name);
      }
    };
    window.addEventListener("store-settings-updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("store-settings-updated", handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || user.must_change) return;
    let disposed = false,
      sequence = 0;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const current = ++sequence;
      try {
        const result = await api("manage/orders/pending-count");
        if (!disposed && current === sequence) setPendingCount(result.count);
      } catch {
        // Keep the last known count when the connection is temporarily unavailable.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("orders-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("orders-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isAdmin, user.must_change]);
  return (
    <SidebarProvider className="portal-shell">
      <Sidebar className="no-print">
        <SidebarHeader>
          <a
            className="brand portal-brand"
            href={base + (isVendor ? "/orders" : "/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            <BookOpen size={20} style={{ flexShrink: 0 }} />
            <BrandText name={currentStoreName} />
          </a>
          <span className="portal-label">
            {isAdmin ? "SUPER ADMIN" : isVendor ? "VENDOR PORTAL" : "CAMPUS PORTAL"}
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {nav
              .filter((n) => {
                if (isVendor) {
                  return n[0] === "orders" || n[0] === "profile";
                }
                return (
                  isAdmin ||
                  n[3] === "profile" ||
                  user.permissions.includes(n[3])
                );
              })
              .map(([id, title, Icon]) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton asChild isActive={section === id}>
                    <a href={base + "/" + id}>
                      <Icon />
                      <span>{title}</span>
                      {isAdmin && id === "orders" && pendingCount > 0 && (
                        <span
                          className="pending-order-badge"
                          role="status"
                          aria-label={`${pendingCount} pending orders`}
                          title={`${pendingCount} orders awaiting confirmation`}
                        >
                          {pendingCount}
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <a href="/" className="btn compact">
            <ExternalLink size={16} />
            Visit bookstore
          </a>
          <div className="user-chip">
            <span>{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <button
            className="btn compact"
            onClick={async () => {
              await api("logout", {});
              location.href = base + "/login";
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="portal-top no-print">
          <div>
            <SidebarTrigger />
            <span>
              {isAdmin ? "Workspace" : isVendor ? "Vendor" : "Campus"} / <strong>{title}</strong>
            </span>
          </div>
          <ThemeSwitch />
        </header>
        <main className="portal-main" id="main">
          <div className="portal-page-head no-print">
            <div>
              <span className="eyebrow">
                {isAdmin
                  ? `${(currentStoreName || "Campus Bookstore").toUpperCase()} OPERATIONS`
                  : isVendor
                    ? "PRINTING & LOGISTICS PORTAL"
                    : "CAMPUS WORKSPACE"}
              </span>
              <h1>{title}</h1>
            </div>
            <div className="portal-header-date-badge" title="Current Pakistan Standard Time">
              <Calendar size={13} className="date-badge-icon" />
              <span>
                {new Date().toLocaleDateString("en-GB", {
                  timeZone: "Asia/Karachi",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          {!!user.must_change && (
            <div className="notice">
              Set a new password to unlock your account.
            </div>
          )}
          {section === "profile" ? (
            <Profile user={user} base={base} />
          ) : section === "books" ? (
            <Books readOnly={!isAdmin} />
          ) : section === "pricing" ? (
            <Pricing />
          ) : section === "campuses" ? (
            <Campuses />
          ) : section === "vendors" ? (
            <Vendors />
          ) : section === "users" ? (
            <UserAccounts />
          ) : section === "settings" ? (
            <SettingsPage />
          ) : section === "audit" ? (
            <Audit />
          ) : section === "students" ? (
            <Students user={user} />
          ) : section === "orders" || section === "payments" ? (
            record ? (
              <OrderDetail id={record} user={user} />
            ) : (
              <Orders base={base} payments={section === "payments"} user={user} />
            )
          ) : (
            <Dashboard reportsOnly={section === "reports"} user={user} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
function useData<T = any>(path: string) {
  const requestId = useRef(0);
  const hasLoadedRef = useRef(false);
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    const current = ++requestId.current;
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError("");
    try {
      const result = await api(path);
      if (current === requestId.current) {
        setData(result);
        hasLoadedRef.current = true;
      }
    } catch (e) {
      if (current === requestId.current) setError(errorText(e));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      requestId.current++;
    };
  }, [path]);
  return { data, error, loading, reload: load, setData };
}
function Result({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: string;
  children: ReactNode;
}) {
  return loading ? (
    <Loading />
  ) : error ? (
    <Blank title="Unable to load this page" description={error}>
      <button className="btn" onClick={() => location.reload()}>
        Try again
      </button>
    </Blank>
  ) : (
    <>{children}</>
  );
}
function Profile({ user, base }: { user: User; base: string }) {
  const [name, setName] = useState(user.name),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="panel stack narrow"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("profile", {
            name,
            current_password: current,
            ...(next ? { new_password: next } : {}),
          });
          toast.success(
            "Profile saved. Sign in with your updated credentials.",
          );
          location.href = base + "/login";
        } catch (e) {
          toast.error(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Profile & security</h3>
      <p>
        {user.email} · {user.role.replaceAll("_", " ")}
      </p>
      <Field label="Full name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Current password">
        <input
          required
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </Field>
      <Field
        label="New password"
        hint="At least 12 characters, with uppercase, lowercase and a number"
      >
        <input
          required={!!user.must_change}
          type="password"
          autoComplete="new-password"
          minLength={12}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <p className="small-text">
        Saving revokes all your sessions, including this one.
      </p>
      <button className="btn primary" disabled={busy}>
        {busy ? "Saving…" : "Save & sign out"}
      </button>
    </form>
  );
}
function dateRange(range: string) {
  const now = new Date(),
    from = new Date(now);
  if (range === "today") {
  } else if (range === "7") from.setDate(from.getDate() - 6);
  else if (range === "month") from.setDate(1);
  else if (range === "year") {
    from.setMonth(0);
    from.setDate(1);
  } else from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}
const dashboardMetrics: {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    key: "total_sales",
    label: "Verified sales",
    hint: "Selected period · PKR",
    icon: Coins,
    tone: "featured",
  },
  {
    key: "total_orders",
    label: "Total orders",
    hint: "Orders in this period",
    icon: ShoppingBag,
    tone: "green",
  },
  {
    key: "pending_payments",
    label: "Payments to review",
    hint: "Awaiting review in this period",
    icon: ShieldCheck,
    tone: "amber",
  },
  {
    key: "total_books",
    label: "Books in catalog",
    hint: "Current catalog total",
    icon: Library,
    tone: "blue",
  },
  {
    key: "pending_orders",
    label: "Pending orders",
    hint: "Awaiting payment in this period",
    icon: Clock3,
    tone: "amber",
  },
  {
    key: "confirmed_orders",
    label: "Confirmed orders",
    hint: "Confirmed in this period",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    key: "delivered_orders",
    label: "Delivered orders",
    hint: "Delivered in this period",
    icon: Truck,
    tone: "blue",
  },
  {
    key: "total_campuses",
    label: "Campuses",
    hint: "Current campus total",
    icon: Building2,
    tone: "green",
  },
];
function Dashboard({
  reportsOnly,
  user,
}: {
  reportsOnly: boolean;
  user: User;
}) {
  const isAdmin = user.role === "SUPER_ADMIN";
  const base = isAdmin ? "/admin" : "/campus";
  const quickLinks = [
    {
      label: "Place Order for Campus",
      description: `Order books with assigned ${categoryLabel(user.campus_category || "A")} pricing`,
      href: "/#books",
      icon: ShoppingBag,
      allowed: !isAdmin,
    },
    {
      label: "Manage Books",
      description: "Book catalog & course prices",
      href: "/books",
      icon: Library,
      allowed: isAdmin || user.permissions.includes("books.read"),
    },
    {
      label: "Live Orders",
      description: "From checkout to delivery",
      href: "/orders",
      icon: ShoppingBag,
      allowed: isAdmin || user.permissions.includes("orders.read"),
    },
    {
      label: "Verify Payments",
      description: "Review uploaded receipts",
      href: "/orders?status=PAYMENT_PENDING",
      icon: ShieldCheck,
      allowed: isAdmin,
    },
    {
      label: "Pricing Rates",
      description: "Set page rates per category",
      href: "/pricing",
      icon: Coins,
      allowed: isAdmin,
    },
    {
      label: "Campus Network",
      description: "Manage campus counters",
      href: "/campuses",
      icon: Building2,
      allowed: isAdmin,
    },
    {
      label: "System Settings",
      description: "Storefront & maintenance config",
      href: "/settings",
      icon: Settings,
      allowed: isAdmin,
    },
    {
      label: "Registered Students",
      description: "Student accounts & history",
      href: "/students",
      icon: Users,
      allowed: isAdmin || user.permissions.includes("students.read"),
    },
    {
      label: "Audit Log",
      description: "System activity records",
      href: "/audit",
      icon: ScrollText,
      allowed: isAdmin,
    },
  ].filter((link) => link.allowed);
  const [range, setRange] = useState("30"),
    [dates, setDates] = useState(dateRange("30"));
  const { data, error, loading, reload } = useData(
    "manage/reports?from=" + dates.from + "&to=" + dates.to,
  );
  return (
    <>
      {!reportsOnly && !!quickLinks.length && (
        <section className="dashboard-welcome">
          <nav className="dashboard-shortcuts" aria-label="Quick actions">
            {quickLinks.map(({ label, description, href, icon: Icon }) => (
              <a key={href} href={base + href}>
                <span className="shortcut-icon">
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight size={18} className="shortcut-arrow" />
              </a>
            ))}
          </nav>
        </section>
      )}
      <div className="dashboard-controls">
        <div className="dashboard-section-heading">
          <div>
            <h2>
              {reportsOnly ? "Explore your reports" : "Performance overview"}
            </h2>
            <p>Choose a period to see how your bookstore is doing.</p>
          </div>
        </div>
        <div className="toolbar dashboard-toolbar">
          <Choose
            label="Report period"
            value={range}
            onChange={(v) => {
              setRange(v);
              if (v !== "custom") setDates(dateRange(v));
            }}
            options={[
              { value: "today", label: "Today" },
              { value: "7", label: "7 Days" },
              { value: "30", label: "30 Days" },
              { value: "month", label: "This Month" },
              { value: "year", label: "This Year" },
              { value: "custom", label: "Custom Date Range" },
            ]}
          />
          {range === "custom" && (
            <>
              <input
                aria-label="From date"
                type="date"
                value={dates.from}
                max={dates.to}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
              />
              <input
                aria-label="To date"
                type="date"
                value={dates.to}
                min={dates.from}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
              />
            </>
          )}
          <button className="btn compact" onClick={reload} disabled={loading}>
            <RefreshCw
              size={16}
              className={loading ? "refresh-spinning" : undefined}
            />
            Refresh
          </button>
          {data && (
            <button
              className="btn compact"
              onClick={() =>
                download(
                  "campus-report.csv",
                  csv([
                    ["Metric", "Value"],
                    ...Object.entries(data.stats),
                    [],
                    ["Date", "Orders", "Sales (minor units)"],
                    ...data.daily.map((d: any) => [d.label, d.orders, d.sales]),
                  ]),
                )
              }
            >
              <Download size={16} />
              Export report
            </button>
          )}
        </div>
      </div>
      <Result loading={loading} error={error}>
        {data && (
          <>
            {!reportsOnly && (
              <div className="metrics">
                {dashboardMetrics.map(
                  ({ key, label, hint, icon: Icon, tone }) => (
                    <div className={`metric metric-${tone}`} key={key}>
                      <div className="metric-heading">
                        <span>{label}</span>
                        <span className="metric-icon">
                          <Icon size={19} />
                        </span>
                      </div>
                      <strong>
                        {key === "total_sales"
                          ? money(Number(data.stats[key]))
                          : Number(data.stats[key]).toLocaleString()}
                      </strong>
                      <small>{hint}</small>
                    </div>
                  ),
                )}
              </div>
            )}
            {data.stats.pending_payments > 0 && (
              <div className="notice dashboard-notice">
                <span className="notice-icon">
                  <Bell size={18} />
                </span>
                <div>
                  <strong>
                    {data.stats.pending_payments}{" "}
                    {data.stats.pending_payments === 1
                      ? "payment needs"
                      : "payments need"}{" "}
                    a review
                  </strong>
                  <p>Payment reviews help your next orders move forward.</p>
                </div>
                {isAdmin && (
                  <a href="/admin/orders?status=PAYMENT_PENDING" className="text-link">
                    Review payments <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            )}
            <Charts data={data} />
          </>
        )}
      </Result>
    </>
  );
}
const emptyBook = {
  code: "",
  course_code: "",
  course_name: "",
  title: "",
  author: "",
  description: "",
  cover: null,
  pages: null,
  category: "D",
  fixed_price: null,
  campus_id: null,
  active: true,
};
function Books({ readOnly }: { readOnly: boolean }) {
  const [edit, setEdit] = useState<any>(null),
    [archive, setArchive] = useState<Book | null>(null),
    [q, setQ] = useState(""),
    [importing, setImporting] = useState(false),
    [exporting, setExporting] = useState(false),
    [importResult, setImportResult] = useState<any>(null),
    [clearReview, setClearReview] = useState<{ count: number } | null>(null),
    [clearConfirmation, setClearConfirmation] = useState(""),
    [clearBusy, setClearBusy] = useState(false);
  const transferBusy = useRef(false);
  const visibilityPending = useRef(false);
  const [visibilityBusy, setVisibilityBusy] = useState<string | null>(null);
  const [bookPage, setBookPage] = useState(1);
  const { data, error, loading, reload, setData } = useData<Book[]>(
    "manage/books?q=" + encodeURIComponent(q) + "&page=" + bookPage,
  );
  const setVisibility = async (book: Book, active: boolean) => {
    if (readOnly || visibilityPending.current) return;
    visibilityPending.current = true;
    setVisibilityBusy(book.id);
    try {
      await api("manage/books/" + book.id, { ...book, active });
      setData(
        (books) =>
          books?.map((b) =>
            b.id === book.id
              ? { ...b, active: Number(active), version: book.version + 1 }
              : b,
          ) ?? null,
      );
      toast.success(
        `${book.code} ${active ? "is now visible on the homepage" : "is now hidden from the bookstore"}.`,
      );
    } catch (error) {
      toast.error(errorText(error));
      await reload();
    } finally {
      visibilityPending.current = false;
      setVisibilityBusy(null);
    }
  };
  return (
    <>
      <div className="toolbar">
        <input
          placeholder="Search books…"
          aria-label="Search books"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setBookPage(1);
          }}
        />
        {!readOnly && (
          <button
            className="btn primary compact"
            onClick={() => setEdit({ ...emptyBook })}
          >
            <Plus size={16} />
            Add book
          </button>
        )}
        <button
          className="btn compact"
          disabled={exporting || importing || loading}
          onClick={async () => {
            if (transferBusy.current) return;
            transferBusy.current = true;
            setExporting(true);
            try {
              const books: Book[] = [];
              for (let page = 1; ; page++) {
                const batch: Book[] = await api(
                  "manage/books?q=" + encodeURIComponent(q) + "&page=" + page,
                );
                books.push(...batch);
                if (batch.length < 500) break;
              }
              const { exportBookExcel } =
                await import("@/lib/book-excel-browser");
              await exportBookExcel(books);
              toast.success("Excel file exported.");
            } catch (error) {
              toast.error(errorText(error));
            } finally {
              setExporting(false);
              transferBusy.current = false;
            }
          }}
        >
          <Download size={16} />
          {exporting ? "Exporting…" : "Export Excel"}
        </button>
        {!readOnly && (
          <label className="btn compact" aria-disabled={importing || exporting}>
            <Upload size={16} />
            {importing ? "Importing…" : "Import Excel"}
            <input
              type="file"
              hidden
              aria-label="Import Excel file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={importing || exporting}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file || transferBusy.current) return;
                transferBusy.current = true;
                setImporting(true);
                const results: any[] = [];
                try {
                  const { readBookExcel } =
                    await import("@/lib/book-excel-browser");
                  const rows = await readBookExcel(file);
                  // Small requests also accommodate descriptions near the field size limit.
                  for (let i = 0; i < rows.length; i += 20) {
                    const chunk = rows.slice(i, i + 20);
                    try {
                      const response = await api("manage/books/import", chunk);
                      results.push(...response.results);
                    } catch (error) {
                      results.push(
                        ...chunk.map(({ row }) => ({
                          row,
                          ok: false,
                          error: "Could not confirm save: " + errorText(error),
                        })),
                      );
                      results.push(
                        ...rows.slice(i + 20).map(({ row }) => ({
                          row,
                          ok: false,
                          error:
                            "Not attempted. Resolve the connection error and retry.",
                        })),
                      );
                      break;
                    }
                  }
                  setImportResult({ results });
                  await reload();
                } catch (error) {
                  toast.error(errorText(error));
                } finally {
                  setImporting(false);
                  transferBusy.current = false;
                  input.value = "";
                }
              }}
            />
          </label>
        )}
      </div>
      {!readOnly && (
        <div className="book-clear-row">
          <button
            className="btn compact danger-button"
            disabled={
              clearBusy || importing || exporting || visibilityBusy !== null
            }
            onClick={async () => {
              setClearBusy(true);
              setClearConfirmation("");
              try {
                setClearReview(await api("manage/books/clear"));
              } catch (error) {
                toast.error(errorText(error));
              } finally {
                setClearBusy(false);
              }
            }}
          >
            <Trash2 size={16} />
            {clearBusy ? "Please wait…" : "Clear data"}
          </button>
        </div>
      )}
      <p className="small-text">
        Excel .xlsx files · Book Code, Book Name, Pages · Export the current
        search to get the format.
        {!readOnly &&
          " Import up to 2,000 books (4 MB). File prices are ignored. Missing pages are saved as drafts. Existing codes are skipped."}
      </p>
      <Result loading={loading} error={error}>
        <DataTable
          headers={["Book", "Course", "Actions"]}
          rows={(data || []).map((b) => [
            <div>
              <strong>{b.code}</strong>
              <p>{b.title}</p>
            </div>,
            b.course_code,
            <div className="row-actions book-row-actions">
              {!readOnly && (
                <>
                  <button onClick={() => setEdit({ ...b, active: !!b.active })}>
                    Edit
                  </button>
                  <button onClick={() => setArchive(b)}>Delete</button>
                </>
              )}
              <div className="book-visibility">
                {readOnly ? (
                  b.active ? (
                    "On"
                  ) : (
                    "Off"
                  )
                ) : (
                  <label className="book-visibility-control">
                    <Switch
                      className="book-visibility-switch"
                      checked={!!b.active}
                      onCheckedChange={(active) =>
                        void setVisibility(b, active)
                      }
                      disabled={
                        visibilityBusy !== null ||
                        (!b.active && b.pages === null)
                      }
                      aria-label={`Show ${b.code} on homepage`}
                      aria-describedby={
                        b.pages === null ? `pages-needed-${b.id}` : undefined
                      }
                      aria-busy={visibilityBusy === b.id}
                    />
                    <span aria-hidden="true">
                      {visibilityBusy === b.id
                        ? "Saving…"
                        : b.active
                          ? "On"
                          : "Off"}
                    </span>
                  </label>
                )}
                {b.pages === null && (
                  <small id={`pages-needed-${b.id}`}>Add pages first</small>
                )}
              </div>
            </div>,
          ])}
        />
      </Result>
      <div className="pagination">
        <button
          className="btn compact"
          disabled={bookPage === 1}
          onClick={() => setBookPage(bookPage - 1)}
        >
          Previous
        </button>
        <span>Catalog page {bookPage}</span>
        <button
          className="btn compact"
          disabled={(data?.length || 0) < 500}
          onClick={() => setBookPage(bookPage + 1)}
        >
          Next
        </button>
      </div>
      <Dialog
        open={clearReview !== null}
        onOpenChange={(open) => !open && !clearBusy && setClearReview(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Clear all {clearReview?.count ?? 0} books?
            </DialogTitle>
            <DialogDescription>
              This removes every book from the catalog, including drafts and
              books outside your current search. Existing orders and receipts
              are kept. Export Excel first if you need a copy of the book list.
            </DialogDescription>
          </DialogHeader>
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                clearBusy ||
                clearConfirmation !== "CLEAR" ||
                !clearReview?.count
              )
                return;
              setClearBusy(true);
              try {
                const result = await api(
                  "manage/books/clear",
                  { confirmation: clearConfirmation, count: clearReview.count },
                  "DELETE",
                );
                toast.success(
                  `${result.cleared} books cleared from the catalog.`,
                );
                setClearReview(null);
                setQ("");
                setBookPage(1);
                setData([]);
                await reload();
              } catch (error) {
                toast.error(errorText(error));
                setClearReview(null);
              } finally {
                setClearBusy(false);
              }
            }}
          >
            <Field label="Type CLEAR to confirm">
              <input
                value={clearConfirmation}
                onChange={(event) => setClearConfirmation(event.target.value)}
                disabled={clearBusy || !clearReview?.count}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <div className="actions">
              <button
                type="button"
                className="btn"
                disabled={clearBusy}
                onClick={() => setClearReview(null)}
              >
                Cancel
              </button>
              <button
                className="btn danger-button"
                disabled={
                  clearBusy ||
                  clearConfirmation !== "CLEAR" ||
                  !clearReview?.count
                }
              >
                <Trash2 size={16} />
                {clearBusy ? "Clearing…" : "Clear all books"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit book" : "Add book"}</DialogTitle>
            <DialogDescription>
              Storefront prices use the Student category rate and page count,
              unless a fixed price is set.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <BookEditor
              initial={edit}
              onSave={async () => {
                setEdit(null);
                await reload();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!importResult}
        onOpenChange={(v) => !v && setImportResult(null)}
      >
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>Excel import results</DialogTitle>
            <DialogDescription>
              {(importResult?.results || []).filter((r: any) => r.ok).length}{" "}
              saved ·{" "}
              {(importResult?.results || []).filter((r: any) => !r.ok).length}{" "}
              skipped or failed. Row numbers match your Excel sheet.
            </DialogDescription>
          </DialogHeader>
          <DataTable
            headers={["Excel row", "Result"]}
            rows={(importResult?.results || []).map((r: any) => [
              r.row,
              r.ok
                ? r.draft
                  ? "Saved as draft — add pages"
                  : "Saved"
                : r.error,
            ])}
          />
        </DialogContent>
      </Dialog>
      <Confirm
        open={!!archive}
        onClose={() => setArchive(null)}
        title="Remove this book from sale?"
        description="The book will be archived. Existing order history is preserved."
        onConfirm={async () => {
          try {
            await api("manage/books/" + archive!.id, {}, "DELETE");
            toast.success("Book removed from sale.");
            await reload();
          } catch (error) {
            toast.error(errorText(error));
          }
        }}
      />
    </>
  );
}
function BookEditor({
  initial,
  onSave,
}: {
  initial: any;
  onSave: () => Promise<void>;
}) {
  const [b, setB] = useState(initial),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [campuses, setCampuses] = useState<any[]>([]),
    [rates, setRates] = useState<any[]>([]);
  useEffect(() => {
    api("manage/campuses")
      .then(setCampuses)
      .catch(() => {});
    api("manage/pricing")
      .then((r) => setRates(r.prices))
      .catch(() => {});
  }, []);
  const set = (k: string, v: any) => setB({ ...b, [k]: v });
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("manage/books" + (b.id ? "/" + b.id : ""), {
            ...b,
            course_code: b.course_code || b.code,
          });
          toast.success("Book saved.");
          await onSave();
        } catch (e) {
          toast.error(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {[
          ["code", "Book code"],
          ["course_code", "Course code"],
          ["title", "Book name"],
          ["author", "Author"],
          ["course_name", "Course name"],
        ].map(([k, label]) => (
          <Field key={k} label={label}>
            <input
              required={k === "code" || k === "title"}
              value={b[k]}
              onChange={(e) =>
                set(
                  k,
                  k === "code" ? e.target.value.toUpperCase() : e.target.value,
                )
              }
            />
          </Field>
        ))}
        <Field label="Campus">
          <Choose
            value={b.campus_id || "none"}
            label="Book campus"
            onChange={(v) => set("campus_id", v === "none" ? null : v)}
            options={[
              { value: "none", label: "All campuses" },
              ...campuses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          rows={3}
          value={b.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label="Pages">
          <input
            type="number"
            min={1}
            max={10000}
            required={b.active}
            value={b.pages ?? ""}
            onChange={(e) =>
              set(
                "pages",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
        <Field label="Pricing category">
          <Choose
            value={b.category}
            label="Category"
            onChange={(v) => set("category", v)}
            options={["A", "B", "C", "D"].map((c) => ({
              value: c,
              label: categoryLabel(c),
            }))}
          />
        </Field>
        <Field label="Fixed-price override (PKR, optional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={b.fixed_price === null ? "" : b.fixed_price / 100}
            onChange={(e) =>
              set(
                "fixed_price",
                e.target.value === ""
                  ? null
                  : Math.round(Number(e.target.value) * 100),
              )
            }
          />
        </Field>
        <div className="field">
          <span>Show on homepage</span>
          <Switch
            checked={b.active}
            onCheckedChange={(v) => set("active", v)}
            aria-label="Show on homepage"
          />
        </div>
      </div>
      <div className="notice">
        Student price:{" "}
        {money(
          b.fixed_price !== null
            ? Math.ceil((b.fixed_price + (rates.find((r) => r.id === "D")?.binding_rate || 0)) / 500) * 500
            : b.pages === null
              ? null
              : Math.ceil(
                  (b.pages * (rates.find((r) => r.id === "D")?.rate || 0) +
                    (rates.find((r) => r.id === "D")?.binding_rate || 0)) /
                    500,
                ) * 500,
        )}
        {b.pages === null && b.fixed_price === null
          ? " · Add pages or fixed price to calculate the price"
          : b.fixed_price === null
            ? ` · ${b.pages} pages × Student category rate + binding (${money(rates.find((r) => r.id === "D")?.binding_rate || 0)}) (rounded up to Rs. 5)`
            : ` · fixed override + binding (${money(rates.find((r) => r.id === "D")?.binding_rate || 0)}) (rounded up to Rs. 5)`}
      </div>
      <Field label="Cover image (JPG or PNG)">
        <input
          type="file"
          accept="image/jpeg,image/png"
          disabled={uploading}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            try {
              const r = await fetch("/api/covers", {
                method: "POST",
                headers: {
                  "Content-Type": f.type,
                  "X-Requested-With": "CampusBookstore",
                },
                body: f,
              });
              const d: any = await r.json();
              if (!r.ok) throw new Error(d.error);
              set("cover", d.url);
              toast.success("Cover uploaded.");
            } catch (e) {
              toast.error(errorText(e));
            } finally {
              setUploading(false);
            }
          }}
        />
      </Field>
      {b.cover && (
        <div className="actions">
          <img src={b.cover} width={75} alt="Book cover preview" />
          <button
            type="button"
            className="btn compact"
            onClick={() => set("cover", null)}
          >
            Remove cover
          </button>
        </div>
      )}
      <button className="btn primary" disabled={busy || uploading}>
        {busy ? "Saving…" : uploading ? "Uploading cover…" : "Save Book"}
      </button>
    </form>
  );
}
function Pricing() {
  const { data, error, loading, reload } = useData("manage/pricing");
  const [change, setChange] = useState<any>(null);
  return (
    <Result loading={loading} error={error}>
      {data && (
        <>
          <div className="notice">
            The homepage and checkout use the Student category rate and binding rate for every book.
            Fixed-price editions also receive the category binding rate. Categories A, B and C
            remain available for campus-specific pricing and reference.
          </div>
          <div className="pricing-admin">
            {data.prices.map((p: any) => (
              <form
                className="panel"
                key={p.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  setChange({
                    ...p,
                    newRate: Math.round(Number(form.get("rate")) * 100),
                    newBindingRate: Math.round(
                      Number(form.get("binding_rate")) * 100,
                    ),
                  });
                }}
              >
                <span className="eyebrow">{categoryLabel(p.id)}</span>
                {p.id === "D" && (
                  <p className="small-text">Default storefront pricing</p>
                )}
                <div className="pricing-current-summary">
                  <div>
                    <h2>{money(p.rate)}</h2>
                    <p className="pricing-subtext">per page</p>
                  </div>
                  <div className="pricing-binding-badge">
                    <span>Binding</span>
                    <strong>{money(p.binding_rate ?? 0)}</strong>
                  </div>
                </div>
                <Field label="New price per page (PKR)">
                  <input
                    name="rate"
                    type="number"
                    min="0.01"
                    max="1000"
                    step="0.01"
                    required
                    defaultValue={p.rate / 100}
                  />
                </Field>
                <Field label="New binding rate (PKR)">
                  <input
                    name="binding_rate"
                    type="number"
                    min="0"
                    max="5000"
                    step="0.01"
                    required
                    defaultValue={(p.binding_rate ?? 0) / 100}
                  />
                </Field>
                <button className="btn primary compact">Review change</button>
              </form>
            ))}
          </div>
          <Confirm
            open={!!change}
            onClose={() => setChange(null)}
            title={"Update " + categoryLabel(change?.id || "") + "?"}
            description={
              change
                ? `Per-page rate: ${money(change.rate)} → ${money(change.newRate)}. Binding rate: ${money(change.binding_rate ?? 0)} → ${money(change.newBindingRate)}. ${change.id === "D" ? "All storefront books will use the new Student rate and binding rate." : "This updates the category reference rate and binding rate."}`
                : ""
            }
            onConfirm={async () => {
              try {
                await api("manage/pricing", {
                  category: change.id,
                  rate: change.newRate,
                  binding_rate: change.newBindingRate,
                  version: change.version,
                  confirmed: true,
                });
                toast.success("Pricing updated.");
                await reload();
              } catch (e) {
                toast.error(errorText(e));
              }
            }}
          />
        </>
      )}
    </Result>
  );
}
function getMapDirectionsUrl(o: any) {
  if (!o) return null;
  const text = `${o.address || ""} ${o.instructions || ""} ${o.delivery_type || ""}`;

  // 1. Match coordinates like 31.5204,74.3587 or 31.5204, 74.3587
  const coordMatch = text.match(/([-+]?\d{1,2}\.\d{3,})[,\s]+([-+]?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    const lat = coordMatch[1];
    const lng = coordMatch[2];
    // Google Maps dir endpoint with api=1 and destination=lat,lng automatically routes from user's current GPS location
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  // 2. Match q= or query= coordinates in pasted map URLs
  const qMatch = text.match(/(?:q|query)=([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/i);
  if (qMatch) {
    return `https://www.google.com/maps/dir/?api=1&destination=${qMatch[1]},${qMatch[2]}`;
  }

  // 3. If full google maps URL is pasted
  const urlMatch = text.match(/(https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps)\S+)/i);
  if (urlMatch) {
    const rawUrl = urlMatch[1];
    if (rawUrl.includes("/dir/") || rawUrl.includes("destination=")) return rawUrl;
    const extractCoords = rawUrl.match(/([-+]?\d{1,2}\.\d{3,})[,\s]+([-+]?\d{1,3}\.\d{3,})/);
    if (extractCoords) {
      return `https://www.google.com/maps/dir/?api=1&destination=${extractCoords[1]},${extractCoords[2]}`;
    }
  }

  // 4. Campus pickup orders: route to university campus pickup location
  if (
    o.delivery_type === "campus" ||
    (o.city && o.city.toLowerCase().includes("campus")) ||
    (o.address && o.address.toLowerCase().includes("campus"))
  ) {
    return "https://maps.app.goo.gl/xgXSaNeVCBvSFtb57";
  }

  // 5. Fallback for Lahore home delivery address: route directly to address in Lahore
  if (
    o.delivery_type === "lahore" ||
    o.delivery_type === "lahore_home" ||
    (o.city && o.city.toLowerCase().includes("lahore"))
  ) {
    if (o.address && !o.address.startsWith("Pickup from")) {
      const cleanAddress = o.address.replace(/📍 Pin Location:.*$/i, "").trim();
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cleanAddress + ", Lahore, Pakistan")}`;
    }
  }

  // 6. Other cities courier delivery destination search
  if (o.delivery_type === "other" || (o.city && !o.city.toLowerCase().includes("lahore") && !o.city.toLowerCase().includes("campus"))) {
    const cleanAddress = (o.address || "")
      .replace(/📍 Pin Location:.*$/i, "")
      .replace(/^Pickup from [^,]+,?\s*/i, "")
      .trim();
    const destination = [cleanAddress, o.city, "Pakistan"].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination || "Pakistan")}`;
  }

  return null;
}

function getMapLocation(o: any) {
  return getMapDirectionsUrl(o);
}

function CourierTrackingModal({
  order,
  onClose,
  onSaved,
}: {
  order: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courierName, setCourierName] = useState(order.courier_name || "");
  const [trackingId, setTrackingId] = useState(order.courier_tracking_id || "");
  const [deliveryStatus, setDeliveryStatus] = useState<"SHIPPED" | "DELIVERED">(
    order.status === "DELIVERED" ? "DELIVERED" : "SHIPPED",
  );
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isPaymentPending =
    order.status === "PAYMENT_PENDING" || order.payment_status !== "VERIFIED";

  const popularCouriers = [
    "Leopards",
    "TCS",
    "Pakistan Post",
    "M&P",
    "Trax",
    "PostEx",
    "Call Courier",
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPaymentPending && !order.courier_tracking_id) {
      toast.error(
        "Payment verification is pending. Please verify and approve payment before adding courier tracking details.",
      );
      return;
    }
    if (!courierName.trim() || !trackingId.trim()) {
      toast.error("Please enter both courier company name and tracking number.");
      return;
    }
    setBusy(true);
    try {
      await api("manage/orders/" + order.id, {
        action: "courier",
        courier_name: courierName.trim(),
        courier_tracking_id: trackingId.trim(),
        status: deliveryStatus,
      });
      toast.success(
        deliveryStatus === "DELIVERED"
          ? "Courier tracking saved & order marked as Delivered ✓"
          : "Courier tracking details saved successfully!",
      );
      window.dispatchEvent(new Event("orders-updated"));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await api("manage/orders/" + order.id, {
        action: "remove_courier",
      });
      toast.success("Courier tracking details removed.");
      window.dispatchEvent(new Event("orders-updated"));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="courier-dialog-content" style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem" }}>
            <Truck size={20} style={{ color: "var(--primary)" }} />
            {order.courier_tracking_id ? "Edit Courier Tracking" : "Add External Courier Tracking"}
          </DialogTitle>
          <DialogDescription>
            Order <strong>{order.reference}</strong> · {order.name} ({order.city || "Other City"})
          </DialogDescription>
        </DialogHeader>

        {isPaymentPending && !order.courier_tracking_id && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid #f59e0b",
              color: "#b45309",
              fontSize: "0.85rem",
              marginTop: 10,
              lineHeight: 1.45,
            }}
          >
            <strong>Payment Verification Pending:</strong> Please approve the student’s payment before adding courier tracking details.
          </div>
        )}

        <form onSubmit={submit} className="stack" style={{ gap: 16, marginTop: 12 }}>
          <div>
            <label className="field-label" style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.85rem" }}>
              Courier Company Name <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              className="input full-width"
              placeholder="e.g. Leopards, TCS, Pakistan Post"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              required
              autoFocus
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {popularCouriers.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`quick-courier-pill ${courierName.toLowerCase() === c.toLowerCase() ? "active" : ""}`}
                  onClick={() => setCourierName(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label" style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.85rem" }}>
              Tracking Number / Tracking ID <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              className="input full-width"
              placeholder="e.g. 7849302194"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              required
            />
            <p className="small-text muted" style={{ margin: "5px 0 0", fontSize: "0.78rem" }}>
              Student will see this in their order journey as:
              <br />
              <code style={{ fontSize: "0.78rem", color: "var(--primary)" }}>
                Shipped via {courierName || "[Courier Company Name]"} - Tracking #: {trackingId || "[Tracking Number]"}
              </code>
            </p>
          </div>

          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--muted)", marginTop: 12 }}>
            <label className="field-label" style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.85rem" }}>
              Parcel Fulfillment Status
            </label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="fulfillment_status"
                  value="SHIPPED"
                  checked={deliveryStatus === "SHIPPED"}
                  onChange={() => setDeliveryStatus("SHIPPED")}
                />
                <span>🚚 Mark as Shipped</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="fulfillment_status"
                  value="DELIVERED"
                  checked={deliveryStatus === "DELIVERED"}
                  onChange={() => setDeliveryStatus("DELIVERED")}
                />
                <span>✅ Mark as Delivered</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 16 }}>
            <div>
              {order.courier_tracking_id && (
                <button
                  type="button"
                  className="btn compact danger-button"
                  onClick={() => setConfirmRemove(true)}
                  disabled={busy}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Remove tracking details and return order to Printing"
                >
                  <Trash2 size={14} />
                  Remove Tracking
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn compact"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary compact"
                disabled={busy || (isPaymentPending && !order.courier_tracking_id)}
                title={isPaymentPending && !order.courier_tracking_id ? "Approve payment before saving tracking" : undefined}
              >
                <Package size={15} />
                {busy ? "Saving…" : "Save Courier Details"}
              </button>
            </div>
          </div>
        </form>

        <Confirm
          open={confirmRemove}
          onClose={() => setConfirmRemove(false)}
          title={`Remove tracking from ${order.reference}?`}
          description="Are you sure you want to remove the courier tracking details? If this parcel has not dispatched yet, the order status will be returned to Printing."
          onConfirm={handleRemove}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignVendorModal({
  order,
  onClose,
  onAssigned,
}: {
  order: any;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState(order.vendor_id || "");
  const [vendorNotes, setVendorNotes] = useState(order.vendor_notes || "");
  const [busy, setBusy] = useState(false);
  const [assignedResult, setAssignedResult] = useState<any | null>(null);

  useEffect(() => {
    api("manage/vendors")
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.vendors || []);
        setVendors(list);
        if (!selectedVendorId && list.length > 0) {
          const firstActive = list.find((v: any) => v.active);
          if (firstActive) setSelectedVendorId(firstActive.id);
        }
      })
      .catch((err) => toast.error(errorText(err)))
      .finally(() => setLoadingVendors(false));
  }, [order.vendor_id, selectedVendorId]);

  const isOther = isOtherCityOrder(order);
  const totalBooks = Number(
    order.total_books ??
      (order.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 1),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error("Please select a printing vendor.");
      return;
    }
    setBusy(true);
    try {
      const res = await api("manage/orders/" + order.id, {
        action: "assign_vendor",
        vendor_id: selectedVendorId,
        notes: vendorNotes.trim(),
      });
      toast.success(res.message || "Order sent to vendor successfully!");
      window.dispatchEvent(new Event("orders-updated"));
      setAssignedResult(res);
      onAssigned();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Factory size={20} style={{ color: "var(--primary)" }} />
            {order.vendor_id ? "Reassign Vendor" : "Send Order to Vendor"}
          </DialogTitle>
          <DialogDescription>
            Order <strong>{order.reference}</strong> · {order.name} ({order.city || "Other City"}) · {totalBooks} book{totalBooks === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        {assignedResult ? (
          <div className="stack" style={{ gap: 16, marginTop: 8 }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid #10b981",
                color: "#065f46",
                fontSize: "0.9rem",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={18} /> Order Pushed to {assignedResult.vendor_name || "Vendor"}!
              </div>
              <div>The order has automatically moved to <strong>Printing</strong> status and is now live in the vendor portal.</div>
            </div>

            {assignedResult.whatsapp_url && (
              <a
                href={assignedResult.whatsapp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "#25D366",
                  borderColor: "#25D366",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  padding: "10px 16px",
                }}
              >
                <MessageCircle size={18} /> Open WhatsApp to Notify Vendor
              </a>
            )}

            <button type="button" className="btn full" onClick={onClose}>
              Done / Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="stack" style={{ gap: 14, marginTop: 6 }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: isOther ? "rgba(59, 130, 246, 0.08)" : "rgba(245, 158, 11, 0.08)",
                border: `1px solid ${isOther ? "#3b82f6" : "#f59e0b"}`,
                fontSize: "0.83rem",
                lineHeight: 1.45,
              }}
            >
              {isOther ? (
                <div>
                  <strong>🚚 Other City (Courier Dispatch):</strong> Vendor will book courier and attach tracking ID in their portal.
                </div>
              ) : (
                <div>
                  <strong>🏛️ Lahore & Campus (Office Delivery):</strong> Vendor will deliver printed batch directly to the <strong>Bookstore Office</strong>. (Only Bookstore Admin dispatches to student).
                </div>
              )}
            </div>

            <Field label="Select Printing Vendor">
              {loadingVendors ? (
                <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Loading vendors…</div>
              ) : vendors.length === 0 ? (
                <div style={{ color: "#ef4444", fontSize: "0.85rem" }}>
                  No vendors found. Please add a vendor in <a href="/admin/vendors" className="text-link">Vendors section</a> first.
                </div>
              ) : (
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <option value="" disabled>-- Select Vendor --</option>
                  {vendors
                    .filter((v) => v.active || v.id === order.vendor_id)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.phone}) — {v.printing_orders_count || 0} in printing
                      </option>
                    ))}
                </select>
              )}
            </Field>

            <Field label="Printing Instructions / Notes (Optional)">
              <textarea
                rows={2}
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                placeholder="e.g. Urgent print, glossy cover, deliver with tomorrow's batch"
                style={{ fontSize: "0.88rem" }}
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button type="button" className="btn compact" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary compact"
                disabled={busy || !selectedVendorId || vendors.length === 0}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Send size={15} />
                {busy ? "Sending…" : "Push Order to Vendor"}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BulkAssignVendorModal({
  orders,
  onClose,
  onAssigned,
}: {
  orders: any[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorNotes, setVendorNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignedResult, setAssignedResult] = useState<any | null>(null);

  useEffect(() => {
    api("manage/vendors")
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.vendors || []);
        setVendors(list);
        if (list.length > 0) {
          const firstActive = list.find((v: any) => v.active);
          if (firstActive) setSelectedVendorId(firstActive.id);
        }
      })
      .catch((err) => toast.error(errorText(err)))
      .finally(() => setLoadingVendors(false));
  }, []);

  const totalBooks = orders.reduce((sum: number, o: any) => {
    const books = Number(
      o.total_books ??
        (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 1),
    );
    return sum + books;
  }, 0);

  const campusLahoreCount = orders.filter((o) => isCampusOrder(o) || isLahoreOrder(o)).length;
  const otherCityCount = orders.filter((o) => isOtherCityOrder(o)).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error("Please select a printing vendor.");
      return;
    }
    setBusy(true);
    try {
      const orderIds = orders.map((o) => o.id);
      const res = await api("manage/orders/batch-assign-vendor", {
        orderIds,
        vendorId: selectedVendorId,
        notes: vendorNotes.trim(),
      });
      toast.success(res.message || `Successfully sent ${res.count ?? orders.length} orders to vendor!`);
      window.dispatchEvent(new Event("orders-updated"));
      setAssignedResult(res);
      onAssigned();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ maxWidth: 540 }}>
        <DialogHeader>
          <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Factory size={20} style={{ color: "var(--primary)" }} />
            Send {orders.length} Verified Order{orders.length === 1 ? "" : "s"} to Vendor
          </DialogTitle>
          <DialogDescription>
            Bulk push <strong>{orders.length} orders</strong> ({totalBooks} books total) directly into the vendor printing queue.
          </DialogDescription>
        </DialogHeader>

        {assignedResult ? (
          <div className="stack" style={{ gap: 16, marginTop: 8 }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid #10b981",
                color: "#065f46",
                fontSize: "0.9rem",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={18} /> Batch Pushed to {assignedResult.vendor?.name || "Vendor"}!
              </div>
              <div>
                All <strong>{assignedResult.count ?? orders.length} order(s)</strong> have moved to <strong>Printing Queue</strong>. The vendor has been notified and can start printing immediately.
              </div>
            </div>

            <button type="button" className="btn full primary" onClick={onClose}>
              Done / Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="stack" style={{ gap: 14, marginTop: 6 }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid #10b981",
                fontSize: "0.83rem",
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 600, color: "#065f46", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={14} /> Verified Student Orders Only
              </div>
              <div style={{ color: "#047857" }}>
                {campusLahoreCount > 0 && (
                  <span>🏛️ <strong>{campusLahoreCount}</strong> Campus / Lahore order(s) (Vendor delivers printed batch to Bookstore Office). </span>
                )}
                {otherCityCount > 0 && (
                  <span>🚚 <strong>{otherCityCount}</strong> Other City order(s) (Vendor books courier parcel & attaches tracking).</span>
                )}
              </div>
            </div>

            <div
              style={{
                maxHeight: 140,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 12px",
                background: "var(--muted, #f8fafc)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {orders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.80rem",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 4,
                  }}
                >
                  <div>
                    <strong>{o.reference}</strong> · {o.name}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {o.total_books || 1} book(s)
                    </span>
                    <span
                      style={{
                        fontSize: "0.70rem",
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "rgba(37, 99, 235, 0.1)",
                        color: "#1d4ed8",
                        fontWeight: 600,
                      }}
                    >
                      {isCampusOrder(o) ? "Qanchi Campus" : isOtherCityOrder(o) ? (o.city || "Other City") : "Lahore Route"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Field label="Select Printing Vendor">
              {loadingVendors ? (
                <div style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Loading vendors…</div>
              ) : vendors.length === 0 ? (
                <div style={{ color: "#ef4444", fontSize: "0.85rem" }}>
                  No vendors found. Please add a vendor in <a href="/admin/vendors" className="text-link">Vendors section</a> first.
                </div>
              ) : (
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                  }}
                >
                  <option value="" disabled>-- Select Vendor --</option>
                  {vendors
                    .filter((v) => v.active)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.phone}) — {v.printing_orders_count || 0} currently in printing
                      </option>
                    ))}
                </select>
              )}
            </Field>

            <Field label="Printing Instructions / Notes (Optional)">
              <textarea
                rows={2}
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                placeholder="e.g. Urgent batch print, deliver together to Bookstore Office"
                style={{ fontSize: "0.88rem" }}
              />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button type="button" className="btn compact" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary compact"
                disabled={busy || !selectedVendorId || vendors.length === 0}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Send size={14} />
                {busy ? "Sending to Vendor…" : `Send ${orders.length} Order(s) to Vendor`}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OrderModalPopup({
  id,
  user,
  onClose,
  onDeleted,
}: {
  id: string;
  user: User;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { data: o, error, loading, reload } = useData("manage/orders/" + id);
  const [note, setNote] = useState("");
  const [next, setNext] = useState("");
  const [decision, setDecision] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [assignVendorOpen, setAssignVendorOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const admin = user.role === "SUPER_ADMIN";
  const isVendor = user.role === "VENDOR";
  const canUpdate = admin || user.permissions.includes("orders.update");

  const act = async (action: string, status?: string) => {
    try {
      await api("manage/orders/" + id, {
        action,
        status,
        note,
        version: o.version,
      });
      setNote("");
      setNext("");
      toast.success("Order updated.");
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const deleteOrder = async () => {
    try {
      await api("manage/orders/" + id, {}, "DELETE");
      toast.success("Order deleted successfully.");
      window.dispatchEvent(new Event("orders-updated"));
      onDeleted();
      onClose();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="order-modal-popup-content" showCloseButton={false}>
        <DialogHeader className="order-modal-header">
          <div className="order-modal-title-row">
            <div>
              <DialogTitle className="order-modal-title">
                Order {o ? o.reference : id}
              </DialogTitle>
              {o && (
                <div className="order-modal-badges">
                  <Status value={o.status} />
                  <Status value={o.payment_status} />
                </div>
              )}
            </div>
            <div className="order-modal-header-actions">
              {o && !isVendor && <ReceiptButtons order={o} />}
              {admin && o && (
                <button
                  className="btn compact danger-button"
                  onClick={() => setDeleting(true)}
                  title="Delete Order"
                >
                  <Trash2 size={16} /> Delete Order
                </button>
              )}
              <button
                className="btn compact icon-only"
                onClick={onClose}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </DialogHeader>

        <Result loading={loading} error={error}>
          {o && (
            <div className="order-modal-body stack">
              {(() => {
                const isCampus =
                  o.delivery_type === "campus" ||
                  (o.city && o.city.toLowerCase().includes("campus")) ||
                  (o.address && o.address.toLowerCase().includes("campus"));
                const isOther =
                  o.delivery_type === "other" ||
                  (!isCampus && o.city && !o.city.toLowerCase().includes("lahore"));
                if (!isOther) return null;

                const isPaymentVerified =
                  o.payment_status === "VERIFIED" && o.status !== "PAYMENT_PENDING";

                return (
                  <div
                    className="courier-modal-banner"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 18px",
                      margin: "2px 0 10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        className="courier-badge"
                        style={{
                          padding: "6px 8px",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isPaymentVerified || o.courier_tracking_id ? undefined : "#f59e0b",
                        }}
                      >
                        {isPaymentVerified || o.courier_tracking_id ? <Truck size={20} /> : <Clock size={20} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.95rem", display: "block" }}>
                          {o.courier_tracking_id
                            ? "External Courier Tracking Attached"
                            : isPaymentVerified
                              ? "External Courier Tracking (Other City)"
                              : "External Courier Tracking (Pending Payment Verification)"}
                        </strong>
                        <p className="small-text" style={{ margin: "2px 0 0" }}>
                          {o.courier_name && o.courier_tracking_id ? (
                            <>
                              Shipped via <strong>{o.courier_name}</strong> · Tracking ID:{" "}
                              <code className="courier-tracking-code">
                                {o.courier_tracking_id}
                              </code>
                            </>
                          ) : isPaymentVerified ? (
                            "Add courier tracking details (e.g. Leopards, TCS, Trax) for student tracking."
                          ) : (
                            "Payment verification is pending. Please approve payment first to add courier tracking details."
                          )}
                        </p>
                      </div>
                    </div>
                    {(canUpdate || isVendor) && (
                      <button
                        type="button"
                        className={isPaymentVerified || o.courier_tracking_id ? "btn primary compact" : "btn compact"}
                        onClick={() => {
                          if (!isPaymentVerified && !o.courier_tracking_id) {
                            toast.error("Payment verification is pending. Please approve payment before adding courier tracking.");
                            return;
                          }
                          setCourierModalOpen(true);
                        }}
                        disabled={!isPaymentVerified && !o.courier_tracking_id}
                        title={
                          !isPaymentVerified && !o.courier_tracking_id
                            ? "Approve payment before adding courier tracking"
                            : undefined
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                          opacity: !isPaymentVerified && !o.courier_tracking_id ? 0.6 : 1,
                          cursor: !isPaymentVerified && !o.courier_tracking_id ? "not-allowed" : "pointer",
                        }}
                      >
                        <Truck size={14} />
                        {o.courier_tracking_id
                          ? "Edit Tracking"
                          : isPaymentVerified
                            ? "Add Courier Details"
                            : "Payment Pending"}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Vendor Assignment Banner / Action (Super Admin / Staff only - vendors do not see this) */}
              {o && (() => {
                if (!isVendor && o.vendor_name) {
                  return (
                    <div
                      className="vendor-assigned-banner"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "color-mix(in srgb, var(--primary) 8%, var(--card))",
                        border: "1px solid color-mix(in srgb, var(--primary) 25%, var(--border))",
                        margin: "2px 0 10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Factory size={18} />
                        </div>
                        <div>
                          <strong style={{ fontSize: "0.92rem", display: "block" }}>
                            Assigned to Vendor: {o.vendor_name}
                          </strong>
                          <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                            {o.vendor_phone ? `WhatsApp: ${o.vendor_phone}` : ""}
                            {o.vendor_notes ? ` · Instructions: "${o.vendor_notes}"` : ""}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {o.vendor_phone && (
                          <a
                            href={getVendorWhatsAppUrl(o, { name: o.vendor_name, phone: o.vendor_phone })}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn compact"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: "#25D366",
                              borderColor: "#25D366",
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                            title="Open WhatsApp chat with vendor"
                          >
                            <MessageCircle size={14} /> WhatsApp Vendor
                          </a>
                        )}
                        {admin && (
                          <button
                            type="button"
                            className="btn compact"
                            onClick={() => setAssignVendorOpen(true)}
                            style={{ fontSize: "0.8rem" }}
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (admin && ["CONFIRMED", "PROCESSING"].includes(o.status)) {
                  return (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderRadius: 8,
                        background: "rgba(37, 99, 235, 0.06)",
                        border: "1px dashed #3b82f6",
                        margin: "2px 0 10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.9rem", color: "#1d4ed8" }}>Ready for Printing Vendor</strong>
                        <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                          Push this order directly to a printing vendor to start printing and notify them via WhatsApp/Email.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn primary compact"
                        onClick={() => setAssignVendorOpen(true)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <Send size={14} /> Send to Vendor
                      </button>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Vendor Printing Queue Card (Vendor only - interactive) */}
              {isVendor && o.status === "PROCESSING" && (
                <div
                  className="printing-queue-banner"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: o.vendor_printed_at
                      ? "rgba(22, 163, 74, 0.08)"
                      : "rgba(245, 158, 11, 0.08)",
                    border: o.vendor_printed_at
                      ? "1px solid #86efac"
                      : "1px solid #fde68a",
                    margin: "2px 0 10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: o.vendor_printed_at ? "#16a34a" : "#d97706",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Printer size={18} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "0.92rem" }}>Printing Queue</strong>
                        <span
                          className="mono-pill"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background: o.vendor_printed_at ? "rgba(22, 163, 74, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: o.vendor_printed_at ? "#15803d" : "#b45309",
                          }}
                        >
                          {o.vendor_printed_at ? "Printed ✓" : "In Printing Queue"}
                        </span>
                      </div>
                      <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                        {o.vendor_printed_at
                          ? `Marked as printed (${formatDateDMY(o.vendor_printed_at)}). Ready for dispatch or pickup.`
                          : "Order is in the active printing queue waiting for printing."}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className={`btn compact ${o.vendor_printed_at ? "" : "primary"}`}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`manage/orders/${o.id}`, {
                            action: "vendor_print",
                            printed: !o.vendor_printed_at,
                          });
                          toast.success(!o.vendor_printed_at ? "Marked as Printed ✓" : "Print status cleared (back in queue)");
                          window.dispatchEvent(new Event("orders-updated"));
                          await reload();
                        } catch (e) {
                          toast.error(errorText(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {o.vendor_printed_at ? <RotateCcw size={13} /> : <CheckCircle2 size={14} />}
                      {o.vendor_printed_at ? "Unmark Printed" : "Mark as Printed"}
                    </button>
                  </div>
                </div>
              )}

              {/* Super Admin Printing Status Banner (Read-only, no buttons) */}
              {!isVendor && o.status === "PROCESSING" && (
                <div
                  className="printing-queue-banner"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: o.vendor_printed_at
                      ? "rgba(22, 163, 74, 0.08)"
                      : "rgba(245, 158, 11, 0.08)",
                    border: o.vendor_printed_at
                      ? "1px solid #86efac"
                      : "1px solid #fde68a",
                    margin: "2px 0 10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: o.vendor_printed_at ? "#16a34a" : "#d97706",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Printer size={18} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "0.92rem" }}>Vendor Printing Status</strong>
                        <span
                          className="mono-pill"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background: o.vendor_printed_at ? "rgba(22, 163, 74, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: o.vendor_printed_at ? "#15803d" : "#b45309",
                          }}
                        >
                          {o.vendor_printed_at ? "Printed by Vendor ✓" : "In Vendor Printing Queue"}
                        </span>
                      </div>
                      <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                        {o.vendor_printed_at
                          ? `Books printed by vendor (${formatDateDMY(o.vendor_printed_at)}).`
                          : "Order is in the vendor's active printing queue waiting to be printed."}
                        {o.vendor_name ? ` Assigned to: ${o.vendor_name}.` : ""}
                      </p>
                    </div>
                  </div>
                  {o.vendor_dispatched_at && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 9999,
                        background: "rgba(37, 99, 235, 0.12)",
                        color: "#1d4ed8",
                        border: "1px solid #93c5fd",
                      }}
                    >
                      <Building2 size={12} /> Dispatched to Office
                    </span>
                  )}
                </div>
              )}

              <div className="checkout-grid order-modal-grid">
                <div className="stack">
                  {!isVendor && (
                    <>
                      {/* Direct Online Payment Slip View */}
                      {o.slip_id && (
                        <div className="panel slip-online-panel">
                          <div className="slip-panel-header">
                            <h3>Attached Payment Slip</h3>
                            <div className="slip-actions">
                              <a
                                className="btn primary compact"
                                href={"/api/proofs/" + o.slip_id + "?download=1"}
                                download
                              >
                                <Download size={15} /> Download
                              </a>
                            </div>
                          </div>
                          <div className="slip-online-frame-wrap">
                            {o.slip_mime === "application/pdf" ? (
                              <iframe
                                src={"/api/proofs/" + o.slip_id}
                                className="slip-online-iframe"
                                title="Payment Slip PDF"
                              />
                            ) : (
                              <img
                                src={"/api/proofs/" + o.slip_id}
                                alt="Payment Slip"
                                className="slip-online-img"
                                onClick={() => window.open("/api/proofs/" + o.slip_id, "_blank")}
                                title="Click to view full size"
                              />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="print-only">
                        <OrderReceipt o={o} />
                      </div>
                    </>
                  )}
                </div>

                <div className="stack no-print">
                  {isVendor ? (
                    <div className="panel stack">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0 }}>Printing & Fulfillment Instructions</h3>
                        <Status value={o.status} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 8, background: "var(--muted)", margin: "4px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total books ordered:</span>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)}{" "}
                            {Number(o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)) === 1 ? "book" : "books"}
                          </strong>
                        </div>
                        {o.vendor_notes && (
                          <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                            <span style={{ color: "var(--muted-foreground)" }}>Special Notes: </span>
                            <strong>{o.vendor_notes}</strong>
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "var(--muted)",
                          margin: "2px 0 6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle2
                            size={16}
                            color={o.vendor_printed_at ? "#16a34a" : "var(--muted-foreground)"}
                          />
                          <span style={{ fontSize: "0.85rem" }}>Print Status:</span>
                          <strong>{o.vendor_printed_at ? "Printed ✓" : "Pending Print"}</strong>
                        </div>
                        <button
                          type="button"
                          className={`btn compact ${o.vendor_printed_at ? "" : "primary"}`}
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await api(`manage/orders/${o.id}`, {
                                action: "vendor_print",
                                printed: !o.vendor_printed_at,
                              });
                              toast.success(!o.vendor_printed_at ? "Marked as Printed ✓" : "Print status cleared");
                              await reload();
                            } catch (e) {
                              toast.error(errorText(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {o.vendor_printed_at ? "Unmark" : "Mark as Printed"}
                        </button>
                      </div>

                      {isOtherCityOrder(o) ? (
                        o.status === "SHIPPED" ? (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              background: "rgba(16, 185, 129, 0.08)",
                              border: "1px solid #10b981",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                            }}
                          >
                            <strong style={{ color: "#047857" }}>🚚 Shipped via Courier:</strong>
                            <p style={{ margin: "4px 0 8px" }}>
                              Shipped via <strong>{o.courier_name}</strong> · Tracking ID: <code>{o.courier_tracking_id}</code>. Once the parcel is delivered to student, click below to mark as Delivered:
                            </p>
                            <button
                              type="button"
                              className="btn primary compact"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await api(`manage/orders/${o.id}`, {
                                    action: "status",
                                    status: "DELIVERED",
                                    version: o.version,
                                    note: "Marked as delivered by vendor",
                                  });
                                  toast.success("Order marked as Delivered ✓");
                                  window.dispatchEvent(new Event("orders-updated"));
                                  await reload();
                                } catch (e) {
                                  toast.error(errorText(e));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              style={{ gap: 6, background: "#059669", borderColor: "#059669" }}
                            >
                              <CheckCircle2 size={14} /> Mark as Delivered
                            </button>
                          </div>
                        ) : o.status === "DELIVERED" ? (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              background: "rgba(16, 185, 129, 0.08)",
                              border: "1px solid #10b981",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                            }}
                          >
                            <strong style={{ color: "#047857" }}>✅ Delivered to Student:</strong>
                            <p style={{ margin: "4px 0 0" }}>
                              Fulfillment complete. Delivered via {o.courier_name} (Tracking: {o.courier_tracking_id}).
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              background: "rgba(59, 130, 246, 0.08)",
                              border: "1px solid #3b82f6",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                            }}
                          >
                            <strong>🚚 Other City Delivery:</strong>
                            <p style={{ margin: "4px 0 0" }}>
                              Please print books and dispatch via courier. Once dispatched, click "Add Courier Details" or "Edit Tracking" above to attach tracking ID. Saving tracking will automatically mark order as <strong>Shipped</strong>.
                            </p>
                          </div>
                        )
                      ) : (
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            background: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid #f59e0b",
                            fontSize: "0.85rem",
                            lineHeight: 1.45,
                          }}
                        >
                          <strong>🏛️ Deliver to Bookstore Office:</strong>
                          <p style={{ margin: "4px 0 8px" }}>
                            This order is for Lahore / VU Qanchi Campus. Once books are printed, click below to mark this batch as dispatched to the Bookstore Office.
                          </p>
                          {o.status === "PROCESSING" ? (
                            <button
                              type="button"
                              className="btn primary compact"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await api(`manage/orders/${o.id}`, {
                                    action: "vendor_dispatch_office",
                                  });
                                  toast.success("Order dispatched to Bookstore Office ✓");
                                  await reload();
                                } catch (e) {
                                  toast.error(errorText(e));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              style={{ gap: 6, background: "#2563eb" }}
                            >
                              <Building2 size={14} /> Send to Bookstore Office
                            </button>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <span
                                className="mono-pill"
                                style={{
                                  background: "rgba(37, 99, 235, 0.15)",
                                  color: "#1d4ed8",
                                  fontWeight: 600,
                                }}
                              >
                                <Building2 size={12} /> Dispatched to Office
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                                Awaiting admin verification & delivery
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="panel stack">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                        <h3 style={{ margin: 0 }}>Payment verification</h3>
                        <Status value={o.payment_status} />
                      </div>

                      {(o.vendor_printed_at || o.vendor_dispatched_at) && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 14px", borderRadius: 8, background: "var(--muted)", margin: "4px 0" }}>
                          {o.vendor_printed_at && (
                            <span className="mono-pill" style={{ background: "rgba(22, 163, 74, 0.15)", color: "#15803d", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={13} /> Printed by Vendor ({formatDateDMY(o.vendor_printed_at)})
                            </span>
                          )}
                          {o.vendor_dispatched_at && (
                            <span className="mono-pill" style={{ background: "rgba(37, 99, 235, 0.15)", color: "#1d4ed8", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Building2 size={13} /> Dispatched by Vendor to Office ({formatDateDMY(o.vendor_dispatched_at)})
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 8, background: "var(--muted)", margin: "4px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Order total to receive:</span>
                          <strong style={{ fontSize: "1.08rem", color: "var(--foreground)" }}>{money(o.total)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total books ordered:</span>
                          <strong style={{ fontSize: "0.9rem" }}>
                            {o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)}{" "}
                            {Number(o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)) === 1 ? "book" : "books"}
                          </strong>
                        </div>
                      </div>

                      {o.payment_note && (
                        <div className="notice info-text" style={{ margin: "2px 0 6px" }}>
                          <strong>Note:</strong> {o.payment_note}
                        </div>
                      )}
                      {canUpdate && (
                        <Field label="Reason or note">
                          <textarea
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Explain rejection, request or status update"
                          />
                        </Field>
                      )}
                      {admin && o.status === "PAYMENT_PENDING" && (
                        <div className="actions">
                          {[
                            ["approve", "Approve Payment"],
                            ["reject", "Reject Payment"],
                            ["request", "Request New Slip"],
                            ["manual", "Manual Review"],
                          ].map(([action, label]) => (
                            <button
                              key={action}
                              className={
                                "btn compact " +
                                (action === "approve" ? "primary" : "")
                              }
                              onClick={() => setDecision({ action, label })}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                      {admin && (
                        <button
                          className="btn compact"
                          disabled={!note.trim()}
                          onClick={() => act("note")}
                        >
                          Save private admin note
                        </button>
                      )}
                    </div>
                  )}

                  {!isVendor && canUpdate && transitions[o.status]?.length > 0 && (
                    <div className="panel stack">
                      <h3>Update fulfilment</h3>
                      <Choose
                        label="Next status"
                        value={next || "none"}
                        onChange={setNext}
                        options={[
                          { value: "none", label: "Choose next status" },
                          ...transitions[o.status]
                            .filter(
                              (s) =>
                                s !== "READY" &&
                                (admin ||
                                  [
                                    "PROCESSING",
                                    "SHIPPED",
                                    "DELIVERED",
                                  ].includes(s)),
                            )
                            .map((s) => ({ value: s, label: statuses[s] })),
                        ]}
                      />
                      {isOtherCityOrder(o) &&
                        ["SHIPPED", "DELIVERED"].includes(next) &&
                        !o.courier_tracking_id?.trim() && (
                          <div
                            className="notice warning-text"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              padding: "8px 12px",
                              borderRadius: 6,
                              background: "rgba(239, 68, 68, 0.08)",
                              border: "1.5px solid #ef4444",
                              color: "#dc2626",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              margin: "6px 0",
                            }}
                          >
                            <span>⚠️ Please Add Tracking Details</span>
                            <button
                              type="button"
                              className="btn compact primary"
                              style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                              onClick={() => setCourierModalOpen(true)}
                            >
                              Add Tracking Now
                            </button>
                          </div>
                        )}
                      <button
                        className="btn primary"
                        disabled={!next || next === "none"}
                        onClick={() => {
                          if (
                            isOtherCityOrder(o) &&
                            ["SHIPPED", "DELIVERED"].includes(next) &&
                            !o.courier_tracking_id?.trim()
                          ) {
                            toast.error("Please Add Tracking Details");
                            setCourierModalOpen(true);
                            return;
                          }
                          setDecision({
                            action: "status",
                            status: next,
                            label: statuses[next],
                          });
                        }}
                      >
                        Update Status
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel history-panel">
                <h3>Order history</h3>
                <DataTable
                  headers={["When", "Status", "Note", "By"]}
                  rows={o.history.map((h: any) => [
                    new Date(h.created_at).toLocaleString(),
                    <Status value={h.status} />,
                    `${h.internal ? "[Private] " : ""}${h.note}`,
                    h.actor,
                  ])}
                />
              </div>
            </div>
          )}
        </Result>

        <Confirm
          open={!!decision}
          onClose={() => setDecision(null)}
          title={decision?.label || "Update order"}
          description={
            decision?.action === "approve"
              ? "Confirm only after checking the bank transaction. Approval confirms the order."
              : "This decision will be recorded in the order history and audit log."
          }
          onConfirm={() => act(decision.action, decision.status)}
        />

        <Confirm
          open={deleting}
          onClose={() => setDeleting(false)}
          title={"Delete Order " + (o?.reference || id) + "?"}
          description="Are you sure you want to permanently delete this order? This action cannot be undone."
          onConfirm={deleteOrder}
        />

        {courierModalOpen && o && (
          <CourierTrackingModal
            order={o}
            onClose={() => setCourierModalOpen(false)}
            onSaved={reload}
          />
        )}

        {assignVendorOpen && o && (
          <AssignVendorModal
            order={o}
            onClose={() => setAssignVendorOpen(false)}
            onAssigned={reload}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const STATUS_ADVANCE_FLOW: Record<
  string,
  { to: string; toLabel: string; fromLabel: string }
> = {
  SHIPPED: {
    to: "DELIVERED",
    toLabel: "Delivered",
    fromLabel: "Shipped",
  },
};

type WorkflowTab = {
  id: string;
  label: string;
  title: string;
  icon: string;
  statuses: string[];
  color: string;
  urgent?: boolean;
};

const ORDER_WORKFLOW_TABS: WorkflowTab[] = [
  { id: "ALL", label: "All Orders", title: "All Orders", icon: "📋", statuses: [], color: "all" },
  { id: "PAYMENT_PENDING", label: "Pending", title: "Pending Payment Verification", icon: "⏳", statuses: ["PAYMENT_PENDING"], urgent: true, color: "pending" },
  { id: "CONFIRMED", label: "Confirmed", title: "Confirmed / Ready for Printing Queue", icon: "📑", statuses: ["CONFIRMED"], color: "confirmed" },
  { id: "PROCESSING", label: "Printing Queue", title: "Orders Currently in Printing Queue", icon: "🖨️", statuses: ["PROCESSING"], urgent: true, color: "printing" },
  { id: "PRINTED", label: "Printed / Ready", title: "Orders Printed & Ready for Dispatch", icon: "📦", statuses: ["PROCESSING"], color: "confirmed" },
  { id: "SHIPPED", label: "Shipped", title: "Shipped / With Rider", icon: "🚚", statuses: ["SHIPPED"], color: "shipped" },
  { id: "DELIVERED", label: "Delivered", title: "Delivered / Completed", icon: "✅", statuses: ["DELIVERED"], color: "delivered" },
  { id: "CANCELLED", label: "Cancelled", title: "Cancelled Orders", icon: "❌", statuses: ["CANCELLED"], color: "cancelled" },
  { id: "REJECTED", label: "Rejected", title: "Rejected Orders", icon: "🚫", statuses: ["REJECTED"], color: "rejected" },
  { id: "REFUND_REQUESTED", label: "Refunded", title: "Refund Requested / Processed", icon: "💸", statuses: ["REFUND_REQUESTED"], color: "refunded" },
];

const ORDER_DELIVERY_CHIPS = [
  { id: "all", label: "All Delivery Channels", icon: "🌐" },
  { id: "campus", label: "Qanchi Campus", icon: "🏛️" },
  { id: "lahore", label: "Lahore (Rider)", icon: "🛵" },
  { id: "other", label: "Other Cities (Courier)", icon: "📦" },
];

const VENDOR_WORKFLOW_TABS: WorkflowTab[] = [
  { id: "PROCESSING", label: "Printing Queue", title: "Orders Currently In Printing Queue", icon: "🖨️", statuses: ["PROCESSING"], urgent: true, color: "printing" },
  { id: "PRINTED", label: "Printed / Ready", title: "Orders Printed & Ready for Dispatch", icon: "📦", statuses: ["PROCESSING"], color: "confirmed" },
  { id: "ALL", label: "All Orders", title: "All Orders", icon: "📋", statuses: [], color: "all" },
  { id: "SHIPPED", label: "Shipped", title: "Orders Shipped / Handed Over", icon: "🚚", statuses: ["SHIPPED"], color: "shipped" },
  { id: "DELIVERED", label: "Delivered", title: "Completed Orders", icon: "✅", statuses: ["DELIVERED"], color: "delivered" },
];

const VENDOR_DELIVERY_CHIPS = [
  { id: "all", label: "All Orders", icon: "🌐" },
  { id: "other", label: "Other Cities (Courier Dispatch)", icon: "📦" },
  { id: "campus_lahore", label: "Qanchi Campus Lahore", icon: "🏛️" },
];

function Orders({
  base,
  payments = false,
  user,
}: {
  base: string;
  payments?: boolean;
  user?: User;
}) {
  const isAdmin = user?.role === "SUPER_ADMIN";
  const isVendor = user?.role === "VENDOR";
  const canUpdate = isAdmin || isVendor || user?.permissions?.includes("orders.update");

  const [campus, setCampus] = useState("");
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(location.search).get("status");
      if (param) return param;
    }
    if (isVendor) return "PROCESSING";
    return payments ? "PAYMENT_PENDING" : "ALL";
  });
  const [printedFilter, setPrintedFilter] = useState<string>(() => (isVendor ? "0" : ""));
  const [statusList, setStatusList] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const param = new URLSearchParams(location.search).get("status");
      if (param) return [param];
    }
    if (isVendor) return ["PROCESSING"];
    return payments ? ["PAYMENT_PENDING"] : [];
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const campusParam = params.get("campus");
    if (campusParam) setCampus(campusParam);
    const statusParam = params.get("status");
    if (statusParam) {
      setStatusList([statusParam]);
      setActiveTab(statusParam);
      setPrintedFilter(statusParam === "PROCESSING" ? "0" : "");
    } else if (isVendor) {
      setStatusList(["PROCESSING"]);
      setActiveTab("PROCESSING");
      setPrintedFilter("0");
    }
  }, [isVendor]);
  const [q, setQ] = useState(""),
    [deliveryTypeList, setDeliveryTypeList] = useState<string[]>([]),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(15),
    [dates, setDates] = useState({ from: "", to: "" }),
    [activeOrderId, setActiveOrderId] = useState<string | null>(null),
    [deletingOrder, setDeletingOrder] = useState<any | null>(null),
    [batchUpdating, setBatchUpdating] = useState(false),
    [batchPrinting, setBatchPrinting] = useState(false),
    [batchDispatching, setBatchDispatching] = useState(false),
    [batchQueueUpdating, setBatchQueueUpdating] = useState(false),
    [markingDeliveredId, setMarkingDeliveredId] = useState<string | null>(null),
    [queueBusyId, setQueueBusyId] = useState<string | null>(null),
    [batchConfirm, setBatchConfirm] = useState<{
      fromStatus: string;
      toStatus: string;
      count: number;
      fromLabel: string;
      toLabel: string;
    } | null>(null),
    [exporting, setExporting] = useState(false),
    [editingCourierOrder, setEditingCourierOrder] = useState<any | null>(null),
    [assigningOrder, setAssigningOrder] = useState<any | null>(null),
    [bulkAssigningOrders, setBulkAssigningOrders] = useState<any[] | null>(null),
    [printingBusyId, setPrintingBusyId] = useState<string | null>(null),
    [dispatchOfficeOrder, setDispatchOfficeOrder] = useState<any | null>(null),
    [dispatchingOffice, setDispatchingOffice] = useState(false);

  const handleVendorPrint = async (ord: any, markAsPrinted: boolean) => {
    setPrintingBusyId(ord.id);
    try {
      await api(`manage/orders/${ord.id}`, {
        action: "vendor_print",
        printed: markAsPrinted,
      });
      toast.success(markAsPrinted ? "Marked as Printed ✓" : "Print status cleared (back in queue)");
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setPrintingBusyId(null);
    }
  };

  const handleSetPrintingQueue = async (ord: any, inQueue: boolean) => {
    setQueueBusyId(ord.id);
    try {
      await api(`manage/orders/${ord.id}`, {
        action: "printing_queue",
        in_queue: inQueue,
      });
      toast.success(
        inQueue
          ? "Order added to Printing Queue ✓"
          : "Order removed from Printing Queue (reverted to Confirmed) ✓",
      );
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setQueueBusyId(null);
    }
  };

  const handleBatchSetPrintingQueue = async (ids: string[], inQueue: boolean) => {
    if (!ids.length) return;
    setBatchQueueUpdating(true);
    try {
      const res = await api("manage/orders/batch-printing-queue", {
        orderIds: ids,
        inQueue,
      });
      toast.success(res.message || (inQueue ? `Added ${ids.length} order(s) to Printing Queue` : `Removed ${ids.length} order(s) from Printing Queue`));
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBatchQueueUpdating(false);
    }
  };

  const handleMarkDelivered = async (ord: any) => {
    setMarkingDeliveredId(ord.id);
    try {
      await api(`manage/orders/${ord.id}`, {
        action: "status",
        status: "DELIVERED",
        version: ord.version,
        note: "Marked as delivered by vendor",
      });
      toast.success("Order marked as Delivered ✓");
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setMarkingDeliveredId(null);
    }
  };

  const handleBatchVendorPrint = async (ids: string[], markAsPrinted = true) => {
    if (!ids.length) return;
    setBatchPrinting(true);
    try {
      const res = await api("manage/orders/batch-vendor-print", {
        orderIds: ids,
        printed: markAsPrinted,
      });
      toast.success(res.message || `Updated print status for ${res.count ?? ids.length} order(s).`);
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBatchPrinting(false);
    }
  };

  const handleBatchVendorDispatchOffice = async (ids: string[]) => {
    if (!ids.length) return;
    setBatchDispatching(true);
    try {
      const res = await api("manage/orders/batch-vendor-dispatch-office", {
        orderIds: ids,
      });
      toast.success(res.message || `Dispatched ${res.count ?? ids.length} order(s) to Qanchi Campus.`);
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBatchDispatching(false);
    }
  };

  const handleDispatchOffice = async () => {
    if (!dispatchOfficeOrder) return;
    setDispatchingOffice(true);
    try {
      await api(`manage/orders/${dispatchOfficeOrder.id}`, {
        action: "vendor_dispatch_office",
      });
      toast.success("Order dispatched to Bookstore Office ✓");
      setDispatchOfficeOrder(null);
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setDispatchingOffice(false);
    }
  };

  const exportOrders = async () => {
    setExporting(true);
    try {
      const statusParam = statusList.join(",");
      const deliveryTypeParam = deliveryTypeList.join(",");
      const printedParam = isVendor ? printedFilter : "";
      const exportPath = `manage/orders?q=${encodeURIComponent(q)}&status=${encodeURIComponent(statusParam)}&delivery_type=${encodeURIComponent(deliveryTypeParam)}&printed=${encodeURIComponent(printedParam)}&from=${dates.from}&to=${dates.to}&campus=${encodeURIComponent(campus)}&limit=all`;
      const res = await api(exportPath);
      const rows = res.rows || [];
      if (!rows.length) {
        toast.info("No orders found to export.");
        return;
      }
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const currentDate = `${dd}-${mm}-${yyyy}`;

      let deliveryPrefix = "Orders";
      let sheetName = "Orders";
      const isCombinedQanchiLahore =
        deliveryTypeList.length === 2 &&
        deliveryTypeList.includes("campus") &&
        deliveryTypeList.includes("lahore");

      if (isCombinedQanchiLahore) {
        deliveryPrefix = "Qanchi Campus Lahore";
        sheetName = "Qanchi Campus Lahore";
      } else if (deliveryTypeList.length === 1) {
        if (deliveryTypeList[0] === "campus") {
          deliveryPrefix = "Qanchi Campus";
          sheetName = "Qanchi Campus";
        } else if (deliveryTypeList[0] === "lahore") {
          deliveryPrefix = "Lahore";
          sheetName = "Lahore";
        } else if (deliveryTypeList[0] === "other") {
          deliveryPrefix = "Other City";
          sheetName = "Other City";
        }
      } else if (deliveryTypeList.length > 1) {
        deliveryPrefix = deliveryTypeList
          .map((t) => (t === "campus" ? "Qanchi Campus" : t === "lahore" ? "Lahore" : "Other City"))
          .join(" & ");
        sheetName = deliveryPrefix;
      }

      let statusPart = "";
      if (statusList.length === 1) {
        statusPart = ` - ${statuses[statusList[0]] || statusList[0]}`;
      } else if (statusList.length > 1) {
        statusPart = ` - ${statusList.map((s) => statuses[s] || s).join(", ")}`;
      }
      const filename = `${deliveryPrefix}${statusPart} - ${currentDate}.xlsx`;
      const includeAddress = deliveryTypeList.length === 0 || deliveryTypeList.includes("other");
      const includeMobile = includeAddress;

      const includeBookSummary =
        (deliveryTypeList.length > 0 &&
          deliveryTypeList.every((t) => t === "campus" || t === "lahore")) ||
        (deliveryTypeList.length === 0 &&
          rows.length > 0 &&
          rows.every((r: any) => isCampusOrder(r) || isLahoreOrder(r)));

      try {
        const { exportOrdersExcel } = await import("@/lib/orders-excel-browser");
        await exportOrdersExcel(rows, filename, {
          includeAddress,
          sheetName,
          includeBookSummary,
        });
        toast.success(
          `Exported ${rows.length} order(s)${includeAddress ? " with address & phone" : ""}${includeBookSummary ? " with Books Summary" : ""} to ${filename}.`,
        );
      } catch (excelErr) {
        // Fallback to structured CSV with book items
        let grandTotalBooks = 0;

        const csvRows: unknown[][] = [
          [
            "Sr No",
            "Order Number",
            "Student Name",
            ...(includeMobile ? ["Mobile Number"] : []),
            ...(includeAddress ? ["Address"] : []),
            "Book Code",
            "Book Name",
            "Quantity",
            "Total Books",
          ],
        ];

        rows.forEach((o: any, orderIdx: number) => {
          const items =
            o.items && o.items.length > 0
              ? o.items
              : [{ code: "—", title: "Order Record", quantity: 1 }];
          const orderTotalBooks = items.reduce(
            (sum: number, it: any) => sum + (Number(it.quantity) || 1),
            0,
          );
          grandTotalBooks += orderTotalBooks;

          const fullAddress = o.address
            ? o.city && !o.address.toLowerCase().includes(o.city.toLowerCase())
              ? `${o.address}, ${o.city}`
              : o.address
            : (o.city || "—");

          items.forEach((item: any, idx: number) => {
            csvRows.push([
              idx === 0 ? orderIdx + 1 : "",
              idx === 0 ? o.reference || "—" : "",
              idx === 0 ? o.name || "Student" : "",
              ...(includeMobile ? [idx === 0 ? o.phone || "—" : ""] : []),
              ...(includeAddress ? [idx === 0 ? fullAddress : ""] : []),
              item.code || "—",
              item.title || "—",
              Number(item.quantity) || 1,
              idx === 0 ? orderTotalBooks : "",
            ]);
          });
        });

        const prefixCount = (includeMobile ? 1 : 0) + (includeAddress ? 1 : 0) + 5;
        csvRows.push([
          ...Array(prefixCount).fill(""),
          `(Total Books: ${grandTotalBooks})`,
          "",
        ]);

        download(filename.replace(/\.xlsx$/, ".csv"), csv(csvRows));
        toast.success(`Exported ${rows.length} order(s).`);
      }
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setExporting(false);
    }
  };

  const statusParam = statusList.join(",");
  const deliveryTypeParam = deliveryTypeList.join(",");
  const printedParam = printedFilter;
  const path = `manage/orders?q=${encodeURIComponent(q)}&status=${encodeURIComponent(statusParam)}&delivery_type=${encodeURIComponent(deliveryTypeParam)}&printed=${encodeURIComponent(printedParam)}&page=${page}&limit=${pageSize}&from=${dates.from}&to=${dates.to}&campus=${encodeURIComponent(campus)}`;
  const { data, error, loading, reload } = useData(path);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("orders-updated", handler);
    return () => window.removeEventListener("orders-updated", handler);
  }, [reload]);

  const activeFlowStep =
    statusList.length === 1 && STATUS_ADVANCE_FLOW[statusList[0]]
      ? STATUS_ADVANCE_FLOW[statusList[0]]
      : null;
  const filteredCount = data?.total ?? data?.rows?.length ?? 0;

  const handleBatchStatusChange = async () => {
    if (!activeFlowStep) return;
    if (["SHIPPED", "DELIVERED"].includes(activeFlowStep.to)) {
      const invalidOrder = (data?.rows || []).find(
        (ord: any) =>
          isOtherCityOrder(ord) &&
          (!ord.courier_tracking_id || !ord.courier_tracking_id.trim()),
      );
      if (invalidOrder) {
        toast.error("Please Add Tracking Details");
        setBatchConfirm(null);
        return;
      }
    }
    setBatchUpdating(true);
    try {
      const res = await api("manage/orders/batch-status", {
        fromStatus: statusList[0],
        toStatus: activeFlowStep.to,
        q,
        deliveryType: deliveryTypeList.join(","),
        from: dates.from,
        to: dates.to,
        campusId: campus,
      });
      const updatedCount = res.count ?? filteredCount;
      toast.success(
        `Successfully updated ${updatedCount} order(s) from "${activeFlowStep.fromLabel}" to "${activeFlowStep.toLabel}".`,
      );
      setBatchConfirm(null);
      setStatusList([activeFlowStep.to]);
      setPage(1);
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBatchUpdating(false);
    }
  };

  const isTabActive = (tab: (typeof ORDER_WORKFLOW_TABS)[number]) => {
    return activeTab === tab.id;
  };

  const getTabCount = (tab: (typeof ORDER_WORKFLOW_TABS)[number]) => {
    if (!data?.status_counts) return undefined;
    if (tab.id === "PRINTED") {
      return data.status_counts.PRINTED || 0;
    }
    if (tab.id === "PROCESSING") {
      return data.status_counts.PROCESSING || 0;
    }
    if (tab.id === "ALL") {
      return data.status_counts.ALL ?? data.total ?? 0;
    }
    return data.status_counts[tab.statuses[0]] || 0;
  };

  const totalOrders = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));
  const startItem = totalOrders === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalOrders);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const isPendingView =
    payments || (statusList.length === 1 && statusList[0] === "PAYMENT_PENDING");

  const currentRows = data?.rows || [];

  const verifiedOrdersInView = currentRows.filter(
    (o: any) => o.payment_status === "VERIFIED",
  );
  const verifiedUnassignedOrders = verifiedOrdersInView.filter(
    (o: any) => !o.vendor_name,
  );

  const handleOpenBulkAssignVendor = () => {
    const targetOrders =
      verifiedUnassignedOrders.length > 0
        ? verifiedUnassignedOrders
        : verifiedOrdersInView;
    if (targetOrders.length === 0) {
      toast.info(
        "No verified orders found to send to vendor. Only orders with verified payment can be sent.",
      );
      return;
    }
    setBulkAssigningOrders(targetOrders);
  };

  const headers = isVendor
    ? [
        "Order",
        "Student",
        "Books",
        "Date",
        "Status",
        "Logistics & Action",
        "View",
      ]
    : isPendingView
      ? [
          "Order",
          "Student",
          "Books",
          "Date",
          "Total",
          "Payment",
          "Review",
          ...(isAdmin ? ["Actions"] : []),
        ]
      : [
          "Order",
          "Student",
          "Books",
          "Date",
          "Total",
          "Order status",
          "Payment",
          "Details",
          ...(isAdmin ? ["Actions"] : []),
        ];

  return (
    <>
      {isVendor && (data?.status_counts?.["PROCESSING"] || 0) > 0 && (
        <div
          className="notice dashboard-notice vendor-printing-notice"
          style={{
            marginBottom: 16,
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            className="notice-icon"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.2)",
              color: "#d97706",
              flexShrink: 0,
            }}
          >
            <Bell size={18} />
          </span>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.95rem", color: "var(--foreground)" }}>
              {data.status_counts["PROCESSING"]}{" "}
              {data.status_counts["PROCESSING"] === 1 ? "Order" : "Orders"} currently in your Printing Queue!
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
              Print the books for these orders. Mark them as "Printed" when ready, then dispatch Other City orders via courier or send Lahore/Campus batches to the Bookstore Office.
            </p>
          </div>
        </div>
      )}

      <div className="orders-workflow-tabs-container" role="tablist" aria-label="Order Workflow Stages">
        {(isVendor ? VENDOR_WORKFLOW_TABS : ORDER_WORKFLOW_TABS).map((tab) => {
          const active = isTabActive(tab);
          const count = getTabCount(tab);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={tab.title || tab.label}
              className={`orders-workflow-tab tab-${tab.color} ${active ? "active" : ""}`}
              onClick={() => {
                setPage(1);
                setActiveTab(tab.id);
                if (tab.id === "PROCESSING") {
                  setStatusList(["PROCESSING"]);
                  setPrintedFilter("0");
                } else if (tab.id === "PRINTED") {
                  setStatusList(["PROCESSING"]);
                  setPrintedFilter("1");
                } else if (tab.id === "ALL") {
                  setStatusList([]);
                  setPrintedFilter("");
                } else {
                  setStatusList([...tab.statuses]);
                  setPrintedFilter("");
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`orders-tab-badge ${
                    tab.urgent && !active && count > 0 ? "urgent" : ""
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="orders-delivery-chips-bar" aria-label="Delivery channel filters">
        {isVendor
          ? VENDOR_DELIVERY_CHIPS.map((chip) => {
              const isChipActive =
                chip.id === "all"
                  ? deliveryTypeList.length === 0
                  : chip.id === "other"
                    ? deliveryTypeList.includes("other")
                    : deliveryTypeList.includes("campus") || deliveryTypeList.includes("lahore");
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`orders-delivery-chip ${isChipActive ? "active" : ""}`}
                  onClick={() => {
                    setPage(1);
                    if (chip.id === "all") {
                      setDeliveryTypeList([]);
                    } else if (chip.id === "other") {
                      setDeliveryTypeList(deliveryTypeList.includes("other") ? [] : ["other"]);
                    } else if (chip.id === "campus_lahore") {
                      const isCombined =
                        deliveryTypeList.includes("campus") && deliveryTypeList.includes("lahore");
                      setDeliveryTypeList(isCombined ? [] : ["campus", "lahore"]);
                    }
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })
          : ORDER_DELIVERY_CHIPS.map((chip) => {
              const isChipActive =
                chip.id === "all"
                  ? deliveryTypeList.length === 0
                  : deliveryTypeList.includes(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={`orders-delivery-chip ${isChipActive ? "active" : ""}`}
                  onClick={() => {
                    setPage(1);
                    if (chip.id === "all") {
                      setDeliveryTypeList([]);
                      return;
                    }
                    if (chip.id === "other") {
                      // Other City is exclusive: toggling off goes to all, toggling on deselects campus and lahore
                      setDeliveryTypeList(deliveryTypeList.includes("other") ? [] : ["other"]);
                      return;
                    }
                    // For "campus" or "lahore": remove "other" first, then toggle this chip while preserving the other local chip
                    const withoutOther = deliveryTypeList.filter((id) => id !== "other");
                    if (withoutOther.includes(chip.id)) {
                      setDeliveryTypeList(withoutOther.filter((id) => id !== chip.id));
                    } else {
                      setDeliveryTypeList([...withoutOther, chip.id]);
                    }
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
      </div>

      <div className="toolbar orders-toolbar">
        <div className="toolbar-search-box">
          <Search size={15} className="toolbar-search-icon" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search orders"
            placeholder="Order ID, student or WhatsApp…"
            className="toolbar-search-input"
          />
          {q && (
            <button
              type="button"
              className="toolbar-search-clear"
              onClick={() => {
                setQ("");
                setPage(1);
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <DateRangePicker
          from={dates.from}
          to={dates.to}
          onChange={(nextDates) => {
            setDates(nextDates);
            setPage(1);
          }}
        />
        <div className="toolbar-actions-divider" />
        <button
          type="button"
          className="btn compact toolbar-export-btn"
          onClick={exportOrders}
          disabled={exporting || loading}
          title="Export orders to Excel"
        >
          <span className="toolbar-btn-icon-circle">
            <Download size={13} strokeWidth={2.4} className="toolbar-export-icon" />
          </span>
          <span>{exporting ? "Exporting…" : "Export Orders"}</span>
        </button>
        {isAdmin && !isVendor && activeTab === "CONFIRMED" && (() => {
          const sendToVendorCount =
            verifiedUnassignedOrders.length > 0
              ? verifiedUnassignedOrders.length
              : verifiedOrdersInView.length;
          const isEnabled = sendToVendorCount > 0 && !loading;

          return (
            <button
              type="button"
              className={`btn compact toolbar-batch-btn ${isEnabled ? "active" : ""}`}
              onClick={handleOpenBulkAssignVendor}
              disabled={!isEnabled}
              title={
                sendToVendorCount > 0
                  ? `Bulk send ${sendToVendorCount} verified order(s) in current view to a printing vendor`
                  : "No confirmed verified orders available to send to vendor"
              }
            >
              <span className="toolbar-btn-icon-circle">
                <Send size={13} strokeWidth={2.4} className="toolbar-batch-icon" />
              </span>
              <span>
                Send to Vendor {sendToVendorCount > 0 ? `(${sendToVendorCount})` : ""}
              </span>
            </button>
          );
        })()}
        {isVendor && activeTab === "PROCESSING" && (() => {
          const unprintedOrders = currentRows.filter((r: any) => !r.vendor_printed_at);
          const unprintedCount = unprintedOrders.length;
          const isEnabled = unprintedCount > 0 && !batchPrinting && !loading;

          return (
            <button
              type="button"
              className={`btn compact toolbar-batch-btn ${isEnabled ? "active" : ""}`}
              disabled={!isEnabled}
              onClick={() => {
                if (!unprintedOrders.length) {
                  toast.info("All visible orders are already marked as printed.");
                  return;
                }
                handleBatchVendorPrint(unprintedOrders.map((r: any) => r.id), true);
              }}
              title={
                unprintedCount > 0
                  ? "Mark all orders in current queue as printed"
                  : "No unprinted orders in current queue"
              }
            >
              <span className="toolbar-btn-icon-circle">
                <CheckCircle2 size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
              </span>
              <span>
                {batchPrinting
                  ? "Updating…"
                  : `Mark All in Queue as Printed (${unprintedCount})`}
              </span>
            </button>
          );
        })()}
        {isVendor && activeTab === "PRINTED" && (
          <>
            {(() => {
              const isCampusLahoreSelected =
                deliveryTypeList.includes("campus") || deliveryTypeList.includes("lahore");
              if (!isCampusLahoreSelected) return null;

              const dispatchableIds = currentRows
                .filter((r: any) => (isCampusOrder(r) || isLahoreOrder(r)) && !r.vendor_dispatched_at)
                .map((r: any) => r.id);
              const isEnabled = dispatchableIds.length > 0 && !batchDispatching && !loading;

              return (
                <button
                  type="button"
                  className={`btn compact toolbar-batch-btn ${isEnabled ? "active" : ""}`}
                  disabled={!isEnabled}
                  onClick={() => handleBatchVendorDispatchOffice(dispatchableIds)}
                  title={
                    dispatchableIds.length > 0
                      ? "Dispatch all printed orders to Qanchi Campus"
                      : "No printed orders pending dispatch to Qanchi Campus"
                  }
                >
                  <span className="toolbar-btn-icon-circle">
                    <Building2 size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
                  </span>
                  <span>
                    {batchDispatching
                      ? "Dispatching…"
                      : `Send All to Qanchi Campus (${dispatchableIds.length})`}
                  </span>
                </button>
              );
            })()}
            {(() => {
              const printedOrders = currentRows.filter((r: any) => r.vendor_printed_at);
              const printedCount = printedOrders.length;
              const isEnabled = printedCount > 0 && !batchPrinting && !loading;

              return (
                <button
                  type="button"
                  className={`btn compact toolbar-batch-btn ${isEnabled ? "active" : ""}`}
                  disabled={!isEnabled}
                  onClick={() => handleBatchVendorPrint(printedOrders.map((r: any) => r.id), false)}
                  title={
                    printedCount > 0
                      ? "Unmark all printed orders (send back to Printing Queue)"
                      : "No printed orders to unmark"
                  }
                >
                  <span className="toolbar-btn-icon-circle">
                    <RotateCcw size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
                  </span>
                  <span>
                    {batchPrinting ? "Updating…" : `Unmark All Printed (${printedCount})`}
                  </span>
                </button>
              );
            })()}
          </>
        )}
        {!["PROCESSING", "PRINTED"].includes(activeTab) && !isVendor && canUpdate && (
          <button
            type="button"
            className={`btn compact toolbar-batch-btn ${activeFlowStep && filteredCount > 0 ? "active" : ""}`}
            onClick={() => {
              if (activeFlowStep && filteredCount > 0) {
                if (["SHIPPED", "DELIVERED"].includes(activeFlowStep.to)) {
                  const invalidOrder = (data?.rows || []).find(
                    (ord: any) =>
                      isOtherCityOrder(ord) &&
                      (!ord.courier_tracking_id || !ord.courier_tracking_id.trim()),
                  );
                  if (invalidOrder) {
                    toast.error("Please Add Tracking Details");
                    return;
                  }
                }
                setBatchConfirm({
                  fromStatus: statusList[0],
                  toStatus: activeFlowStep.to,
                  count: filteredCount,
                  fromLabel: activeFlowStep.fromLabel,
                  toLabel: activeFlowStep.toLabel,
                });
              }
            }}
            disabled={
              !activeFlowStep || filteredCount === 0 || batchUpdating || loading
            }
            title={
              statusList.length === 0
                ? "Select a status filter to enable status change"
                : statusList.length > 1
                  ? "Select a single status filter to change status"
                  : !activeFlowStep
                    ? `No next status available for ${statuses[statusList[0]] || statusList[0]}`
                    : filteredCount === 0
                      ? "No orders found matching current filter"
                      : `Change all ${filteredCount} order(s) from ${activeFlowStep.fromLabel} to ${activeFlowStep.toLabel}`
            }
          >
            <span className="toolbar-btn-icon-circle">
              <ArrowRightCircle size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
            </span>
            <span>
              {batchUpdating
                ? "Updating…"
                : activeFlowStep
                  ? `Move All to ${activeFlowStep.toLabel} (${filteredCount})`
                  : "Change All Status"}
            </span>
          </button>
        )}
      </div>
      <Result loading={loading} error={error}>
        <DataTable
          headers={headers}
          rows={(data?.rows || []).map((o: any) => {
            const mapUrl = getMapLocation(o);
            const isCampus =
              o.delivery_type === "campus" ||
              (o.city && o.city.toLowerCase().includes("campus")) ||
              (o.address && o.address.toLowerCase().includes("campus"));
            const isOther =
              o.delivery_type === "other" ||
              (!isCampus && o.city && !o.city.toLowerCase().includes("lahore"));

            const badgeClass = isCampus
              ? "campus-badge"
              : isOther
                ? "other-badge"
                : "lahore-badge";

            const BadgeIcon = isCampus
              ? Building2
              : isOther
                ? Truck
                : Bike;

            const badgeLabel = isCampus
              ? "Qanchi Campus"
              : isOther
                ? (o.city ? `${o.city} · Other City` : "Other City")
                : "Lahore Route";

            const badgeTitle = isCampus
              ? "Open Qanchi campus pickup location on Google Maps"
              : isOther
                ? `Open ${o.city || "delivery city"} destination on Google Maps`
                : "Open Bykea / live rider route navigation to student location";

            const badgeContent = isCampus ? (
              <span className="campus-static-pill">
                <BadgeIcon size={11} /> {badgeLabel}
              </span>
            ) : isOther ? (
              <span className="other-static-pill">
                <BadgeIcon size={11} /> {badgeLabel}
              </span>
            ) : mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className={`map-pin-pill ${badgeClass}`}
                onClick={(e) => e.stopPropagation()}
                title={badgeTitle}
              >
                <BadgeIcon size={12} /> {badgeLabel}
              </a>
            ) : null;

            const vendorBadgeContent = isAdmin && (
              o.vendor_name ? (
                <span
                  className="vendor-badge-pill"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 9999,
                    background: "rgba(139, 92, 246, 0.12)",
                    color: "#7c3aed",
                    border: "1px solid #c4b5fd",
                    width: "fit-content",
                  }}
                  title={`Assigned to ${o.vendor_name}${o.vendor_phone ? ` (${o.vendor_phone})` : ""}`}
                >
                  <Factory size={11} /> {o.vendor_name}
                </span>
              ) : ["CONFIRMED", "PROCESSING"].includes(o.status) ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAssigningOrder(o);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: "rgba(59, 130, 246, 0.1)",
                    color: "#2563eb",
                    border: "1px solid #93c5fd",
                    cursor: "pointer",
                  }}
                  title="Send this order to a printing vendor"
                >
                  <Send size={10} /> Send to Vendor
                </button>
              ) : null
            );

            const refCell = (
              <div>
                <strong>{o.reference}</strong>
                {(badgeContent || vendorBadgeContent) && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                      alignItems: "center",
                      marginTop: 3,
                    }}
                  >
                    {badgeContent}
                    {vendorBadgeContent}
                  </div>
                )}
                {isOther && !isVendor && (
                  <div style={{ marginTop: 4 }}>
                    {o.courier_name && o.courier_tracking_id ? (
                      <button
                        type="button"
                        className="courier-tracking-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCourierOrder(o);
                        }}
                        title={`Shipped via ${o.courier_name} (${o.courier_tracking_id}). Click to edit tracking details.`}
                      >
                        <Package size={11} /> {o.courier_name}: {o.courier_tracking_id}
                      </button>
                    ) : o.payment_status === "VERIFIED" && o.status !== "PAYMENT_PENDING" ? (
                      <button
                        type="button"
                        className="courier-add-tracking-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCourierOrder(o);
                        }}
                        title="Add courier tracking number (Leopards, TCS, Trax, etc.) for this Other City order"
                      >
                        <Truck size={11} /> Add Tracking
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
            const booksCount = Number(
              o.total_books ??
                (o.items?.reduce(
                  (s: number, it: any) => s + (it.quantity || 1),
                  0,
                ) || 0),
            );
            const booksSummary = (o.items || [])
              .map(
                (it: any) =>
                  `${it.code || it.title || "Book"}${it.quantity > 1 ? ` (×${it.quantity})` : ""}`,
              )
              .join(", ");
            const booksTooltip =
              (o.items || []).length > 0
                ? (o.items || [])
                    .map(
                      (it: any) =>
                        `• ${it.code ? `[${it.code}] ` : ""}${it.title || "Book"}${it.quantity > 1 ? ` × ${it.quantity}` : ""}`,
                    )
                    .join("\n")
                : `${booksCount} book(s) ordered`;

            const booksCell = (
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: 2,
                  cursor: (o.items || []).length > 0 ? "help" : "default",
                }}
                title={booksTooltip}
              >
                <div style={{ whiteSpace: "nowrap" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{booksCount}</strong>{" "}
                  <span className="small-text muted" style={{ fontSize: "0.78rem" }}>
                    {booksCount === 1 ? "book" : "books"}
                  </span>
                </div>
                {booksSummary && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted-foreground)",
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                    title={booksTooltip}
                  >
                    {booksSummary}
                  </span>
                )}
              </div>
            );

            if (isVendor) {
              const vendorBooksCell = (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      gap: 2,
                      cursor: (o.items || []).length > 0 ? "help" : "default",
                    }}
                    title={booksTooltip}
                  >
                    <div style={{ whiteSpace: "nowrap" }}>
                      <strong style={{ fontSize: "0.88rem" }}>{booksCount}</strong>{" "}
                      <span className="small-text muted" style={{ fontSize: "0.78rem" }}>
                        {booksCount === 1 ? "book" : "books"}
                      </span>
                    </div>
                    {booksSummary && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--muted-foreground)",
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                        title={booksTooltip}
                      >
                        {booksSummary}
                      </span>
                    )}
                  </div>
                  {o.status === "PROCESSING" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVendorPrint(o, !o.vendor_printed_at);
                        }}
                        disabled={printingBusyId === o.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          cursor: "pointer",
                          background: o.vendor_printed_at ? "rgba(22, 163, 74, 0.15)" : "var(--muted)",
                          color: o.vendor_printed_at ? "#15803d" : "var(--muted-foreground)",
                          border: o.vendor_printed_at ? "1px solid #86efac" : "1px solid var(--border)",
                          transition: "all 0.15s ease",
                          width: "fit-content",
                        }}
                        title={o.vendor_printed_at ? "Click to unmark as printed" : "Click to mark as printed"}
                      >
                        {o.vendor_printed_at ? <RotateCcw size={11} /> : <CheckCircle2 size={11} color="currentColor" />}
                        {printingBusyId === o.id ? "Saving…" : o.vendor_printed_at ? "Unmark Printed" : "Mark as Printed"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrintingQueue(o, false);
                        }}
                        disabled={queueBusyId === o.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: "0.70rem",
                          fontWeight: 500,
                          padding: "1px 5px",
                          borderRadius: 4,
                          cursor: "pointer",
                          background: "none",
                          color: "var(--muted-foreground)",
                          border: "1px dashed var(--border)",
                          width: "fit-content",
                        }}
                        title="Remove from Printing Queue (reverts to Confirmed)"
                      >
                        <XCircle size={10} />
                        {queueBusyId === o.id ? "Reverting…" : "Remove from Queue"}
                      </button>
                    </div>
                  )}
                </div>
              );

              return [
                refCell,
                <div>
                  <strong>{o.name}</strong>
                  {isOther && o.phone && (
                    <p style={{ margin: "2px 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                      {o.phone}
                    </p>
                  )}
                </div>,
                vendorBooksCell,
                formatDateDMY(o.created_at),
                <Status value={o.status} />,
                isOther ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {o.courier_name && o.courier_tracking_id ? (
                      <button
                        type="button"
                        className="courier-tracking-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCourierOrder(o);
                        }}
                        title={`Shipped via ${o.courier_name} (${o.courier_tracking_id}). Click to edit.`}
                      >
                        <Package size={11} /> {o.courier_name}: {o.courier_tracking_id}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="courier-add-tracking-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCourierOrder(o);
                        }}
                        title="Add external courier tracking to dispatch parcel"
                      >
                        <Truck size={11} /> Ship via Courier
                      </button>
                    )}
                    {o.status === "SHIPPED" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkDelivered(o);
                        }}
                        disabled={markingDeliveredId === o.id}
                        className="btn compact"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          background: "#059669",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          width: "fit-content",
                        }}
                        title="Mark this parcel as Delivered to student"
                      >
                        <CheckCircle2 size={11} />
                        {markingDeliveredId === o.id ? "Saving…" : "Mark Delivered"}
                      </button>
                    )}
                    {o.status === "DELIVERED" && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#059669",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle2 size={11} /> Delivered ✓
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    {o.status === "PROCESSING" ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDispatchOfficeOrder(o);
                        }}
                        className="btn compact"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 9999,
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                        }}
                        title="Mark printed order as dispatched to Bookstore Office"
                      >
                        <Building2 size={12} /> Send to Office
                      </button>
                    ) : o.vendor_dispatched_at || ["SHIPPED", "DELIVERED"].includes(o.status) ? (
                      <span
                        className="map-pin-pill campus-badge"
                        style={{
                          fontSize: "0.75rem",
                          padding: "3px 8px",
                          background: "rgba(37, 99, 235, 0.12)",
                          color: "#1d4ed8",
                          borderColor: "#93c5fd",
                        }}
                        title="Batch dispatched to Bookstore Office"
                      >
                        <Building2 size={12} /> Sent to Office ✓
                      </span>
                    ) : (
                      <span
                        className="map-pin-pill campus-badge"
                        style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                        title="Deliver this batch to Bookstore Administration Office"
                      >
                        <Building2 size={12} /> Deliver to Office
                      </span>
                    )}
                  </div>
                ),
                <TableActionButton
                  onClick={() => setActiveOrderId(o.id)}
                  title={`View details for order ${o.reference || o.id}`}
                  icon={<Eye size={13} strokeWidth={2.4} />}
                  variant="order"
                >
                  View order
                </TableActionButton>,
              ];
            }

            const statusCell = (
              <div>
                <Status value={o.status} />
                {o.status === "PROCESSING" && (
                  <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {o.vendor_printed_at ? (
                      <span
                        className="mono-pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          background: "rgba(22, 163, 74, 0.15)",
                          color: "#15803d",
                          border: "1px solid #86efac",
                          width: "fit-content",
                        }}
                        title={`Printed by vendor on ${formatDateDMY(o.vendor_printed_at)}`}
                      >
                        <CheckCircle2 size={11} /> Printed
                      </span>
                    ) : (
                      <span
                        className="mono-pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          width: "fit-content",
                        }}
                        title="In vendor printing queue"
                      >
                        <Clock size={11} /> In Printing Queue
                      </span>
                    )}
                    {o.vendor_dispatched_at && (
                      <span
                        className="mono-pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.70rem",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: 9999,
                          background: "rgba(37, 99, 235, 0.12)",
                          color: "#1d4ed8",
                          border: "1px solid #93c5fd",
                          width: "fit-content",
                        }}
                        title={`Vendor dispatched this order to the Bookstore Office on ${formatDateDMY(o.vendor_dispatched_at)}`}
                      >
                        <Building2 size={10} /> Dispatched to Office
                      </span>
                    )}
                  </div>
                )}
              </div>
            );

            return isPendingView
              ? [
                  refCell,
                  <div>
                    {o.name}
                    <p style={{ margin: "2px 0" }}>
                      {o.phone ? (
                        <a
                          href={getWhatsAppUrl(o)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="whatsapp-phone-link"
                          title="Open WhatsApp chat with auto-generated order message"
                        >
                          {o.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>,
                  booksCell,
                  formatDateDMY(o.created_at),
                  money(o.total),
                  <Status value={o.payment_status} />,
                  <TableActionButton
                    onClick={() => setActiveOrderId(o.id)}
                    title={`Review payment for order ${o.reference || o.id}`}
                    icon={<Eye size={13} strokeWidth={2.4} />}
                    variant="payment"
                  >
                    Review payment
                  </TableActionButton>,
                  ...(isAdmin
                    ? [
                        <button
                          type="button"
                          className="btn compact danger-button icon-only order-delete-btn"
                          title="Delete order"
                          onClick={() => setDeletingOrder(o)}
                        >
                          <Trash2 size={15} />
                        </button>,
                      ]
                    : []),
                ]
              : [
                  refCell,
                  <div>
                    {o.name}
                    <p style={{ margin: "2px 0" }}>
                      {o.phone ? (
                        <a
                          href={getWhatsAppUrl(o)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="whatsapp-phone-link"
                          title="Open WhatsApp chat with auto-generated order message"
                        >
                          {o.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>,
                  booksCell,
                  formatDateDMY(o.created_at),
                  money(o.total),
                  statusCell,
                  <Status value={o.payment_status} />,
                  <TableActionButton
                    onClick={() => setActiveOrderId(o.id)}
                    title={`View details for order ${o.reference || o.id}`}
                    icon={<Eye size={13} strokeWidth={2.4} />}
                    variant="order"
                  >
                    View order
                  </TableActionButton>,
                  ...(isAdmin
                    ? [
                        <button
                          type="button"
                          className="btn compact danger-button icon-only order-delete-btn"
                          title="Delete order"
                          onClick={() => setDeletingOrder(o)}
                        >
                          <Trash2 size={15} />
                        </button>,
                      ]
                    : []),
                ];
          })}
        />
        {data && (
          <div className="orders-pagination-bar">
            <div className="orders-pagination-info">
              Showing <strong>{startItem}–{endItem}</strong> of <strong>{totalOrders}</strong> orders
              {data.total_books !== undefined && (
                <span> · <strong>{data.total_books}</strong> books</span>
              )}
            </div>

            <div className="orders-pagination-controls">
              <button
                type="button"
                className="btn compact"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Previous
              </button>
              <div className="orders-page-numbers">
                {getPageNumbers().map((p, idx) =>
                  typeof p === "number" ? (
                    <button
                      key={idx}
                      type="button"
                      className={`btn compact page-number-btn ${p === page ? "active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="pagination-ellipsis">
                      …
                    </span>
                  ),
                )}
              </div>
              <button
                type="button"
                className="btn compact"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ›
              </button>
            </div>

            <div className="orders-page-size-selector">
              <span>Rows per page:</span>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </Result>

      {activeOrderId && user && (
        <OrderModalPopup
          id={activeOrderId}
          user={user}
          onClose={() => setActiveOrderId(null)}
          onDeleted={reload}
        />
      )}

      <Confirm
        open={!!deletingOrder}
        onClose={() => setDeletingOrder(null)}
        title={"Delete order " + deletingOrder?.reference + "?"}
        description="This will permanently delete the order, items, and history. Are you sure?"
        onConfirm={async () => {
          try {
            await api("manage/orders/" + deletingOrder.id, {}, "DELETE");
            toast.success("Order deleted successfully.");
            setDeletingOrder(null);
            await reload();
          } catch (e) {
            toast.error(errorText(e));
          }
        }}
      />

      <Confirm
        open={!!batchConfirm}
        onClose={() => setBatchConfirm(null)}
        title={`Change status of ${batchConfirm?.count} order(s)?`}
        description={`Are you sure you want to change all ${batchConfirm?.count} matching order(s) from "${batchConfirm?.fromLabel}" to "${batchConfirm?.toLabel}"? This will update their tracking status.`}
        onConfirm={handleBatchStatusChange}
      />

      {editingCourierOrder && (
        <CourierTrackingModal
          order={editingCourierOrder}
          onClose={() => setEditingCourierOrder(null)}
          onSaved={reload}
        />
      )}

      {assigningOrder && (
        <AssignVendorModal
          order={assigningOrder}
          onClose={() => setAssigningOrder(null)}
          onAssigned={reload}
        />
      )}

      {bulkAssigningOrders && (
        <BulkAssignVendorModal
          orders={bulkAssigningOrders}
          onClose={() => setBulkAssigningOrders(null)}
          onAssigned={reload}
        />
      )}

      <Confirm
        open={!!dispatchOfficeOrder}
        onClose={() => setDispatchOfficeOrder(null)}
        title={`Dispatch Order ${dispatchOfficeOrder?.reference || ""} to Bookstore Office?`}
        description="Mark this Lahore / VU Qanchi Campus order as printed and handed over / dispatched to the Bookstore Office. The admin will be notified and can track receipt."
        onConfirm={handleDispatchOffice}
      />
    </>
  );
}
function OrderDetail({ id, user }: { id: string; user: User }) {
  const { data: o, error, loading, reload } = useData("manage/orders/" + id),
    [note, setNote] = useState(""),
    [next, setNext] = useState(""),
    [decision, setDecision] = useState<any>(null),
    [courierModalOpen, setCourierModalOpen] = useState(false),
    [assignVendorOpen, setAssignVendorOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const admin = user.role === "SUPER_ADMIN",
    isVendor = user.role === "VENDOR",
    canUpdate = admin || isVendor || user.permissions.includes("orders.update");
  const act = async (action: string, status?: string) => {
    try {
      await api("manage/orders/" + id, {
        action,
        status,
        note,
        version: o.version,
      });
      setNote("");
      setNext("");
      toast.success("Order updated.");
      window.dispatchEvent(new Event("orders-updated"));
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  return (
    <Result loading={loading} error={error}>
      {o && (
        <>
          {(() => {
            const isCampus =
              o.delivery_type === "campus" ||
              (o.city && o.city.toLowerCase().includes("campus")) ||
              (o.address && o.address.toLowerCase().includes("campus"));
            const isOther =
              o.delivery_type === "other" ||
              (!isCampus && o.city && !o.city.toLowerCase().includes("lahore"));
            if (!isOther) return null;

            const isPaymentVerified =
              o.payment_status === "VERIFIED" && o.status !== "PAYMENT_PENDING";

            return (
              <div
                className="courier-modal-banner no-print"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    className="courier-badge"
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isPaymentVerified || o.courier_tracking_id ? undefined : "#f59e0b",
                    }}
                  >
                    {isPaymentVerified || o.courier_tracking_id ? <Truck size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <strong style={{ fontSize: "0.95rem", display: "block" }}>
                      {o.courier_tracking_id
                        ? "External Courier Tracking Attached"
                        : isPaymentVerified
                          ? "External Courier Tracking (Other City)"
                          : "External Courier Tracking (Pending Payment Verification)"}
                    </strong>
                    <p className="small-text" style={{ margin: "2px 0 0" }}>
                      {o.courier_name && o.courier_tracking_id ? (
                        <>
                          Shipped via <strong>{o.courier_name}</strong> · Tracking ID:{" "}
                          <code className="courier-tracking-code">
                            {o.courier_tracking_id}
                          </code>
                        </>
                      ) : isPaymentVerified ? (
                        "Add courier tracking details (e.g. Leopards, TCS, Trax) for student tracking."
                      ) : (
                        "Payment verification is pending. Please approve payment first to add courier tracking details."
                      )}
                    </p>
                  </div>
                </div>
                {(canUpdate || isVendor) && (
                  <button
                    type="button"
                    className={isPaymentVerified || o.courier_tracking_id ? "btn primary compact" : "btn compact"}
                    onClick={() => {
                      if (!isPaymentVerified && !o.courier_tracking_id) {
                        toast.error("Payment verification is pending. Please approve payment before adding courier tracking.");
                        return;
                      }
                      setCourierModalOpen(true);
                    }}
                    disabled={!isPaymentVerified && !o.courier_tracking_id}
                    title={
                      !isPaymentVerified && !o.courier_tracking_id
                        ? "Approve payment before adding courier tracking"
                        : undefined
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      opacity: !isPaymentVerified && !o.courier_tracking_id ? 0.6 : 1,
                      cursor: !isPaymentVerified && !o.courier_tracking_id ? "not-allowed" : "pointer",
                    }}
                  >
                    <Truck size={14} />
                    {o.courier_tracking_id
                      ? "Edit Tracking"
                      : isPaymentVerified
                        ? "Add Courier Details"
                        : "Payment Pending"}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Vendor Assignment Banner / Action (Super Admin / Staff only - vendors do not see this) */}
          {o && (() => {
            if (!isVendor && o.vendor_name) {
              return (
                <div
                  className="vendor-assigned-banner no-print"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    background: "color-mix(in srgb, var(--primary) 8%, var(--card))",
                    border: "1px solid color-mix(in srgb, var(--primary) 25%, var(--border))",
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: "var(--primary)",
                        color: "var(--primary-foreground)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Factory size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>
                        Assigned to Vendor: {o.vendor_name}
                      </strong>
                      <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                        {o.vendor_phone ? `WhatsApp: ${o.vendor_phone}` : ""}
                        {o.vendor_notes ? ` · Instructions: "${o.vendor_notes}"` : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {o.vendor_phone && (
                      <a
                        href={getVendorWhatsAppUrl(o, { name: o.vendor_name, phone: o.vendor_phone })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn compact"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#25D366",
                          borderColor: "#25D366",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                        }}
                        title="Open WhatsApp chat with vendor"
                      >
                        <MessageCircle size={14} /> WhatsApp Vendor
                      </a>
                    )}
                    {admin && (
                      <button
                        type="button"
                        className="btn compact"
                        onClick={() => setAssignVendorOpen(true)}
                        style={{ fontSize: "0.8rem" }}
                      >
                        Reassign
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            if (admin && ["CONFIRMED", "PROCESSING"].includes(o.status)) {
              return (
                <div
                  className="no-print"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "rgba(37, 99, 235, 0.06)",
                    border: "1px dashed #3b82f6",
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#1d4ed8" }}>Ready for Printing Vendor</strong>
                    <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                      Push this order directly to a printing vendor to start printing and notify them via WhatsApp/Email.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn primary compact"
                    onClick={() => setAssignVendorOpen(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Send size={14} /> Send to Vendor
                  </button>
                </div>
              );
            }

            return null;
          })()}

          {/* Printing Queue Management Card */}
          {canUpdate && ["CONFIRMED", "PROCESSING"].includes(o.status) && (
            <div
              className="printing-queue-banner no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 8,
                background:
                  o.status === "PROCESSING"
                    ? o.vendor_printed_at
                      ? "rgba(22, 163, 74, 0.08)"
                      : "rgba(245, 158, 11, 0.08)"
                    : "var(--muted)",
                border:
                  o.status === "PROCESSING"
                    ? o.vendor_printed_at
                      ? "1px solid #86efac"
                      : "1px solid #fde68a"
                    : "1px dashed var(--border)",
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background:
                      o.status === "PROCESSING"
                        ? o.vendor_printed_at
                          ? "#16a34a"
                          : "#d97706"
                        : "var(--primary)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Printer size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "0.92rem" }}>Printing Queue Management</strong>
                    <span
                      className="mono-pill"
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background:
                          o.status === "PROCESSING"
                            ? o.vendor_printed_at
                              ? "rgba(22, 163, 74, 0.15)"
                              : "rgba(245, 158, 11, 0.15)"
                            : "var(--card)",
                        color:
                          o.status === "PROCESSING"
                            ? o.vendor_printed_at
                              ? "#15803d"
                              : "#b45309"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {o.status === "PROCESSING"
                        ? o.vendor_printed_at
                          ? "Printed / Ready"
                          : "In Printing Queue"
                        : "Order Confirmed"}
                    </span>
                  </div>
                  <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                    {o.status === "CONFIRMED"
                      ? "This order is confirmed and ready to be queued for printing."
                      : o.vendor_printed_at
                        ? `Marked as printed (${formatDateDMY(o.vendor_printed_at)}). Ready for dispatch or pickup.`
                        : "Order is in the active printing queue waiting for printing."}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {o.status === "CONFIRMED" ? (
                  <button
                    type="button"
                    className="btn primary compact"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`manage/orders/${o.id}`, { action: "printing_queue", in_queue: true });
                        toast.success("Order added to Printing Queue ✓");
                        window.dispatchEvent(new Event("orders-updated"));
                        await reload();
                      } catch (e) {
                        toast.error(errorText(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Printer size={14} /> Add to Printing Queue
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`btn compact ${o.vendor_printed_at ? "" : "primary"}`}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`manage/orders/${o.id}`, {
                            action: "vendor_print",
                            printed: !o.vendor_printed_at,
                          });
                          toast.success(!o.vendor_printed_at ? "Marked as Printed ✓" : "Print status cleared (back in queue)");
                          window.dispatchEvent(new Event("orders-updated"));
                          await reload();
                        } catch (e) {
                          toast.error(errorText(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {o.vendor_printed_at ? <RotateCcw size={13} /> : <CheckCircle2 size={14} />}
                      {o.vendor_printed_at ? "Unmark Printed" : "Mark as Printed"}
                    </button>
                    <button
                      type="button"
                      className="btn compact"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`manage/orders/${o.id}`, { action: "printing_queue", in_queue: false });
                          toast.success("Order removed from Printing Queue (reverted to Confirmed) ✓");
                          window.dispatchEvent(new Event("orders-updated"));
                          await reload();
                        } catch (e) {
                          toast.error(errorText(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--destructive)" }}
                      title="Remove from Printing Queue and send back to Confirmed status"
                    >
                      <XCircle size={13} /> Remove from Queue
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="checkout-grid">
            {!isVendor && (
              <>
                <div className="print-only">
                  <OrderReceipt o={o} />
                </div>
                <div className="stack no-print">
                  <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>Order Receipt & Documents</strong>
                      <p className="small-text" style={{ margin: "2px 0 0" }}>Print official order receipt or download PDF</p>
                    </div>
                    <ReceiptButtons order={o} />
                  </div>
                </div>
              </>
            )}
            <div className="stack no-print">
              {isVendor ? (
                <div className="panel stack">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>Printing & Fulfillment Instructions</h3>
                    <Status value={o.status} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 8, background: "var(--muted)", margin: "4px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total books ordered:</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)}{" "}
                        {Number(o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)) === 1 ? "book" : "books"}
                      </strong>
                    </div>
                    {o.vendor_notes && (
                      <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>Special Notes: </span>
                        <strong>{o.vendor_notes}</strong>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--muted)",
                      margin: "2px 0 6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2
                        size={16}
                        color={o.vendor_printed_at ? "#16a34a" : "var(--muted-foreground)"}
                      />
                      <span style={{ fontSize: "0.85rem" }}>Print Status:</span>
                      <strong>{o.vendor_printed_at ? "Printed ✓" : "Pending Print"}</strong>
                    </div>
                    <button
                      type="button"
                      className={`btn compact ${o.vendor_printed_at ? "" : "primary"}`}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api(`manage/orders/${o.id}`, {
                            action: "vendor_print",
                            printed: !o.vendor_printed_at,
                          });
                          toast.success(!o.vendor_printed_at ? "Marked as Printed ✓" : "Print status cleared");
                          await reload();
                        } catch (e) {
                          toast.error(errorText(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {o.vendor_printed_at ? "Unmark" : "Mark as Printed"}
                    </button>
                  </div>

                  {isOtherCityOrder(o) ? (
                    o.status === "SHIPPED" ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid #10b981",
                          fontSize: "0.85rem",
                          lineHeight: 1.45,
                        }}
                      >
                        <strong style={{ color: "#047857" }}>🚚 Shipped via Courier:</strong>
                        <p style={{ margin: "4px 0 8px" }}>
                          Shipped via <strong>{o.courier_name}</strong> · Tracking ID: <code>{o.courier_tracking_id}</code>. Once the parcel is delivered to student, click below to mark as Delivered:
                        </p>
                        <button
                          type="button"
                          className="btn primary compact"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await api(`manage/orders/${o.id}`, {
                                action: "status",
                                status: "DELIVERED",
                                version: o.version,
                                note: "Marked as delivered by vendor",
                              });
                              toast.success("Order marked as Delivered ✓");
                              window.dispatchEvent(new Event("orders-updated"));
                              await reload();
                            } catch (e) {
                              toast.error(errorText(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                          style={{ gap: 6, background: "#059669", borderColor: "#059669" }}
                        >
                          <CheckCircle2 size={14} /> Mark as Delivered
                        </button>
                      </div>
                    ) : o.status === "DELIVERED" ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid #10b981",
                          fontSize: "0.85rem",
                          lineHeight: 1.45,
                        }}
                      >
                        <strong style={{ color: "#047857" }}>✅ Delivered to Student:</strong>
                        <p style={{ margin: "4px 0 0" }}>
                          Fulfillment complete. Delivered via {o.courier_name} (Tracking: {o.courier_tracking_id}).
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 8,
                          background: "rgba(59, 130, 246, 0.08)",
                          border: "1px solid #3b82f6",
                          fontSize: "0.85rem",
                          lineHeight: 1.45,
                        }}
                      >
                        <strong>🚚 Other City Delivery:</strong>
                        <p style={{ margin: "4px 0 0" }}>
                          Please print books and dispatch via courier. Once dispatched, click "Add Courier Details" or "Edit Tracking" above to attach tracking ID. Saving tracking will automatically mark order as <strong>Shipped</strong>.
                        </p>
                      </div>
                    )
                  ) : (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid #f59e0b",
                        fontSize: "0.85rem",
                        lineHeight: 1.45,
                      }}
                    >
                      <strong>🏛️ Deliver to Bookstore Office:</strong>
                      <p style={{ margin: "4px 0 8px" }}>
                        This order is for Lahore / VU Qanchi Campus. Once books are printed, click below to mark this batch as dispatched to the Bookstore Office.
                      </p>
                      {o.status === "PROCESSING" ? (
                        <button
                          type="button"
                          className="btn primary compact"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await api(`manage/orders/${o.id}`, {
                                action: "vendor_dispatch_office",
                              });
                              toast.success("Order dispatched to Bookstore Office ✓");
                              await reload();
                            } catch (e) {
                              toast.error(errorText(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                          style={{ gap: 6, background: "#2563eb" }}
                        >
                          <Building2 size={14} /> Send to Bookstore Office
                        </button>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <span
                            className="mono-pill"
                            style={{
                              background: "rgba(37, 99, 235, 0.15)",
                              color: "#1d4ed8",
                              fontWeight: 600,
                            }}
                          >
                            <Building2 size={12} /> Dispatched to Office
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            Awaiting admin verification & delivery
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel stack">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <h3 style={{ margin: 0 }}>Payment verification</h3>
                    <Status value={o.payment_status} />
                  </div>

                  {(o.vendor_printed_at || o.vendor_dispatched_at) && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 14px", borderRadius: 8, background: "var(--muted)", margin: "4px 0" }}>
                      {o.vendor_printed_at && (
                        <span className="mono-pill" style={{ background: "rgba(22, 163, 74, 0.15)", color: "#15803d", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={13} /> Printed by Vendor ({formatDateDMY(o.vendor_printed_at)})
                        </span>
                      )}
                      {o.vendor_dispatched_at && (
                        <span className="mono-pill" style={{ background: "rgba(37, 99, 235, 0.15)", color: "#1d4ed8", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Building2 size={13} /> Dispatched by Vendor to Office ({formatDateDMY(o.vendor_dispatched_at)})
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 14px", borderRadius: 8, background: "var(--muted)", margin: "4px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Order total to receive:</span>
                      <strong style={{ fontSize: "1.08rem", color: "var(--foreground)" }}>{money(o.total)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total books ordered:</span>
                      <strong style={{ fontSize: "0.9rem" }}>
                        {o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)}{" "}
                        {Number(o.total_books ?? (o.items?.reduce((s: number, it: any) => s + (it.quantity || 1), 0) || 0)) === 1 ? "book" : "books"}
                      </strong>
                    </div>
                  </div>

                  {o.payment_note && (
                    <div className="notice info-text" style={{ margin: "2px 0 6px" }}>
                      <strong>Note:</strong> {o.payment_note}
                    </div>
                  )}
                  {canUpdate && (
                    <Field label="Reason or note">
                      <textarea
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Explain rejection, request or status update"
                      />
                    </Field>
                  )}
                  {admin && o.status === "PAYMENT_PENDING" && (
                    <div className="actions">
                      {[
                        ["approve", "Approve Payment"],
                        ["reject", "Reject Payment"],
                        ["request", "Request New Slip"],
                        ["manual", "Manual Review"],
                      ].map(([action, label]) => (
                        <button
                          key={action}
                          className={
                            "btn compact " +
                            (action === "approve" ? "primary" : "")
                          }
                          onClick={() => setDecision({ action, label })}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {admin && (
                    <button
                      className="btn compact"
                      disabled={!note.trim()}
                      onClick={() => act("note")}
                    >
                      Save private admin note
                    </button>
                  )}
                </div>
              )}

              {!isVendor && canUpdate && transitions[o.status]?.length > 0 && (
                <div className="panel stack">
                  <h3>Update fulfilment</h3>
                  <Choose
                    label="Next status"
                    value={next || "none"}
                    onChange={setNext}
                    options={[
                      { value: "none", label: "Choose next status" },
                      ...transitions[o.status]
                        .filter(
                          (s) =>
                            s !== "READY" &&
                            (admin ||
                              [
                                "PROCESSING",
                                "SHIPPED",
                                "DELIVERED",
                              ].includes(s)),
                        )
                        .map((s) => ({ value: s, label: statuses[s] })),
                    ]}
                  />
                  {isOtherCityOrder(o) &&
                    ["SHIPPED", "DELIVERED"].includes(next) &&
                    !o.courier_tracking_id?.trim() && (
                      <div
                        className="notice warning-text"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 6,
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1.5px solid #ef4444",
                          color: "#dc2626",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          margin: "6px 0",
                        }}
                      >
                        <span>⚠️ Please Add Tracking Details</span>
                        <button
                          type="button"
                          className="btn compact primary"
                          style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                          onClick={() => setCourierModalOpen(true)}
                        >
                          Add Tracking Now
                        </button>
                      </div>
                    )}
                  <button
                    className="btn primary"
                    disabled={!next || next === "none"}
                    onClick={() => {
                      if (
                        isOtherCityOrder(o) &&
                        ["SHIPPED", "DELIVERED"].includes(next) &&
                        !o.courier_tracking_id?.trim()
                      ) {
                        toast.error("Please Add Tracking Details");
                        setCourierModalOpen(true);
                        return;
                      }
                      setDecision({
                        action: "status",
                        status: next,
                        label: statuses[next],
                      });
                    }}
                  >
                    Update Status
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="panel history-panel">
            <h3>Order history</h3>
            <DataTable
              headers={["When", "Status", "Note", "By"]}
              rows={o.history.map((h: any) => [
                new Date(h.created_at).toLocaleString(),
                <Status value={h.status} />,
                `${h.internal ? "[Private] " : ""}${h.note}`,
                h.actor,
              ])}
            />
          </div>
          <Confirm
            open={!!decision}
            onClose={() => setDecision(null)}
            title={decision?.label || "Update order"}
            description={
              decision?.action === "approve"
                ? "Confirm only after checking the bank transaction. Approval confirms the order."
                : "This decision will be recorded in the order history and audit log."
            }
            onConfirm={() => act(decision.action, decision.status)}
          />

          {courierModalOpen && (
            <CourierTrackingModal
              order={o}
              onClose={() => setCourierModalOpen(false)}
              onSaved={reload}
            />
          )}

          {assignVendorOpen && (
            <AssignVendorModal
              order={o}
              onClose={() => setAssignVendorOpen(false)}
              onAssigned={reload}
            />
          )}
        </>
      )}
    </Result>
  );
}
function Campuses() {
  const [activity, setActivity] = useState<any[] | null>(null);
  const { data, error, loading, reload } = useData<any[]>("manage/campuses");
  const [edit, setEdit] = useState<any>(null),
    [remove, setRemove] = useState<any>(null);
  return (
    <>
      <div className="toolbar">
        <button
          className="btn primary compact"
          onClick={() =>
            setEdit({
              code: "",
              name: "",
              city: "",
              category: "A",
              active: true,
              permissions: [
                "orders.read",
                "books.read",
                "students.read",
                "reports.read",
              ],
            })
          }
        >
          <Plus size={16} />
          Create campus
        </button>
        <a className="btn compact" href="/admin/users">
          Manage campus logins
        </a>
      </div>
      <Result loading={loading} error={error}>
        <DataTable
          headers={[
            "Campus",
            "Code",
            "City",
            "Pricing Category",
            "Orders",
            "Login status",
            "Permissions",
            "Actions",
          ]}
          rows={(data || []).map((c) => [
            c.name,
            c.code,
            c.city,
            <span className="mono-pill" key={c.id}>
              {categoryLabel(c.category || "A")}
            </span>,
            c.orders,
            c.active ? "Enabled" : "Disabled",
            JSON.parse(c.permissions).join(", "),
            <div className="row-actions" key={`act-${c.id}`}>
              <button
                onClick={() =>
                  setEdit({
                    ...c,
                    category: c.category || "A",
                    active: !!c.active,
                    permissions: JSON.parse(c.permissions),
                  })
                }
              >
                Edit
              </button>
              <a href={"/admin/orders?campus=" + c.id}>Orders</a>
              <button
                onClick={async () => {
                  try {
                    setActivity(
                      await api("manage/campuses/" + c.id + "/activity"),
                    );
                  } catch (e) {
                    toast.error(errorText(e));
                  }
                }}
              >
                Activity
              </button>
              <button onClick={() => setRemove(c)}>Delete</button>
            </div>,
          ])}
        />
      </Result>
      <Dialog open={!!activity} onOpenChange={(v) => !v && setActivity(null)}>
        <DialogContent className="editor-dialog">
          <DialogHeader>
            <DialogTitle>Campus activity</DialogTitle>
            <DialogDescription>
              Account logins and campus changes.
            </DialogDescription>
          </DialogHeader>
          <DataTable
            headers={["Date", "User", "Action"]}
            rows={(activity || []).map((a) => [
              new Date(a.created_at).toLocaleString(),
              a.actor,
              a.action,
            ])}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.id ? "Edit campus" : "Create campus"}
            </DialogTitle>
            <DialogDescription>
              Campus permissions apply to every login assigned to this campus.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api(
                    "manage/campuses" + (edit.id ? "/" + edit.id : ""),
                    edit,
                  );
                  setEdit(null);
                  toast.success("Campus saved.");
                  await reload();
                } catch (e) {
                  toast.error(errorText(e));
                }
              }}
            >
              {[
                ["name", "Campus name"],
                ["code", "Campus code"],
                ["city", "City"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    required
                    value={edit[key]}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        [key]:
                          key === "code"
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                      })
                    }
                  />
                </Field>
              ))}
              <Field label="Campus Pricing Category">
                <Choose
                  label="Category"
                  value={edit.category || "A"}
                  onChange={(v) => setEdit({ ...edit, category: v })}
                  options={["A", "B", "C", "D"].map((cat) => ({
                    value: cat,
                    label: categoryLabel(cat),
                  }))}
                />
              </Field>
              <div className="toggle-row">
                <span>Campus login enabled</span>
                <Switch
                  checked={edit.active}
                  onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                />
              </div>
              <h3>Permissions</h3>
              {permissions.map((p) => (
                <label className="check-row" key={p}>
                  <Checkbox
                    checked={edit.permissions.includes(p)}
                    onCheckedChange={(v) =>
                      setEdit({
                        ...edit,
                        permissions: v
                          ? [...edit.permissions, p]
                          : edit.permissions.filter((x: string) => x !== p),
                      })
                    }
                  />
                  {p.replace(".", " · ")}
                </label>
              ))}
              <button className="btn primary">Save campus</button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete campus?"
        description="Campus accounts will be deleted. Campuses linked to books or orders must be disabled instead."
        onConfirm={async () => {
          try {
            await api("manage/campuses/" + remove.id, {}, "DELETE");
            await reload();
            toast.success("Campus deleted.");
          } catch (e) {
            toast.error(errorText(e));
          }
        }}
      />
    </>
  );
}

function Vendors() {
  const { data, error, loading, reload } = useData<any[]>("manage/vendors");
  const [edit, setEdit] = useState<any>(null);
  const [remove, setRemove] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const vendors: any[] = Array.isArray(data) ? data : ((data as any)?.vendors || []);

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter((v) => v.active).length;
  const totalInPrinting = vendors.reduce(
    (sum, v) => sum + (Number(v.printing_orders_count) || 0),
    0,
  );
  const totalAssigned = vendors.reduce(
    (sum, v) => sum + (Number(v.assigned_orders_count) || 0),
    0,
  );

  const filtered = vendors.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").toLowerCase().includes(q) ||
      (v.email || "").toLowerCase().includes(q) ||
      (v.address || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric metric-blue">
          <div className="metric-heading">
            <span>Total Vendors</span>
            <span className="metric-icon">
              <Factory size={19} />
            </span>
          </div>
          <strong>{totalVendors}</strong>
          <small>{activeVendors} active printing partners</small>
        </div>

        <div className="metric metric-amber">
          <div className="metric-heading">
            <span>Currently Printing</span>
            <span className="metric-icon">
              <Clock3 size={19} />
            </span>
          </div>
          <strong>{totalInPrinting}</strong>
          <small>Orders in active print batches</small>
        </div>

        <div className="metric metric-emerald">
          <div className="metric-heading">
            <span>Total Assigned</span>
            <span className="metric-icon">
              <Package size={19} />
            </span>
          </div>
          <strong>{totalAssigned}</strong>
          <small>Cumulative vendor orders</small>
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
        <button
          className="btn primary compact"
          onClick={() =>
            setEdit({
              name: "",
              phone: "",
              email: "",
              password: "",
              address: "",
              active: true,
            })
          }
        >
          <Plus size={16} />
          Add Vendor Partner
        </button>

        <div className="search-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
          <Search size={15} className="search-icon" />
          <input
            type="search"
            placeholder="Search vendor name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <button
          className="btn compact"
          onClick={() => reload()}
          disabled={loading}
          title="Refresh vendor list"
        >
          <RefreshCw size={14} className={loading ? "refresh-spinning" : undefined} />
          Refresh
        </button>
      </div>

      <Result loading={loading} error={error}>
        <DataTable
          headers={[
            "Vendor Partner",
            "Contact & WhatsApp",
            "Press / Address",
            "Active Workload",
            "Portal Access",
            "Actions",
          ]}
          rows={filtered.map((v) => {
            const waNumber = formatWhatsAppPhone(v.phone || "");
            const waHref = waNumber ? `https://wa.me/${waNumber}` : null;
            return [
              <div key={`vendor-${v.id}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong style={{ fontSize: "0.95rem" }}>{v.name}</strong>
                <span className="mono small-text" style={{ color: "var(--muted-foreground)" }}>
                  {v.email}
                </span>
              </div>,

              <div key={`contact-${v.id}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{v.phone || "—"}</span>
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="btn compact"
                    style={{
                      padding: "2px 6px",
                      height: 24,
                      fontSize: "0.75rem",
                      gap: 4,
                      color: "#16a34a",
                      borderColor: "rgba(22, 163, 74, 0.3)",
                      background: "rgba(22, 163, 74, 0.08)",
                    }}
                    title={`Open WhatsApp chat with ${v.name}`}
                  >
                    <MessageCircle size={12} />
                    WhatsApp
                  </a>
                )}
              </div>,

              v.address || <span style={{ color: "var(--muted-foreground)" }}>—</span>,

              <div key={`workload-${v.id}`} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  className="mono-pill"
                  style={{
                    background: (v.printing_orders_count || 0) > 0 ? "rgba(245, 158, 11, 0.15)" : undefined,
                    color: (v.printing_orders_count || 0) > 0 ? "#b45309" : undefined,
                    fontWeight: 600,
                  }}
                >
                  {v.printing_orders_count || 0} in printing
                </span>
                <span className="small-text" style={{ color: "var(--muted-foreground)" }}>
                  ({v.assigned_orders_count || 0} total)
                </span>
              </div>,

              <span
                key={`status-${v.id}`}
                className={v.active ? "badge-success" : "badge-muted"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: v.active ? "rgba(22, 163, 74, 0.12)" : "var(--muted)",
                  color: v.active ? "#15803d" : "var(--muted-foreground)",
                }}
              >
                {v.active ? "Active" : "Disabled"}
              </span>,

              <div className="row-actions" key={`act-${v.id}`}>
                <button
                  onClick={() =>
                    setEdit({
                      id: v.id,
                      name: v.name,
                      phone: v.phone,
                      email: v.email,
                      address: v.address || "",
                      active: !!v.active,
                      password: "",
                    })
                  }
                >
                  Edit
                </button>
                <a href={"/admin/orders?search=" + encodeURIComponent(v.name)}>
                  Orders
                </a>
                <button
                  className="btn-destructive-text"
                  onClick={() => setRemove(v)}
                >
                  Delete
                </button>
              </div>,
            ];
          })}
        />
      </Result>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.id ? "Edit Vendor Partner" : "Add Vendor Partner"}
            </DialogTitle>
            <DialogDescription>
              {edit?.id
                ? "Update vendor contact details or set a new password."
                : "Create a new printing vendor partner with portal credentials."}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const payload: any = {
                    name: edit.name,
                    phone: edit.phone,
                    address: edit.address || null,
                  };
                  if (!edit.id) {
                    payload.email = edit.email;
                    payload.password = edit.password;
                  } else {
                    payload.active = !!edit.active;
                    if (edit.password?.trim()) {
                      payload.password = edit.password.trim();
                    }
                  }
                  await api(
                    "manage/vendors" + (edit.id ? "/" + edit.id : ""),
                    payload,
                  );
                  setEdit(null);
                  toast.success(edit.id ? "Vendor updated." : "Vendor partner created.");
                  await reload();
                } catch (err) {
                  toast.error(errorText(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Vendor / Press name">
                <input
                  required
                  placeholder="e.g. Royal Print Solutions"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </Field>

              <Field
                label="WhatsApp / Phone number"
                hint="Used for 1-click WhatsApp order dispatch"
              >
                <input
                  required
                  placeholder="0300 1234567 or +923001234567"
                  value={edit.phone}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                />
              </Field>

              <Field
                label="Login email address"
                hint={edit.id ? "Email cannot be changed after creation." : "Used by the vendor to sign in at /vendor/login"}
              >
                <input
                  type="email"
                  required
                  disabled={!!edit.id}
                  placeholder="vendor@example.com"
                  value={edit.email}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                />
              </Field>

              <Field
                label={edit.id ? "Change password (optional)" : "Portal login password"}
                hint={edit.id ? "Leave blank to keep existing password." : "Minimum 6 characters"}
              >
                <input
                  type="password"
                  required={!edit.id}
                  minLength={6}
                  placeholder={edit.id ? "•••••••• (unchanged)" : "At least 6 characters"}
                  value={edit.password}
                  onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                />
              </Field>

              <Field label="Press / Workshop address" hint="Physical location or city notes">
                <input
                  placeholder="e.g. Shop # 4, Urdu Bazaar, Lahore"
                  value={edit.address}
                  onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                />
              </Field>

              {edit.id && (
                <div className="toggle-row">
                  <span>Vendor portal access active</span>
                  <Switch
                    checked={edit.active}
                    onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                  />
                </div>
              )}

              <button className="btn primary" disabled={busy}>
                {busy ? "Saving…" : edit.id ? "Save vendor" : "Create vendor partner"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Confirm
        open={!!remove}
        onClose={() => setRemove(null)}
        title={`Delete ${remove?.name || "vendor"}?`}
        description="Vendor portal account will be removed. Vendors linked to existing orders cannot be deleted and must be disabled instead."
        onConfirm={async () => {
          try {
            await api("manage/vendors/" + remove.id, {}, "DELETE");
            await reload();
            toast.success("Vendor partner deleted.");
          } catch (e) {
            toast.error(errorText(e));
          }
        }}
      />
    </>
  );
}

function UserAccounts() {
  const { data, error, loading, reload } = useData<any[]>("manage/users");
  const [campuses, setCampuses] = useState<any[]>([]),
    [edit, setEdit] = useState<any>(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("manage/campuses")
      .then(setCampuses)
      .catch(() => {});
  }, []);
  return (
    <>
      <div className="toolbar">
        <button
          className="btn primary compact"
          onClick={() =>
            setEdit({
              name: "",
              email: "",
              role: "CAMPUS_ADMIN",
              campus_id: null,
              active: true,
              password: "",
            })
          }
        >
          <Plus size={16} />
          Create account
        </button>
      </div>
      <Result loading={loading} error={error}>
        <DataTable
          headers={["Name", "Email", "Role", "Campus", "Status", "Manage"]}
          rows={(data || []).map((u) => [
            u.name,
            u.email,
            u.role,
            u.campus_name || "All",
            u.active ? "Enabled" : "Disabled",
            <button
              className="text-link"
              onClick={() =>
                setEdit({ ...u, active: !!u.active, password: "" })
              }
            >
              Edit / reset password
            </button>,
          ])}
        />
      </Result>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.id ? "Manage account" : "Create account"}
            </DialogTitle>
            <DialogDescription>
              Passwords are securely hashed. Resetting a password revokes all
              sessions and requires a change at next login.
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const b = {
                    ...edit,
                    ...(!edit.password ? { password: undefined } : {}),
                  };
                  await api("manage/users" + (edit.id ? "/" + edit.id : ""), b);
                  setEdit(null);
                  await reload();
                  toast.success("Account saved.");
                } catch (e) {
                  toast.error(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {[
                ["name", "Name"],
                ["email", "Email"],
              ].map(([k, label]) => (
                <Field label={label} key={k}>
                  <input
                    type={k === "email" ? "email" : "text"}
                    required
                    value={edit[k]}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                  />
                </Field>
              ))}
              <Field label="Role">
                <Choose
                  label="Role"
                  value={edit.role}
                  onChange={(v) => setEdit({ ...edit, role: v })}
                  options={[
                    { value: "CAMPUS_ADMIN", label: "Campus Admin" },
                    { value: "SUPER_ADMIN", label: "Super Admin" },
                  ]}
                />
              </Field>
              {edit.role === "CAMPUS_ADMIN" && (
                <Field label="Campus">
                  <Choose
                    label="Campus"
                    value={edit.campus_id || "none"}
                    onChange={(v) =>
                      setEdit({ ...edit, campus_id: v === "none" ? null : v })
                    }
                    options={[
                      { value: "none", label: "Choose campus" },
                      ...campuses.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </Field>
              )}
              <Field
                label={
                  edit.id
                    ? "New temporary password (leave blank to keep)"
                    : "Temporary password"
                }
                hint="12+ characters, uppercase, lowercase and number"
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  required={!edit.id}
                  minLength={12}
                  value={edit.password}
                  onChange={(e) =>
                    setEdit({ ...edit, password: e.target.value })
                  }
                />
              </Field>
              <div className="toggle-row">
                <span>Login enabled</span>
                <Switch
                  checked={edit.active}
                  onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                />
              </div>
              <button className="btn primary" disabled={busy}>
                {busy ? "Saving…" : "Save account"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function SettingsPage() {
  const { data, error, loading, reload } = useData<{
    settings: StoreSettings;
    version: number;
  }>("manage/settings");
  const [form, setForm] = useState<any>(null),
    [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        ...data.settings,
        support_email: data.settings.support_email || "Not Available",
        header_tagline: data.settings.header_tagline ?? "Your one-stop shop for educational books",
        distribution_center_address: data.settings.distribution_center_address ?? "Qanchi",
        facebook_link: data.settings.facebook_link ?? "https://facebook.com/campusbookstore",
        twitter_link: data.settings.twitter_link ?? "https://twitter.com/campusbookstore",
        instagram_link: data.settings.instagram_link ?? "https://instagram.com/campusbookstore",
        linkedin_link: data.settings.linkedin_link ?? "https://linkedin.com/company/campusbookstore",
        maintenance_message: data.settings.maintenance_message ?? "We are currently conducting scheduled system maintenance. Ordering is temporarily closed. Please check back soon!",
        bank_iban: data.settings.bank_iban ?? "PK29MEZN0011550109645933",
        delivery_campus: data.settings.delivery_campus ?? 10000,
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("manage/settings", {
        settings: form,
        version: data!.version,
      });
      toast.success("System configuration saved successfully.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("store-settings-updated", {
            detail: { store_name: form.store_name },
          }),
        );
      }
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Result loading={loading} error={error}>
      {form && (
        <form onSubmit={handleSubmit} className="centralized-settings-form">
          {/* Top Header Row */}
          <div className="settings-header-row">
            <div>
              <h1 className="settings-main-title">Centralized System Settings</h1>
              <p className="settings-main-subtitle">
                Manage global storefront configuration, support contacts, social links, and maintenance mode status.
              </p>
            </div>
            <button type="submit" className="settings-save-btn" disabled={busy}>
              <CheckCircle2 size={18} />
              <span>{busy ? "Saving..." : "Save System Configuration"}</span>
            </button>
          </div>

          {/* Group 1: GENERAL CONFIGURATION */}
          <div className="settings-group-panel">
            <div className="settings-group-header">
              <Globe size={18} className="settings-group-icon" />
              <h3>GENERAL CONFIGURATION</h3>
            </div>
            <div className="form-grid">
              <Field
                label="Store Name / Site Title"
                hint="Controls the brand name displayed across every page and the admin panel."
              >
                <input
                  required
                  value={form.store_name || ""}
                  onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                />
              </Field>
              <Field label="Header Tagline">
                <input
                  value={form.header_tagline || ""}
                  onChange={(e) => setForm({ ...form, header_tagline: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Group 2: SUPPORT & CONTACT INFO */}
          <div className="settings-group-panel">
            <div className="settings-group-header">
              <Mail size={18} className="settings-group-icon" />
              <h3>SUPPORT & CONTACT INFO</h3>
            </div>
            <div className="form-grid">
              <Field label="Contact Email">
                <input
                  type="text"
                  value={form.support_email || ""}
                  placeholder="Not Available"
                  onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                />
              </Field>
              <Field label="Contact Phone / WhatsApp">
                <input
                  required
                  value={form.whatsapp || ""}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </Field>
            </div>
            <div className="full-width-field" style={{ marginTop: 12 }}>
              <Field label="Distribution Center Address">
                <input
                  value={form.distribution_center_address || ""}
                  onChange={(e) => setForm({ ...form, distribution_center_address: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Group 3: SOCIAL MEDIA HANDLES */}
          <div className="settings-group-panel">
            <div className="settings-group-header">
              <Share2 size={18} className="settings-group-icon" />
              <h3>SOCIAL MEDIA HANDLES</h3>
            </div>
            <div className="form-grid">
              <Field label="Facebook Link">
                <input
                  value={form.facebook_link || ""}
                  onChange={(e) => setForm({ ...form, facebook_link: e.target.value })}
                />
              </Field>
              <Field label="Twitter Link">
                <input
                  value={form.twitter_link || ""}
                  onChange={(e) => setForm({ ...form, twitter_link: e.target.value })}
                />
              </Field>
              <Field label="Instagram Link">
                <input
                  value={form.instagram_link || ""}
                  onChange={(e) => setForm({ ...form, instagram_link: e.target.value })}
                />
              </Field>
              <Field label="LinkedIn Link">
                <input
                  value={form.linkedin_link || ""}
                  onChange={(e) => setForm({ ...form, linkedin_link: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Group 4: MAINTENANCE MODE */}
          <div className="settings-group-panel">
            <div className="settings-maintenance-toggle-row">
              <div className="settings-toggle-info">
                <ShieldCheck size={20} className="settings-group-icon" />
                <div>
                  <strong className="settings-toggle-title">Maintenance Mode</strong>
                  <p className="settings-toggle-desc">
                    Enabling maintenance mode blocks public storefront access and displays a static placeholder page to students.
                  </p>
                </div>
              </div>
              <Switch
                checked={!form.store_open}
                onCheckedChange={(v) => setForm({ ...form, store_open: !v })}
              />
            </div>

            <Field label="CUSTOM MAINTENANCE MESSAGE (DISPLAYED TO STUDENTS ON MAINTENANCE SCREEN)">
              <textarea
                rows={3}
                value={form.maintenance_message || ""}
                onChange={(e) => setForm({ ...form, maintenance_message: e.target.value })}
              />
            </Field>
          </div>

          {/* Group 5: BANK ACCOUNT & DELIVERY FEES */}
          <div className="settings-group-panel">
            <div className="settings-group-header">
              <CreditCard size={18} className="settings-group-icon" />
              <h3>BANK ACCOUNT & DELIVERY FEES</h3>
            </div>
            <div className="form-grid">
              <Field label="Bank Name">
                <input
                  required
                  value={form.bank_name || ""}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                />
              </Field>
              <Field label="Account Number">
                <input
                  required
                  value={form.bank_account || ""}
                  onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                />
              </Field>
              <Field label="IBAN Number">
                <input
                  required
                  value={form.bank_iban || ""}
                  onChange={(e) => setForm({ ...form, bank_iban: e.target.value })}
                />
              </Field>
              <Field label="Account Title">
                <input
                  required
                  value={form.account_title || ""}
                  onChange={(e) => setForm({ ...form, account_title: e.target.value })}
                />
              </Field>
            </div>

            <div className="form-grid three-col" style={{ marginTop: 16 }}>
              <Field label="VU Qanchi Campus Lahore Pickup Fee (Rs.)">
                <input
                  required
                  type="number"
                  min="0"
                  value={Math.round((form.delivery_campus ?? 10000) / 100)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      delivery_campus: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </Field>
              <Field label="Lahore Base Delivery Fee (Rs.) (Min)">
                <input
                  required
                  type="number"
                  min="0"
                  value={Math.round((form.delivery_lahore || 0) / 100)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      delivery_lahore: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </Field>
              <Field label="Other City Base Delivery Fee (Rs.) (Min)">
                <input
                  required
                  type="number"
                  min="0"
                  value={Math.round((form.delivery_other || 0) / 100)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      delivery_other: Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </Field>
            </div>
            <p className="small-text muted" style={{ marginTop: 8 }}>
              💡 <strong>Delivery Policy Note:</strong> Lahore and Other City fees are base minimum advance charges. Any excess rider fare or courier weight surcharge is paid directly by the student upon delivery.
            </p>
          </div>

          {/* Bottom Save Button */}
          <div className="settings-bottom-actions">
            <button type="submit" className="settings-save-btn" disabled={busy}>
              <CheckCircle2 size={18} />
              <span>{busy ? "Saving..." : "Save System Configuration"}</span>
            </button>
          </div>
        </form>
      )}
    </Result>
  );
}
function Students({ user }: { user?: User }) {
  const [q, setQ] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [studentToClear, setStudentToClear] = useState<any | null>(null);
  const [clearing, setClearing] = useState(false);
  const { data, error, loading, reload } = useData<any[]>("manage/students");

  const isAdmin =
    user?.role === "SUPER_ADMIN" || user?.permissions.includes("orders.update");

  const filtered = (data || []).filter((s) => {
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term)) ||
      (s.city && s.city.toLowerCase().includes(term))
    );
  });

  const clearAllHistory = async () => {
    setClearing(true);
    try {
      await api("manage/students", { action: "clear_all" });
      toast.success("Student history cleared successfully.");
      reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setClearing(false);
    }
  };

  const clearSingleStudent = async () => {
    if (!studentToClear) return;
    setClearing(true);
    try {
      await api("manage/students", {
        action: "clear_student",
        phone: studentToClear.phone,
      });
      toast.success(
        `Cleared history for ${studentToClear.name || studentToClear.phone}.`,
      );
      setStudentToClear(null);
      reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search students"
          placeholder="Filter by student name, WhatsApp or city…"
        />
        <button className="btn compact" onClick={reload} disabled={loading}>
          <RefreshCw
            size={15}
            className={loading ? "refresh-spinning" : undefined}
          />
          Refresh
        </button>
        {isAdmin && (
          <button
            className="btn compact btn-destructive"
            onClick={() => setConfirmClearAll(true)}
            disabled={clearing || loading || !data?.length}
            title="Clear all student order history"
          >
            <Trash2 size={15} />
            {clearing ? "Clearing…" : "Clear Student History"}
          </button>
        )}
      </div>

      <Result loading={loading} error={error}>
        <DataTable
          headers={[
            "Student",
            "WhatsApp",
            "City",
            "Orders",
            "Latest order",
            ...(isAdmin ? ["Actions"] : []),
          ]}
          rows={filtered.map((s) => [
            s.name || "Student",
            s.phone || "—",
            s.city || "—",
            s.orders,
            s.last_order ? formatDateDMY(s.last_order) : "—",
            ...(isAdmin
              ? [
                  <button
                    key={s.phone}
                    className="btn compact btn-destructive"
                    onClick={() => setStudentToClear(s)}
                    disabled={clearing}
                    title={`Clear history for ${s.name}`}
                  >
                    <Trash2 size={14} /> Clear
                  </button>,
                ]
              : []),
          ])}
        />
      </Result>

      <Confirm
        open={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
        onConfirm={clearAllHistory}
        title="Clear All Student History"
        description="Are you sure you want to clear all student history? This will permanently delete student orders and records from the directory."
      />

      <Confirm
        open={!!studentToClear}
        onClose={() => setStudentToClear(null)}
        onConfirm={clearSingleStudent}
        title={`Clear History for ${studentToClear?.name || "Student"}`}
        description={`Are you sure you want to delete order history for ${studentToClear?.name || "this student"} (${studentToClear?.phone})?`}
      />
    </>
  );
}
function Audit() {
  const [offset, setOffset] = useState(0);
  const { data, error, loading } = useData<any[]>(
    "manage/audit?offset=" + offset,
  );
  return (
    <Result loading={loading} error={error}>
      <DataTable
        headers={["When", "User", "Action", "Entity", "Changes", "Device"]}
        rows={(data || []).map((a) => [
          new Date(a.created_at).toLocaleString(),
          a.actor,
          a.action,
          <span className="mono">{a.entity}</span>,
          <details>
            <summary>Inspect change</summary>
            <pre className="audit-json">
              {JSON.stringify(
                {
                  before: a.before ? JSON.parse(a.before) : null,
                  after: a.after ? JSON.parse(a.after) : null,
                },
                null,
                2,
              )}
            </pre>
          </details>,
          <span className="small-text">{a.device}</span>,
        ])}
      />
      <div className="pagination">
        <button
          className="btn compact"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 100))}
        >
          Previous
        </button>
        <span>
          Records {offset + 1}–{offset + (data?.length || 0)}
        </span>
        <button
          className="btn compact"
          disabled={(data?.length || 0) < 100}
          onClick={() => setOffset(offset + 100)}
        >
          Next
        </button>
      </div>
    </Result>
  );
}
