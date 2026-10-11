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
  Clock3,
  CheckCircle2,
  Truck,
  MapPin,
  Navigation,
  X,
  Printer,
  Eye,
  Globe,
  Mail,
  Share2,
  CreditCard,
  Clock,
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
  errorText,
  Status,
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
  type User,
  type Book,
  type StoreSettings,
} from "@/lib/contracts";
const Charts = dynamic(() => import("./report-charts"), {
  loading: () => <Loading />,
});
const nav = [
  ["dashboard", "Overview", LayoutDashboard, "reports.read"],
  ["orders", "Orders", ShoppingBag, "orders.read"],
  ["payments", "Payment verification", ShieldCheck, "admin"],
  ["books", "Books", Library, "books.read"],
  ["pricing", "Pricing management", Coins, "admin"],
  ["campuses", "Campuses", Building2, "admin"],
  ["students", "Students", Users, "students.read"],
  ["reports", "Reports", BarChart3, "reports.read"],
  ["users", "User accounts", Users, "admin"],
  ["settings", "Settings", Settings, "admin"],
  ["audit", "Audit log", ScrollText, "admin"],
  ["profile", "My profile", UserRound, "profile"],
] as const;
export function Login({ portal }: { portal: "admin" | "campus" }) {
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
          campus<span>bookstore</span>
        </a>
        <div>
          <span className="eyebrow">
            {portal === "admin" ? "THE CONTROL ROOM" : "YOUR CAMPUS, CONNECTED"}
          </span>
          <h1>
            Good books.
            <br />
            Better possibilities.
          </h1>
          <p>
            {portal === "admin"
              ? "Every book, every order, every campus. Thoughtfully managed from one place."
              : "A clear view of your campus orders, students and course materials."}
          </p>
        </div>
        <span>
          Campus Bookstore /{" "}
          {portal === "admin" ? "Super Admin" : "Campus Portal"}
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
                : "Campus sign in"
              : forgotMode === "request"
                ? "Reset Admin Password"
                : "Enter Verification Code"}
          </h2>
          <p>
            {forgotMode === "none"
              ? "Use the account provided by your administrator."
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
                  location.href = `/${portal}/${r.must_change ? "profile" : "dashboard"}`;
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
}: {
  user: User;
  section?: string;
  record?: string;
  pendingOrders?: number;
}) {
  const isAdmin = user.role === "SUPER_ADMIN",
    base = isAdmin ? "/admin" : "/campus";
  const title = nav.find((n) => n[0] === section)?.[1] || "Overview";
  const [pendingCount, setPendingCount] = useState(pendingOrders);
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
          <a className="brand portal-brand" href={base + "/dashboard"}>
            <BookOpen />
            campus<span>bookstore</span>
          </a>
          <span className="portal-label">
            {isAdmin ? "SUPER ADMIN" : "CAMPUS PORTAL"}
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {nav
              .filter(
                (n) =>
                  isAdmin ||
                  n[3] === "profile" ||
                  user.permissions.includes(n[3]),
              )
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
              {isAdmin ? "Workspace" : "Campus"} / <strong>{title}</strong>
            </span>
          </div>
          <ThemeSwitch />
        </header>
        <main className="portal-main" id="main">
          <div className="portal-page-head no-print">
            <div>
              <span className="eyebrow">
                {isAdmin ? "CAMPUS BOOKSTORE OPERATIONS" : "CAMPUS WORKSPACE"}
              </span>
              <h1>{title}</h1>
            </div>
            <span className="muted">
              {new Date().toLocaleDateString("en-GB", {
                timeZone: "Asia/Karachi",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
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
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await api(path);
      if (current === requestId.current) setData(result);
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
      href: "/payments",
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
                  <a href="/admin/payments" className="text-link">
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

  // 4. Fallback for Lahore home delivery address: route directly to address in Lahore
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

  return null;
}

function getMapLocation(o: any) {
  return getMapDirectionsUrl(o);
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

  const admin = user.role === "SUPER_ADMIN";
  const canUpdate = admin || user.permissions.includes("orders.update");
  const mapUrl = getMapDirectionsUrl(o);

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

  const printSlip = (slipId: string) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Slip - ${o?.reference || slipId}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
              img, iframe { max-width: 100%; max-height: 98vh; object-fit: contain; }
              @media print {
                body { background: none; }
                img, iframe { max-width: 100%; max-height: 100%; page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <img src="/api/proofs/${slipId}" onload="window.print(); window.close();" onError="alert('Could not load image');" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      toast.error("Could not open print window. Please allow popups.");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="order-modal-popup-content">
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
              {mapUrl && (
                <div className="rider-map-pin-banner">
                  <div className="banner-left">
                    <Navigation size={26} className="map-icon-pulse" />
                    <div>
                      <strong>📍 Lahore Rider Live Route Navigation (InDrive Style)</strong>
                      <p className="small-text">
                        Direct route from rider’s current location to student pin: {o.address}
                      </p>
                    </div>
                  </div>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn primary compact map-btn"
                  >
                    <Navigation size={16} /> Start InDrive Live Route Navigation <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <div className="checkout-grid order-modal-grid">
                <div className="stack">
                  {/* Direct Online Payment Slip View */}
                  {o.slip_id && (
                    <div className="panel slip-online-panel">
                      <div className="slip-panel-header">
                        <h3>Attached Payment Slip</h3>
                        <div className="slip-actions">
                          <button
                            type="button"
                            className="btn primary compact"
                            onClick={() => printSlip(o.slip_id)}
                          >
                            <Printer size={15} /> Print Slip
                          </button>
                          <a
                            className="btn compact"
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

                  <div className="panel receipt-panel">
                    <OrderReceipt o={o} />
                    <ReceiptButtons order={o} />
                  </div>
                </div>

                <div className="stack no-print">
                  <div className="panel stack">
                    <h3>Payment verification</h3>
                    <Status value={o.payment_status} />
                    <Status value={o.ocr_status} />
                    <p>{o.ocr_message}</p>
                    <div>
                      Order total <strong>{money(o.total)}</strong>
                    </div>
                    <div>
                      Detected amount{" "}
                      <strong>
                        {o.detected_amount === null
                          ? "Unavailable"
                          : money(o.detected_amount)}
                      </strong>
                    </div>
                    {o.detected_amount !== null && (
                      <div>
                        Difference{" "}
                        <strong>{money(o.detected_amount - o.total)}</strong>
                      </div>
                    )}
                    <p className="small-text">
                      OCR is an aid only. Confirm the bank transaction before
                      approving payment.
                    </p>
                    {o.payment_note && <p>{o.payment_note}</p>}
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
                  {canUpdate && transitions[o.status]?.length > 0 && (
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
                                admin ||
                                [
                                  "PROCESSING",
                                  "READY",
                                  "SHIPPED",
                                  "DELIVERED",
                                ].includes(s),
                            )
                            .map((s) => ({ value: s, label: statuses[s] })),
                        ]}
                      />
                      <button
                        className="btn primary"
                        disabled={!next || next === "none"}
                        onClick={() =>
                          setDecision({
                            action: "status",
                            status: next,
                            label: statuses[next],
                          })
                        }
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
      </DialogContent>
    </Dialog>
  );
}

function Orders({
  base,
  payments,
  user,
}: {
  base: string;
  payments: boolean;
  user?: User;
}) {
  const [campus, setCampus] = useState("");
  useEffect(
    () => setCampus(new URLSearchParams(location.search).get("campus") || ""),
    [],
  );
  const [q, setQ] = useState(""),
    [status, setStatus] = useState(payments ? "PAYMENT_PENDING" : "all"),
    [deliveryType, setDeliveryType] = useState("all"),
    [page, setPage] = useState(1),
    [dates, setDates] = useState({ from: "", to: "" }),
    [activeOrderId, setActiveOrderId] = useState<string | null>(null),
    [deletingOrder, setDeletingOrder] = useState<any | null>(null),
    [exporting, setExporting] = useState(false);

  const isAdmin = user?.role === "SUPER_ADMIN";

  const exportOrders = async () => {
    setExporting(true);
    try {
      const exportPath = `manage/orders?q=${encodeURIComponent(q)}&status=${status === "all" ? "" : status}&delivery_type=${deliveryType === "all" ? "" : deliveryType}&from=${dates.from}&to=${dates.to}&campus=${encodeURIComponent(campus)}&limit=all`;
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
      if (deliveryType === "campus") deliveryPrefix = "Campus Pickup";
      else if (deliveryType === "lahore") deliveryPrefix = "Lahore";
      else if (deliveryType === "other") deliveryPrefix = "Other City";

      const statusPart =
        status && status !== "all" ? ` - ${statuses[status] || status}` : "";
      const filename = `${deliveryPrefix}${statusPart} - ${currentDate}.xlsx`;
      const includeAddress = deliveryType === "other";

      try {
        const { exportOrdersExcel } = await import("@/lib/orders-excel-browser");
        await exportOrdersExcel(rows, filename, { includeAddress });
        toast.success(
          `Exported ${rows.length} order(s)${includeAddress ? " with address" : ""} to ${filename}.`,
        );
      } catch (excelErr) {
        // Fallback to structured CSV with book items
        const csvRows: unknown[][] = [
          [
            "Sr No",
            "Order Number",
            "Student Name",
            "Date",
            ...(includeAddress ? ["Address"] : []),
            "Book Code",
            "Book Name",
            "Quantity",
          ],
        ];

        rows.forEach((o: any, orderIdx: number) => {
          const items =
            o.items && o.items.length > 0
              ? o.items
              : [{ code: "—", title: "Order Record", quantity: 1 }];
          const d = o.created_at ? new Date(o.created_at) : null;
          const dateStr =
            d && !isNaN(d.getTime())
              ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
              : "—";
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
              idx === 0 ? dateStr : "",
              ...(includeAddress ? [idx === 0 ? fullAddress : ""] : []),
              item.code || "—",
              item.title || "—",
              item.quantity || 1,
            ]);
          });
        });

        download(filename.replace(/\.xlsx$/, ".csv"), csv(csvRows));
        toast.success(`Exported ${rows.length} order(s).`);
      }
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setExporting(false);
    }
  };

  const path = `manage/orders?q=${encodeURIComponent(q)}&status=${status === "all" ? "" : status}&delivery_type=${deliveryType === "all" ? "" : deliveryType}&page=${page}&from=${dates.from}&to=${dates.to}&campus=${encodeURIComponent(campus)}`;
  const { data, error, loading, reload } = useData(path);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener("orders-updated", handler);
    return () => window.removeEventListener("orders-updated", handler);
  }, [reload]);

  const headers = payments
    ? [
        "Order",
        "Customer",
        "Total",
        "OCR amount / difference",
        "Status",
        "Review",
        ...(isAdmin ? ["Actions"] : []),
      ]
    : [
        "Order",
        "Student",
        "Date",
        "Total",
        "Order status",
        "Payment",
        "Details",
        ...(isAdmin ? ["Actions"] : []),
      ];

  return (
    <>
      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          aria-label="Search orders"
          placeholder="Order ID, student or WhatsApp…"
        />
        <Choose
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          label="Order status"
          options={[
            { value: "all", label: "All statuses" },
            ...Object.keys(transitions).map((s) => ({
              value: s,
              label: statuses[s],
            })),
          ]}
        />
        <Choose
          value={deliveryType}
          onChange={(v) => {
            setDeliveryType(v);
            setPage(1);
          }}
          label="Delivery type"
          options={[
            { value: "all", label: "All delivery types" },
            { value: "campus", label: "Campus Pickup" },
            { value: "lahore", label: "Lahore" },
            { value: "other", label: "Other City" },
          ]}
        />
        <input
          type="date"
          aria-label="From date"
          value={dates.from}
          onChange={(e) => {
            setDates({ ...dates, from: e.target.value });
            setPage(1);
          }}
        />
        <input
          type="date"
          aria-label="To date"
          value={dates.to}
          onChange={(e) => {
            setDates({ ...dates, to: e.target.value });
            setPage(1);
          }}
        />
        <button
          className="btn compact"
          onClick={exportOrders}
          disabled={exporting || loading}
          title={`Export ${deliveryType === "all" ? (status === "all" ? "all" : statuses[status] || status) : (deliveryType === "other" ? "Other City" : deliveryType === "campus" ? "Campus Pickup" : "Lahore")} orders to Excel`}
        >
          <Download size={15} />
          {exporting
            ? "Exporting…"
            : `Export ${
                status === "all" && deliveryType === "all"
                  ? "Orders"
                  : deliveryType !== "all"
                    ? deliveryType === "other"
                      ? "Other City"
                      : deliveryType === "campus"
                        ? "Campus Pickup"
                        : "Lahore"
                    : statuses[status] || status
              }`}
        </button>
      </div>
      <Result loading={loading} error={error}>
        <DataTable
          headers={headers}
          rows={(data?.rows || []).map((o: any) => {
            const mapUrl = getMapLocation(o);
            const refCell = (
              <div>
                <strong>{o.reference}</strong>
                {mapUrl && (
                  <div>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="map-pin-pill"
                      onClick={(e) => e.stopPropagation()}
                      title="Open InDrive style live route navigation from your location to student location"
                    >
                      <Navigation size={12} /> Lahore Route
                    </a>
                  </div>
                )}
              </div>
            );
            return payments
              ? [
                  refCell,
                  <div>
                    {o.name}
                    <p>{o.phone}</p>
                    {o.delivery_type && (
                      <span className="small-text muted">
                        {o.delivery_type === "campus"
                          ? "🏫 Campus Pickup"
                          : o.delivery_type === "lahore"
                            ? "🛵 Lahore Delivery"
                            : "📦 Other Cities"}
                      </span>
                    )}
                  </div>,
                  money(o.total),
                  <div>
                    {o.detected_amount === null
                      ? "Not detected"
                      : money(o.detected_amount)}
                    <p>
                      {o.detected_amount === null
                        ? "Manual review"
                        : `Difference: ${money(o.detected_amount - o.total)}`}
                    </p>
                  </div>,
                  <div>
                    <Status value={o.ocr_status} />
                    <Status value={o.payment_status} />
                  </div>,
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setActiveOrderId(o.id)}
                  >
                    Review payment
                  </button>,
                  ...(isAdmin
                    ? [
                        <button
                          type="button"
                          className="btn compact danger-button icon-only"
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
                    <p>{o.phone}</p>
                    {o.delivery_type && (
                      <span className="small-text muted">
                        {o.delivery_type === "campus"
                          ? "🏫 Campus Pickup"
                          : o.delivery_type === "lahore"
                            ? "🛵 Lahore Delivery"
                            : "📦 Other Cities"}
                      </span>
                    )}
                  </div>,
                  new Date(o.created_at).toLocaleDateString(),
                  money(o.total),
                  <Status value={o.status} />,
                  <Status value={o.payment_status} />,
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setActiveOrderId(o.id)}
                  >
                    View order
                  </button>,
                  ...(isAdmin
                    ? [
                        <button
                          type="button"
                          className="btn compact danger-button icon-only"
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
          <div className="pagination">
            <button
              className="btn compact"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} · {data.total} orders
            </span>
            <button
              className="btn compact"
              disabled={page * 50 >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
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
    </>
  );
}
function OrderDetail({ id, user }: { id: string; user: User }) {
  const { data: o, error, loading, reload } = useData("manage/orders/" + id),
    [note, setNote] = useState(""),
    [next, setNext] = useState(""),
    [decision, setDecision] = useState<any>(null);
  const admin = user.role === "SUPER_ADMIN",
    canUpdate = admin || user.permissions.includes("orders.update");
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
          <div className="checkout-grid">
            <div className="panel receipt-panel">
              <OrderReceipt o={o} />
              <ReceiptButtons order={o} />
            </div>
            <div className="stack no-print">
              <div className="panel stack">
                <h3>Payment verification</h3>
                <Status value={o.payment_status} />
                <Status value={o.ocr_status} />
                <p>{o.ocr_message}</p>
                <div>
                  Order total <strong>{money(o.total)}</strong>
                </div>
                <div>
                  Detected amount{" "}
                  <strong>
                    {o.detected_amount === null
                      ? "Unavailable"
                      : money(o.detected_amount)}
                  </strong>
                </div>
                {o.detected_amount !== null && (
                  <div>
                    Difference{" "}
                    <strong>{money(o.detected_amount - o.total)}</strong>
                  </div>
                )}
                {admin && (
                  <a
                    className="btn"
                    href={"/api/proofs/" + o.slip_id}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={16} />
                    View / download payment slip
                  </a>
                )}
                <p className="small-text">
                  OCR is an aid only. Confirm the bank transaction before
                  approving payment.
                </p>
                {o.payment_note && <p>{o.payment_note}</p>}
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
              {canUpdate && transitions[o.status]?.length > 0 && (
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
                            admin ||
                            [
                              "PROCESSING",
                              "READY",
                              "SHIPPED",
                              "DELIVERED",
                            ].includes(s),
                        )
                        .map((s) => ({ value: s, label: statuses[s] })),
                    ]}
                  />
                  <button
                    className="btn primary"
                    disabled={!next || next === "none"}
                    onClick={() =>
                      setDecision({
                        action: "status",
                        status: next,
                        label: statuses[next],
                      })
                    }
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
              <Field label="Site Title">
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
              <Field label="Campus Pickup Fee (Rs.)">
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
              <Field label="Lahore Delivery Fee (Rs.)">
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
              <Field label="Other City Delivery Fee (Rs.)">
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
            s.last_order ? new Date(s.last_order).toLocaleDateString() : "—",
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
