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
  Minus,
  Pencil,
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
  Receipt,
  Banknote,
  ClipboardList,
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
  getStudentRefundWhatsAppUrl,
  getVendorPendingBooksWhatsAppMessage,
  getVendorPendingBooksWhatsAppUrl,
  isCampusOrder,
  isLahoreOrder,
  type User,
  type Vendor,
  type VendorPayment,
  type VendorLedger,
  type VendorLedgerSummary,
  type Book,
  type StoreSettings,
} from "@/lib/contracts";
const Charts = dynamic(() => import("./report-charts"), {
  loading: () => <Loading />,
});
const nav = [
  ["dashboard", "Overview", LayoutDashboard, "reports.read"],
  ["orders", "Orders", ShoppingBag, "orders.read"],
  ["ledger", "Payment Ledger", Receipt, "vendor"],
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

export function notifyOrdersUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("orders-updated"));
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("bookstore-orders-sync");
        bc.postMessage("updated");
        bc.close();
      }
    } catch {}
  }
}

export function syncTabBranding(storeName?: string, logoUrl?: string | null) {
  if (typeof document === "undefined") return;
  const targetUrl = logoUrl && logoUrl.trim() ? logoUrl.trim() : "/favicon.svg";
  const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  if (!links || links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = targetUrl;
    document.head.appendChild(link);
  } else {
    links.forEach((link) => {
      link.href = targetUrl;
    });
  }
}

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
  logoUrl = null,
}: {
  portal: "admin" | "campus" | "vendor";
  logoUrl?: string | null;
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
    syncTabBranding(storeName, logoUrl);
  }, [logoUrl, storeName]);

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
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={storeName}
              className="brand-logo-img"
              style={{
                height: 38,
                maxHeight: 44,
                width: "auto",
                maxWidth: 150,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : (
            <BookOpen />
          )}
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
  logoUrl = null,
}: {
  user: User;
  section?: string;
  record?: string;
  pendingOrders?: number;
  logoUrl?: string | null;
  storeName?: string;
}) {
  const isAdmin = user.role === "SUPER_ADMIN",
    isVendor = user.role === "VENDOR",
    base = isAdmin ? "/admin" : isVendor ? "/vendor" : "/campus";
  const title = nav.find((n) => n[0] === section)?.[1] || "Overview";
  const [pendingCount, setPendingCount] = useState(pendingOrders);
  const [currentStoreName, setCurrentStoreName] = useState(storeName);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(logoUrl ?? null);

  useEffect(() => {
    setCurrentStoreName(storeName);
    setCurrentLogoUrl(logoUrl ?? null);
  }, [storeName]);

  useEffect(() => {
    syncTabBranding(currentStoreName, currentLogoUrl);
  }, [currentLogoUrl, currentStoreName]);

  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.store_name) {
        setCurrentStoreName(e.detail.store_name);
      }
      if (e.detail?.logo_url !== undefined) {
        setCurrentLogoUrl(e.detail.logo_url || null);
        syncTabBranding(e.detail.store_name || currentStoreName, e.detail.logo_url);
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

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("bookstore-orders-sync");
        bc.onmessage = () => {
          void refresh();
        };
      }
    } catch {}

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("orders-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
      bc?.close();
    };
  }, [isAdmin, user.must_change]);
  return (
    <SidebarProvider className="portal-shell">
      <Sidebar className="no-print">
        <SidebarHeader>
          <a
            className="brand portal-brand"
            href={base + "/dashboard"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt={currentStoreName}
                className="portal-brand-logo"
                style={{
                  height: 30,
                  maxHeight: 34,
                  width: "auto",
                  maxWidth: 90,
                  objectFit: "contain",
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              />
            ) : (
              <BookOpen size={20} style={{ flexShrink: 0 }} />
            )}
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
                  return (
                    n[0] === "dashboard" ||
                    n[0] === "orders" ||
                    n[0] === "ledger" ||
                    n[0] === "profile"
                  );
                }
                if (n[0] === "ledger") return false;
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
              const portal = isVendor ? "vendor" : isAdmin ? "admin" : "campus";
              await api("logout", { portal });
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
          ) : isVendor && section === "dashboard" ? (
            <VendorDashboard user={user} base={base} />
          ) : isVendor && section === "ledger" ? (
            <VendorLedgerView user={user} />
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
  const [actualCourierCharges, setActualCourierCharges] = useState<string>(
    order.actual_courier_charges !== undefined &&
      order.actual_courier_charges !== null &&
      Number(order.actual_courier_charges) > 0
      ? String(order.actual_courier_charges)
      : "",
  );
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
    const parsedCharges = actualCourierCharges.trim()
      ? parseFloat(actualCourierCharges)
      : 0;
    try {
      await api("manage/orders/" + order.id, {
        action: "courier",
        courier_name: courierName.trim(),
        courier_tracking_id: trackingId.trim(),
        status: deliveryStatus,
        actual_courier_charges:
          isNaN(parsedCharges) || parsedCharges < 0 ? 0 : parsedCharges,
      });
      toast.success(
        deliveryStatus === "DELIVERED"
          ? "Courier tracking saved & order marked as Delivered ✓"
          : "Courier tracking details saved successfully!",
      );
      notifyOrdersUpdated();
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
      notifyOrdersUpdated();
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
              background: "var(--status-warn-bg)",
              border: "1px solid var(--status-warn-border)",
              color: "var(--status-warn-text)",
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

          <div>
            <label
              className="field-label"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              <span>Actual Courier Delivery Charges (Rs.)</span>
              <span
                style={{
                  fontSize: "0.76rem",
                  color: "var(--muted-foreground)",
                  fontWeight: "normal",
                }}
              >
                Optional · Internal Ledger / Khata
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.85rem",
                  color: "var(--muted-foreground)",
                  fontWeight: 600,
                }}
              >
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="1"
                className="input full-width"
                placeholder="e.g. 380, 420, 650 (added to vendor khata)"
                value={actualCourierCharges}
                onChange={(e) => setActualCourierCharges(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
            <p
              className="small-text muted"
              style={{ margin: "5px 0 0", fontSize: "0.78rem", lineHeight: 1.4 }}
            >
              🔒 <strong>Confidential (Vendor Ledger Only):</strong> Courier charges added directly to vendor khata. Customer / student will <u>never</u> see this amount.
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
      notifyOrdersUpdated();
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
                background: "var(--status-good-bg)",
                border: "1px solid var(--status-good-border)",
                color: "var(--status-good-text)",
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
                background: isOther ? "var(--status-info-bg)" : "var(--status-warn-bg)",
                border: `1px solid ${isOther ? "var(--status-info-border)" : "var(--status-warn-border)"}`,
                color: isOther ? "var(--status-info-text)" : "var(--status-warn-text)",
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
      notifyOrdersUpdated();
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
                background: "var(--status-good-bg)",
                border: "1px solid var(--status-good-border)",
                color: "var(--status-good-text)",
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
                background: "var(--status-good-bg)",
                border: "1px solid var(--status-good-border)",
                fontSize: "0.83rem",
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--status-good-text)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={14} /> Verified Student Orders Only
              </div>
              <div style={{ color: "var(--status-good-text)", opacity: 0.9 }}>
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
                        background: "var(--status-info-bg)",
                        color: "var(--status-info-text)",
                        border: "1px solid var(--status-info-border)",
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

function VendorOrderBooksPanel({
  o,
  onUpdated,
}: {
  o: any;
  onUpdated?: () => Promise<void> | void;
}) {
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const items: any[] = (o?.items || []).filter((it: any) => !it.in_office_stock);
  const printItems = items.filter((it: any) => !it.is_unavailable);
  const unavailableItems = items.filter((it: any) => Boolean(it.is_unavailable));
  const totalBooks = printItems.reduce((s: number, it: any) => s + (it.quantity || 1), 0);
  const totalPages = printItems.reduce(
    (s: number, it: any) => s + (Number(it.pages) || 0) * (it.quantity || 1),
    0,
  );

  const isCampus =
    o?.delivery_type === "campus" ||
    (o?.city && o.city.toLowerCase().includes("campus")) ||
    (o?.address && o.address.toLowerCase().includes("campus"));
  const isOther =
    o?.delivery_type === "other" ||
    (!isCampus && o?.city && !o.city.toLowerCase().includes("lahore"));

  const handleToggleUnavailable = async (itemId: string, unavailable: boolean) => {
    setTogglingItemId(itemId);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "toggle_item_unavailable",
        item_id: itemId,
        unavailable,
      });
      toast.success(
        unavailable
          ? "Book marked as out of stock / cannot print"
          : "Book restored as available",
      );
      notifyOrdersUpdated();
      await onUpdated?.();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTogglingItemId(null);
    }
  };

  return (
    <div className="panel stack" style={{ gap: 14 }}>
      {/* Student & Destination summary */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 14px",
          borderRadius: 8,
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)", fontWeight: 700 }}>
              Student / Customer
            </span>
            <div style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--foreground)", marginTop: 2 }}>
              {o?.name || "Customer"}
            </div>
            {o?.phone && (
              <div style={{ fontSize: "0.84rem", color: "var(--muted-foreground)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <span>📱 {o.phone}</span>
              </div>
            )}
          </div>
          <div>
            <span
              className="mono-pill"
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "3px 8px",
                background: isCampus
                  ? "var(--status-info-bg)"
                  : isOther
                    ? "var(--status-warn-bg)"
                    : "var(--status-good-bg)",
                color: isCampus ? "var(--status-info-text)" : isOther ? "var(--status-warn-text)" : "var(--status-good-text)",
                border: `1px solid ${isCampus ? "var(--status-info-border)" : isOther ? "var(--status-warn-border)" : "var(--status-good-border)"}`,
              }}
            >
              {isCampus
                ? "🏛️ Qanchi Campus (Pickup)"
                : isOther
                  ? `📦 ${o?.city || "Other City"} (Courier)`
                  : "🛵 Lahore Route"}
            </span>
          </div>
        </div>

        {o?.address && !isCampus && (
          <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
            <strong>Delivery Address: </strong>
            <span>{o.address}{o.city ? `, ${o.city}` : ""}</span>
          </div>
        )}
      </div>

      {/* Ordered Books list */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={16} style={{ color: "var(--primary)" }} />
            <h3 style={{ margin: 0, fontSize: "0.96rem" }}>Ordered Books to Print</h3>
          </div>
          <span
            className="mono-pill"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              background: "var(--status-info-bg)",
              color: "var(--status-info-text)",
              border: "1px solid var(--status-info-border)",
            }}
          >
            {totalBooks} {totalBooks === 1 ? "book" : "books"} to print
          </span>
        </div>

        {printItems.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px 16px", textAlign: "center", fontSize: "0.85rem", color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 8, border: "1px dashed var(--border)" }}>
            {unavailableItems.length > 0
              ? "All books in this order are marked out of stock / cannot print."
              : "No books to print for this order."}
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", fontWeight: 600, width: "36px", color: "var(--muted-foreground)" }}>#</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Code</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600 }}>Book Title</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Pages</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "center", width: "60px" }}>Qty</th>
                  <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "center", width: "130px" }}>Print Status</th>
                </tr>
              </thead>
              <tbody>
                {printItems.map((it: any, idx: number) => {
                  return (
                    <tr
                      key={it.id || it.code || idx}
                      style={{
                        borderBottom: idx < printItems.length - 1 ? "1px solid var(--border)" : "none",
                        background: idx % 2 === 0 ? "transparent" : "var(--muted)",
                      }}
                    >
                      <td style={{ padding: "9px 10px", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                        <span
                          className="mono-pill"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.78rem",
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {it.code}
                        </span>
                      </td>
                      <td style={{ padding: "9px 10px", fontWeight: 500, color: "var(--foreground)" }}>
                        <div>{it.title}</div>
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "right", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
                        {it.pages ? `${it.pages} p.` : "—"}
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "center" }}>
                        <span
                          className="mono-pill"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            background: "var(--status-info-bg)",
                            color: "var(--status-info-text)",
                            border: "1px solid var(--status-info-border)",
                            padding: "2px 7px",
                          }}
                        >
                          ×{it.quantity || 1}
                        </span>
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          className="btn outline compact"
                          disabled={togglingItemId === it.id}
                          onClick={async () => {
                            if (!window.confirm(`Cannot print "${it.code} - ${it.title}"?\n\nThis will remove the book from your printing queue, deduct its cost from your earnings, and update the student refund.`)) return;
                            await handleToggleUnavailable(it.id, true);
                          }}
                          style={{
                            fontSize: "0.72rem",
                            padding: "2px 7px",
                            color: "#b91c1c",
                            borderColor: "#fca5a5",
                            background: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                          title="Mark book as unavailable / cannot print"
                        >
                          <XCircle size={12} /> Cannot Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--muted)", borderTop: "1px solid var(--border)", fontWeight: 600, fontSize: "0.82rem" }}>
                  <td colSpan={3} style={{ padding: "8px 10px" }}>
                    Total to Print:
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--foreground)" }}>
                    {totalPages > 0 ? `${totalPages.toLocaleString()} pages` : "—"}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--status-info-text)", fontWeight: 700 }}>
                    {totalBooks}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center", fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                    —
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {unavailableItems.length > 0 && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(254, 242, 242, 0.5)",
              border: "1px dashed #fca5a5",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#991b1b" }}>
                  ❌ Marked Out of Stock / Cannot Print ({unavailableItems.length})
                </span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                Excluded from your printing bill
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unavailableItems.map((it: any, idx: number) => {
                return (
                  <div
                    key={it.id || it.code || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "#fff",
                      border: "1px solid #fecaca",
                      fontSize: "0.82rem",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
                      <span
                        className="mono-pill"
                        style={{
                          fontWeight: 700,
                          fontSize: "0.74rem",
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "1px solid #fca5a5",
                          textDecoration: "line-through",
                        }}
                      >
                        {it.code}
                      </span>
                      <span
                        style={{
                          fontWeight: 500,
                          color: "#991b1b",
                          textDecoration: "line-through",
                        }}
                      >
                        {it.title}
                      </span>
                      <span style={{ color: "var(--muted-foreground)", fontSize: "0.74rem" }}>
                        ×{it.quantity || 1}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        className="btn compact"
                        disabled={togglingItemId === it.id}
                        onClick={async () => {
                          if (!window.confirm(`Undo and restore "${it.code} - ${it.title}" for printing?\n\nThis will re-add this book to your printing queue and bill.`)) return;
                          await handleToggleUnavailable(it.id, false);
                        }}
                        style={{ fontSize: "0.72rem", padding: "2px 7px", display: "inline-flex", alignItems: "center", gap: 3 }}
                        title="Restore book for printing"
                      >
                        <RotateCcw size={11} /> Undo / Can Print
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function ChangeDeliveryTypeModal({
  order,
  onClose,
  onSaved,
}: {
  order: any;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}) {
  const currentType =
    order.delivery_type === "campus"
      ? "campus"
      : order.delivery_type === "other"
        ? "other"
        : "lahore";
  const [deliveryType, setDeliveryType] = useState<string>(currentType);
  const [address, setAddress] = useState<string>(order.address || "");
  const [city, setCity] = useState<string>(order.city || (currentType === "other" ? "" : "Lahore"));
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`manage/orders/${order.id}`, {
        action: "change_delivery_type",
        delivery_type: deliveryType,
        address: deliveryType === "campus" ? "Pickup from Bookstore Office, VU Qanchi Campus Lahore" : address,
        city: deliveryType === "other" ? (city || "Other City") : "Lahore",
        note,
      });
      toast.success("Delivery type updated successfully ✓");
      notifyOrdersUpdated();
      if (onSaved) await onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem" }}>
              <Truck size={18} style={{ color: "var(--primary)" }} /> Change Delivery Type
            </DialogTitle>
            <button type="button" className="btn-icon" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
          <DialogDescription style={{ fontSize: "0.84rem", marginTop: 4 }}>
            Update fulfillment delivery method for order <strong>{order.reference || order.id}</strong> ({order.name}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              background: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(37, 99, 235, 0.25)",
              fontSize: "0.82rem",
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: "var(--primary)" }}>💳 Advance Payment Invariant:</strong>
            <p style={{ margin: "2px 0 0", color: "var(--foreground)" }}>
              The student has already paid advance payment of <strong>{money(order.total)}</strong>.
              Order total, subtotal, and payment balance will remain completely identical.
            </p>
          </div>

          <Field label="Select New Delivery Type">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: deliveryType === "campus" ? "2px solid var(--primary)" : "1px solid var(--border)",
                  background: deliveryType === "campus" ? "rgba(37, 99, 235, 0.06)" : "var(--card)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="deliveryType"
                  value="campus"
                  checked={deliveryType === "campus"}
                  onChange={() => setDeliveryType("campus")}
                />
                <div>
                  <strong>🏛️ Qanchi Campus (Pickup)</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Student will collect books directly from Bookstore Office at Qanchi Campus.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: deliveryType === "lahore" ? "2px solid var(--primary)" : "1px solid var(--border)",
                  background: deliveryType === "lahore" ? "rgba(37, 99, 235, 0.06)" : "var(--card)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="deliveryType"
                  value="lahore"
                  checked={deliveryType === "lahore"}
                  onChange={() => setDeliveryType("lahore")}
                />
                <div>
                  <strong>🛵 Lahore Route (Home Delivery)</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Rider will deliver parcel to student address within Lahore city route.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 6,
                  border: deliveryType === "other" ? "2px solid var(--primary)" : "1px solid var(--border)",
                  background: deliveryType === "other" ? "rgba(37, 99, 235, 0.06)" : "var(--card)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="deliveryType"
                  value="other"
                  checked={deliveryType === "other"}
                  onChange={() => setDeliveryType("other")}
                />
                <div>
                  <strong>📦 Parcels (Courier Dispatch)</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                    Bookstore / Vendor will ship via external courier service (TCS, Leopards, Trax).
                  </div>
                </div>
              </label>
            </div>
          </Field>

          {deliveryType !== "campus" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="City">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={deliveryType === "lahore" ? "Lahore" : "Enter destination city"}
                  required
                />
              </Field>
              <Field label="Street Address">
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full street address for delivery"
                  required
                />
              </Field>
            </div>
          )}

          <Field label="Reason / Note (Optional)">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Student requested campus pickup over phone call"
            />
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? "Saving…" : "Save Delivery Type"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminOrderBooksPanel({
  o,
  user,
  onUpdated,
}: {
  o: any;
  user: User;
  onUpdated: () => Promise<void> | void;
}) {
  const admin = user.role === "SUPER_ADMIN";
  const canUpdate = admin || user.permissions?.includes("orders.update");
  const isPrinted = !!o.vendor_printed_at;
  const isLockedStatus = [
    "PRINTED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REJECTED",
    "REFUND_REQUESTED",
  ].includes(o.status);
  const canEdit = canUpdate && (!isPrinted || admin) && !isLockedStatus;

  const [isEditing, setIsEditing] = useState(false);
  const [itemsDraft, setItemsDraft] = useState<any[]>([]);
  const [editNote, setEditNote] = useState("");
  const [editReasonCategory, setEditReasonCategory] = useState("Out of Print / Market Unavailable");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [changeDeliveryOpen, setChangeDeliveryOpen] = useState(false);

  const isCampus =
    o?.delivery_type === "campus" ||
    (o?.city && o.city.toLowerCase().includes("campus")) ||
    (o?.address && o.address.toLowerCase().includes("campus"));
  const isOther =
    o?.delivery_type === "other" ||
    (!isCampus && o?.city && !o.city.toLowerCase().includes("lahore"));

  const toggleItemUnavailable = async (itemId: string, unavailable: boolean) => {
    setTogglingItemId(itemId);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "toggle_item_unavailable",
        item_id: itemId,
        unavailable,
      });
      toast.success(
        unavailable
          ? "Book marked as out of stock / unavailable. Bill updated & student refund generated."
          : "Book restored as available. Total bill updated."
      );
      notifyOrdersUpdated();
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTogglingItemId(null);
    }
  };

  const toggleItemOfficeStock = async (itemId: string, inOfficeStock: boolean) => {
    setTogglingItemId(itemId);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "toggle_item_office_stock",
        item_id: itemId,
        in_office_stock: inOfficeStock,
      });
      toast.success(
        inOfficeStock
          ? "Book marked as In Office Stock (fulfilled from shelf, vendor print skipped) ✓"
          : "Book reverted to Vendor Printing ✓"
      );
      notifyOrdersUpdated();
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTogglingItemId(null);
    }
  };

  const toggleItemReceived = async (itemId: string, received: boolean) => {
    setTogglingItemId(itemId);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "toggle_item_received",
        item_id: itemId,
        received,
      });
      toast.success(received ? "Book marked received from vendor ✓" : "Book marked pending from vendor");
      notifyOrdersUpdated();
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTogglingItemId(null);
    }
  };

  const setAllItemsReceived = async (received: boolean) => {
    setTogglingItemId("ALL");
    try {
      await api(`manage/orders/${o.id}`, {
        action: "set_all_items_received",
        received,
      });
      toast.success(received ? "All books marked received from vendor ✓" : "All books marked pending from vendor");
      notifyOrdersUpdated();
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setTogglingItemId(null);
    }
  };

  const rawItems: any[] = o?.items || [];
  const totalBooks = rawItems.reduce(
    (sum: number, it: any) => sum + (it.quantity || 1),
    0,
  );
  const totalPages = rawItems.reduce(
    (sum: number, it: any) => sum + (Number(it.pages) || 0) * (it.quantity || 1),
    0,
  );

  const startEditing = () => {
    setItemsDraft(
      rawItems.map((it: any) => ({
        id: it.id,
        code: it.code,
        title: it.title,
        pages: it.pages,
        unit_price: Number(it.unit_price) || 0,
        quantity: Number(it.quantity) || 1,
      })),
    );
    setEditNote("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setItemsDraft([]);
    setEditNote("");
  };

  const updateQuantity = (id: string, delta: number) => {
    setItemsDraft((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const nextQty = Math.max(1, Math.min(100, (Number(it.quantity) || 1) + delta));
        return { ...it, quantity: nextQty };
      }),
    );
  };

  const setDirectQuantity = (id: string, val: number) => {
    const nextQty = Math.max(1, Math.min(100, isNaN(val) ? 1 : val));
    setItemsDraft((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: nextQty } : it)),
    );
  };

  const removeItem = (id: string) => {
    if (itemsDraft.length <= 1) {
      toast.error(
        "Order must contain at least 1 book. If removing all books, please cancel or reject the order instead.",
      );
      return;
    }
    setItemsDraft((prev) => prev.filter((it) => it.id !== id));
  };

  const draftSubtotal = itemsDraft.reduce(
    (sum, it) => sum + it.unit_price * it.quantity,
    0,
  );
  const deliveryFee = Number(o?.delivery) || 0;
  const draftTotal = draftSubtotal + deliveryFee;
  const draftBooksCount = itemsDraft.reduce((sum, it) => sum + it.quantity, 0);

  const hasChanges = (() => {
    if (itemsDraft.length !== rawItems.length) return true;
    for (const d of itemsDraft) {
      const orig = rawItems.find((r: any) => r.id === d.id);
      if (!orig || orig.quantity !== d.quantity) return true;
    }
    return false;
  })();

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await api(`manage/orders/${o.id}`, {
        action: "edit_items",
        items: itemsDraft.map((it) => ({
          id: it.id,
          quantity: it.quantity,
        })),
        note: (editReasonCategory && editReasonCategory !== "OTHER" && !editNote.includes(editReasonCategory)
          ? `${editReasonCategory} - ${editNote.trim()}`
          : editNote.trim()) || editReasonCategory,
      });
      toast.success(res.message || "Order items and total updated successfully ✓");
      notifyOrdersUpdated();
      setIsEditing(false);
      setConfirmOpen(false);
      await onUpdated();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="panel stack admin-order-books-panel"
      style={{
        borderRadius: 10,
        border: isEditing ? "2px solid #2563eb" : "1px solid var(--border)",
        background: "var(--card)",
        padding: "16px",
        position: "relative",
        transition: "border-color 0.2s ease",
      }}
    >
      {/* Student & Delivery Summary Bar with Change Delivery Type */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--muted)",
          border: "1px solid var(--border)",
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <div>
          <span style={{ fontSize: "0.70rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)", fontWeight: 700 }}>
            Student / Customer
          </span>
          <div style={{ fontSize: "0.96rem", fontWeight: 700, color: "var(--foreground)" }}>
            {o?.name || "Customer"}{o?.phone ? ` · 📱 ${o.phone}` : ""}
          </div>
          {o?.address && !isCampus && (
            <div style={{ fontSize: "0.80rem", color: "var(--muted-foreground)", marginTop: 2 }}>
              <span>📍 {o.address}{o.city ? `, ${o.city}` : ""}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {Number(o?.refund_due || 0) > 0 && (
            <span
              className="mono-pill"
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                padding: "4px 9px",
                background: "#fee2e2",
                color: "#b91c1c",
                border: "1.5px solid #ef4444",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title={`Student paid advance. Overpayment to return: ${money(o.refund_due)}`}
            >
              💸 RETURN TO STUDENT: {money(o.refund_due)}
            </span>
          )}
          <span
            className="mono-pill"
            style={{
              fontSize: "0.74rem",
              fontWeight: 600,
              padding: "4px 9px",
              background: isCampus
                ? "var(--status-info-bg)"
                : isOther
                  ? "var(--status-warn-bg)"
                  : "var(--status-good-bg)",
              color: isCampus ? "var(--status-info-text)" : isOther ? "var(--status-warn-text)" : "var(--status-good-text)",
              border: `1px solid ${isCampus ? "var(--status-info-border)" : isOther ? "var(--status-warn-border)" : "var(--status-good-border)"}`,
            }}
          >
            {isCampus
              ? "🏛️ Qanchi Campus (Pickup)"
              : isOther
                ? `📦 ${o?.city || "Parcels"} (Courier)`
                : "🛵 Lahore Route"}
          </span>
          {canUpdate && (
            <button
              type="button"
              className="btn compact"
              onClick={() => setChangeDeliveryOpen(true)}
              style={{
                fontSize: "0.74rem",
                padding: "3px 9px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
              }}
              title="Change Delivery Type (e.g. Lahore Route ↔ Campus Pickup ↔ Parcels)"
            >
              <Pencil size={11} /> Change Delivery Type
            </button>
          )}
        </div>
      </div>

      {changeDeliveryOpen && (
        <ChangeDeliveryTypeModal
          order={o}
          onClose={() => setChangeDeliveryOpen(false)}
          onSaved={onUpdated}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(37, 99, 235, 0.12)",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={17} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Ordered Books
              </h3>
              <span
                className="mono-pill"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: "rgba(37, 99, 235, 0.12)",
                  color: "#1d4ed8",
                }}
              >
                {isEditing ? draftBooksCount : totalBooks}{" "}
                {(isEditing ? draftBooksCount : totalBooks) === 1 ? "book" : "books"}
              </span>
              {!isEditing && totalBooks > 0 && (() => {
                const rcvCount = rawItems.filter((it: any) => it.received_from_vendor).reduce((s: number, it: any) => s + (it.quantity || 1), 0);
                const isAllRcvd = rcvCount === totalBooks;
                const isPartRcvd = rcvCount > 0 && rcvCount < totalBooks;
                return (
                  <span
                    className="mono-pill"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: isAllRcvd
                        ? "rgba(22, 163, 74, 0.15)"
                        : isPartRcvd
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(100, 116, 139, 0.12)",
                      color: isAllRcvd
                        ? "#15803d"
                        : isPartRcvd
                          ? "#b45309"
                          : "var(--muted-foreground)",
                      border: isAllRcvd
                        ? "1px solid #86efac"
                        : isPartRcvd
                          ? "1px solid #fde68a"
                          : "1px solid var(--border)",
                    }}
                    title={`${rcvCount} of ${totalBooks} books delivered by vendor`}
                  >
                    {isAllRcvd
                      ? `All ${totalBooks} Books Received ✓`
                      : isPartRcvd
                        ? `Partially Received (${rcvCount}/${totalBooks} Books · ${totalBooks - rcvCount} Pending from Vendor)`
                        : `0/${totalBooks} Received (Pending from Vendor)`}
                  </span>
                );
              })()}
            </div>
            <p className="small-text muted" style={{ margin: "2px 0 0" }}>
              {isEditing
                ? "Adjust quantity or exclude books. Totals update in real-time."
                : `${totalPages > 0 ? `${totalPages.toLocaleString()} pages · ` : ""}Subtotal: ${money(o.subtotal || 0)}`}
            </p>
          </div>
        </div>

        <div>
          {isEditing ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                type="button"
                className="btn compact"
                disabled={saving}
                onClick={cancelEditing}
              >
                <X size={14} /> Discard
              </button>
              <button
                type="button"
                className="btn compact primary"
                disabled={saving || !hasChanges}
                onClick={() => setConfirmOpen(true)}
                style={{ background: "#2563eb" }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          ) : canEdit ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {canUpdate && totalBooks > 1 && (
                <>
                  <button
                    type="button"
                    className="btn compact"
                    style={{ fontSize: "0.74rem", padding: "3px 8px" }}
                    disabled={!!togglingItemId}
                    onClick={() => setAllItemsReceived(true)}
                    title="Mark all books in this order as received from vendor"
                  >
                    <CheckCircle2 size={12} /> Mark All Received
                  </button>
                  <button
                    type="button"
                    className="btn compact"
                    style={{ fontSize: "0.74rem", padding: "3px 8px" }}
                    disabled={!!togglingItemId}
                    onClick={() => setAllItemsReceived(false)}
                    title="Reset all books in this order to pending from vendor"
                  >
                    <RotateCcw size={11} /> Reset All
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn compact"
                onClick={startEditing}
                title="Edit quantities or exclude books"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                }}
              >
                <Pencil size={13} /> Edit Books / Qty
              </button>
            </div>
          ) : (
            <span
              className="mono-pill"
              style={{
                fontSize: "0.72rem",
                color: "var(--muted-foreground)",
                background: "var(--muted)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isPrinted ? "🔒 Printed by Vendor" : `🔒 Locked (${o.status})`}
            </span>
          )}
        </div>
      </div>

      {/* Edit Mode Notice Banner */}
      {isEditing && (
        <div
          style={{
            padding: "9px 12px",
            borderRadius: 6,
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            fontSize: "0.82rem",
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✏️</span>
          <span>
            <strong>Editing Mode:</strong> Adjust copies using <strong>[-]</strong> and{" "}
            <strong>[+]</strong> or click <strong>🗑️</strong> to remove an accidental book.
          </span>
        </div>
      )}

      {/* Table */}
      {(isEditing ? itemsDraft : rawItems).length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--muted-foreground)",
          }}
        >
          No books found in this order.
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--muted)",
                  borderBottom: "1px solid var(--border)",
                  textAlign: "left",
                }}
              >
                <th
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    width: "32px",
                    color: "var(--muted-foreground)",
                  }}
                >
                  #
                </th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Code</th>
                <th style={{ padding: "8px 10px", fontWeight: 600 }}>Book Title</th>
                <th
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  Price
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    textAlign: "center",
                    width: isEditing ? "130px" : "60px",
                  }}
                >
                  {isEditing ? "Quantity" : "Qty"}
                </th>
                <th
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    textAlign: "right",
                    width: "90px",
                  }}
                >
                  Total
                </th>
                {!isEditing && (
                  <th
                    style={{
                      padding: "8px 10px",
                      fontWeight: 600,
                      textAlign: "center",
                      width: "135px",
                    }}
                  >
                    Vendor Delivery
                  </th>
                )}
                {isEditing && (
                  <th
                    style={{
                      padding: "8px 10px",
                      fontWeight: 600,
                      textAlign: "center",
                      width: "50px",
                    }}
                  >
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(isEditing ? itemsDraft : rawItems).map((it: any, idx: number) => {
                const unitPrice = Number(it.unit_price) || 0;
                const qty = Number(it.quantity) || 1;
                const lineTotal = unitPrice * qty;
                const isUnav = Boolean(it.is_unavailable);

                return (
                  <tr
                    key={it.id || it.code || idx}
                    style={{
                      borderBottom:
                        idx < (isEditing ? itemsDraft : rawItems).length - 1
                          ? "1px solid var(--border)"
                          : "none",
                      background: isUnav ? "#fef2f2" : idx % 2 === 0 ? "transparent" : "var(--muted)",
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 10px",
                        color: "var(--muted-foreground)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <span
                        className="mono-pill"
                        style={{
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {it.code}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 500, color: isUnav ? "#991b1b" : undefined }}>
                      <div style={{ textDecoration: isUnav ? "line-through" : undefined }}>{it.title}</div>
                      {isUnav ? (
                        <span
                          className="mono-pill"
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            background: "#fee2e2",
                            color: "#b91c1c",
                            border: "1px solid #ef4444",
                            marginTop: 2,
                            display: "inline-block",
                          }}
                        >
                          ❌ Out of Stock / Refunded
                        </span>
                      ) : it.in_office_stock ? (
                        <span
                          className="mono-pill"
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#166534",
                            border: "1px solid #86efac",
                            marginTop: 2,
                            display: "inline-block",
                          }}
                        >
                          📦 In Office Stock (Shelf)
                        </span>
                      ) : it.pages ? (
                        <span
                          style={{
                            fontSize: "0.74rem",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          {it.pages} pages
                        </span>
                      ) : null}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {money(unitPrice)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {isEditing ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            background: "var(--card)",
                            padding: "2px 4px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                          }}
                        >
                          <button
                            type="button"
                            className="btn compact icon-only"
                            style={{ width: 24, height: 24, padding: 0 }}
                            onClick={() => updateQuantity(it.id, -1)}
                            disabled={qty <= 1}
                            title="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={qty}
                            onChange={(e) =>
                              setDirectQuantity(it.id, parseInt(e.target.value, 10))
                            }
                            style={{
                              width: 38,
                              textAlign: "center",
                              border: "none",
                              background: "transparent",
                              fontWeight: 700,
                              fontSize: "0.86rem",
                              color: "var(--foreground)",
                            }}
                          />
                          <button
                            type="button"
                            className="btn compact icon-only"
                            style={{ width: 24, height: 24, padding: 0 }}
                            onClick={() => updateQuantity(it.id, 1)}
                            disabled={qty >= 100}
                            title="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="mono-pill"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            background: "rgba(37, 99, 235, 0.12)",
                            color: "#1d4ed8",
                            padding: "2px 7px",
                          }}
                        >
                          ×{qty}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {money(lineTotal)}
                    </td>
                    {!isEditing && (
                      <td style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                        {isUnav ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span
                              className="mono-pill"
                              style={{
                                background: "#fee2e2",
                                color: "#b91c1c",
                                border: "1px solid #ef4444",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                              }}
                            >
                              ❌ OUT OF STOCK
                            </span>
                            {canUpdate && (
                              <button
                                type="button"
                                disabled={togglingItemId === it.id}
                                onClick={async () => {
                                  if (!window.confirm(`Restore "${it.code} - ${it.title}" as available in order?\n\nThis will re-add its price to the student total bill.`)) return;
                                  await toggleItemUnavailable(it.id, false);
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: "0.68rem",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "#fff",
                                  border: "1px solid var(--border)",
                                  cursor: "pointer",
                                }}
                                title="Restore book as available"
                              >
                                <RotateCcw size={10} /> Restore
                              </button>
                            )}
                          </div>
                        ) : it.in_office_stock ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span
                              className="mono-pill"
                              style={{
                                background: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #86efac",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                              }}
                              title="Available in bookstore shelf. Vendor will NOT print it. Student bill unchanged."
                            >
                              📦 IN OFFICE STOCK
                            </span>
                            {canUpdate && (
                              <button
                                type="button"
                                disabled={togglingItemId === it.id}
                                onClick={async () => {
                                  if (!window.confirm(`Revert "${it.code} - ${it.title}" back to Vendor Printing?\n\nThis will send the book to the vendor to print.`)) return;
                                  await toggleItemOfficeStock(it.id, false);
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontSize: "0.68rem",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "#fff",
                                  border: "1px solid var(--border)",
                                  cursor: "pointer",
                                }}
                                title="Send back to vendor for printing"
                              >
                                <RotateCcw size={10} /> Send to Vendor
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <button
                              type="button"
                              disabled={togglingItemId === it.id || !canUpdate}
                              onClick={() => toggleItemReceived(it.id, !it.received_from_vendor)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 9999,
                                cursor: canUpdate ? "pointer" : "default",
                                background: it.received_from_vendor
                                  ? "rgba(22, 163, 74, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                                color: it.received_from_vendor ? "#15803d" : "#b45309",
                                border: it.received_from_vendor
                                  ? "1px solid #86efac"
                                  : "1px solid #fde68a",
                                transition: "all 0.15s ease",
                              }}
                              title={
                                it.received_from_vendor
                                  ? "Received in Campus. Click if this book was missing or misprinted."
                                  : "Missing / Pending from vendor. Click to mark as received in Campus."
                              }
                            >
                              {togglingItemId === it.id ? (
                                "Saving…"
                              ) : it.received_from_vendor ? (
                                <>
                                  <CheckCircle2 size={11} /> Received in Campus ✓
                                </>
                              ) : (
                                <>
                                  <Clock size={11} /> Missing / Shortage ⏳
                                </>
                              )}
                            </button>
                            {canUpdate && (
                              <>
                                <button
                                  type="button"
                                  disabled={togglingItemId === it.id}
                                  onClick={async () => {
                                    if (!window.confirm(`Mark "${it.code} - ${it.title}" as Available in Office Stock?\n\n• Fulfill from bookstore shelf / stock\n• Vendor will NOT print it (vendor cost deducted)\n• Student bill remains full (NO refund issued)`)) return;
                                    await toggleItemOfficeStock(it.id, true);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: "0.68rem",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #86efac",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                  title="Book is already available in bookstore shelf. Skip vendor printing without reducing student bill."
                                >
                                  📦 Office Stock
                                </button>
                                <button
                                  type="button"
                                  disabled={togglingItemId === it.id}
                                  onClick={async () => {
                                    if (!window.confirm(`Mark "${it.code} - ${it.title}" as out of stock / unavailable?\n\nThis will remove it from the bill, generate a student refund, and deduct its printing cost from vendor billing.`)) return;
                                    await toggleItemUnavailable(it.id, true);
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: "0.68rem",
                                    padding: "2px 5px",
                                    borderRadius: 4,
                                    background: "#fff",
                                    color: "#b91c1c",
                                    border: "1px solid #fca5a5",
                                    cursor: "pointer",
                                  }}
                                  title="Book is out of stock / cannot be printed. Deducts price from student bill and vendor billing."
                                >
                                  <XCircle size={10} /> Out of Stock
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                    {isEditing && (
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn compact icon-only danger-button"
                          style={{ width: 26, height: 26, padding: 0 }}
                          onClick={() => removeItem(it.id)}
                          disabled={itemsDraft.length <= 1}
                          title={
                            itemsDraft.length <= 1
                              ? "At least 1 book required"
                              : `Exclude ${it.code} from order`
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: "var(--muted)",
                  borderTop: "1px solid var(--border)",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                }}
              >
                <td colSpan={3} style={{ padding: "8px 10px" }}>
                  Subtotal:
                </td>
                <td
                  colSpan={2}
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    color: "#1d4ed8",
                    fontWeight: 700,
                  }}
                >
                  {isEditing ? draftBooksCount : totalBooks} books
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    textAlign: "right",
                    color: "var(--foreground)",
                    fontWeight: 700,
                  }}
                >
                  {money(isEditing ? draftSubtotal : (o.subtotal || 0))}
                </td>
                {!isEditing && <td />}
                {isEditing && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Recalculation Summary Box when in Editing Mode */}
      {isEditing && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "var(--muted)",
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              Subtotal:
            </span>
            <span style={{ fontSize: "0.9rem" }}>
              {money(o.subtotal || 0)} ➔ <strong>{money(draftSubtotal)}</strong>
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              Delivery charges:
            </span>
            <span style={{ fontSize: "0.9rem" }}>{money(deliveryFee)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 6,
              borderTop: "1px dashed var(--border)",
            }}
          >
            <span
              style={{
                fontSize: "0.92rem",
                fontWeight: 700,
                color: "var(--foreground)",
              }}
            >
              New Grand Total:
            </span>
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "#16a34a",
              }}
            >
              {money(o.total || 0)} ➔ {money(draftTotal)}
            </span>
          </div>

          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "0.80rem", fontWeight: 700, color: "var(--foreground)" }}>
                Reason:
              </span>
              <select
                value={editReasonCategory}
                onChange={(e) => {
                  setEditReasonCategory(e.target.value);
                  if (e.target.value !== "OTHER") {
                    setEditNote(e.target.value);
                  }
                }}
                className="toolbar-search-input"
                style={{
                  fontSize: "0.82rem",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--foreground)",
                  fontWeight: 600,
                }}
              >
                <option value="Out of Print / Market Unavailable">📚 Out of Print / Market Unavailable</option>
                <option value="Student Requested Removal">🙋 Student Requested Removal</option>
                <option value="Defective Print / Damaged by Press">⚠️ Defective Print / Damaged by Press</option>
                <option value="OTHER">✍️ Custom Reason…</option>
              </select>
            </div>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Detailed note / comments (optional)"
              className="toolbar-search-input"
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "0.82rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <button
              type="button"
              className="btn compact"
              disabled={saving}
              onClick={cancelEditing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn compact primary"
              disabled={saving || !hasChanges}
              onClick={() => setConfirmOpen(true)}
              style={{ background: "#2563eb" }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Confirm
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save Order Changes?"
        description={`Order total will update from ${money(o.total || 0)} to ${money(draftTotal)}. The books list, vendor fulfillment, and order history will auto-update.`}
        onConfirm={handleSave}
      />
    </div>
  );
}


function StudentRefundManagementPanel({
  o,
  user,
  onUpdated,
}: {
  o: any;
  user: User;
  onUpdated: () => Promise<void> | void;
}) {
  const isAdmin = user.role === "SUPER_ADMIN" || user.permissions?.includes("orders.update");
  if (!isAdmin || !o) return null;

  const refundDue = Number(o.refund_due || 0);
  const refundAmount = Number(o.refund_amount || 0);
  const isPending = refundDue > 0 || o.refund_status === "REFUND_PENDING";
  const hasRefund = isPending || refundAmount > 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState<string>(refundDue > 0 ? String(refundDue / 100) : "");
  const [method, setMethod] = useState("JazzCash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (refundDue > 0) {
      setAmount(String(refundDue / 100));
    }
  }, [refundDue]);

  if (!hasRefund) return null;

  const handleRecordRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRs = Number(amount);
    if (!cleanRs || isNaN(cleanRs) || cleanRs <= 0) {
      toast.error("Please enter a valid refund amount.");
      return;
    }
    const cleanCents = Math.round(cleanRs * 100);
    setSaving(true);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "record_refund",
        amount: cleanCents,
        method,
        reference,
        note,
      });
      toast.success(`Refund of Rs. ${cleanRs.toLocaleString()} recorded successfully ✓`);
      setModalOpen(false);
      setReference("");
      setNote("");
      notifyOrdersUpdated();
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="panel stack no-print"
      style={{
        border: isPending ? "2px solid #ef4444" : "1px solid #86efac",
        background: isPending
          ? "linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, var(--card) 100%)"
          : "rgba(22, 163, 74, 0.05)",
        padding: "16px",
        borderRadius: 10,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isPending ? "rgba(239, 68, 68, 0.15)" : "rgba(22, 163, 74, 0.15)",
              color: isPending ? "#dc2626" : "#15803d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Banknote size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: isPending ? "#dc2626" : "#15803d" }}>
              {isPending ? "Student Advance Refund Pending" : "Student Refund Settled ✓"}
            </h4>
            <p className="small-text muted" style={{ margin: "2px 0 0" }}>
              {isPending
                ? "Books were cancelled/adjusted. Return excess advance payment to student."
                : `Refund of ${money(refundAmount)} was processed to student.`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {isPending && (
            <button
              type="button"
              className="btn primary compact"
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
              onClick={() => {
                setAmount(String(refundDue / 100));
                setModalOpen(true);
              }}
            >
              <Send size={13} /> Record Refund to Student
            </button>
          )}
          {o.phone && (
            <a
              href={getStudentRefundWhatsAppUrl(
                o,
                refundDue > 0 ? refundDue : refundAmount,
                method || "JazzCash / EasyPaisa",
                reference || "",
                o.refund_note || ""
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn compact"
              style={{
                background: "#25D366",
                borderColor: "#25D366",
                color: "#fff",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                textDecoration: "none",
              }}
              title="Send automated refund receipt & message to student on WhatsApp"
            >
              <MessageCircle size={13} /> WhatsApp Refund Notice
            </a>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          background: "var(--muted)",
          padding: "10px 14px",
          borderRadius: 8,
        }}
      >
        <div>
          <span className="small-text muted">Refund Due:</span>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: isPending ? "#dc2626" : "var(--foreground)" }}>
            {money(refundDue)}
          </div>
        </div>
        <div>
          <span className="small-text muted">Total Refunded:</span>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#15803d" }}>
            {money(refundAmount)}
          </div>
        </div>
        <div>
          <span className="small-text muted">Refund Status:</span>
          <div>
            <span
              className="mono-pill"
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                background: isPending ? "rgba(239, 68, 68, 0.15)" : "rgba(22, 163, 74, 0.15)",
                color: isPending ? "#dc2626" : "#15803d",
              }}
            >
              {isPending ? "REFUND PENDING" : "REFUNDED ✓"}
            </span>
          </div>
        </div>
        {o.refund_paid_at && (
          <div>
            <span className="small-text muted">Paid At:</span>
            <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              {formatDateDMY(o.refund_paid_at)}
            </div>
          </div>
        )}
      </div>

      {o.refund_note && (
        <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", background: "var(--card)", padding: "6px 10px", borderRadius: 6 }}>
          <strong>Refund Note:</strong> {o.refund_note}
        </div>
      )}

      {/* Record Refund Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent style={{ maxWidth: 450 }}>
          <DialogHeader>
            <DialogTitle>Record Student Refund</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordRefund} className="stack" style={{ gap: 14 }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Refund Amount (Rs.)</label>
              <input
                type="number"
                min={1}
                required
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Payment Method</label>
              <select
                className="input"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              >
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Meezan Bank">Meezan Bank</option>
                <option value="Bank Transfer">Bank Transfer (Other)</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Transaction ID / Ref (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TID-9823412 or bank receipt #"
                className="input"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Pak301 unavailable, sent to student phone"
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: "100%", marginTop: 4 }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button type="button" className="btn compact" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary compact" disabled={saving} style={{ background: "#dc2626" }}>
                {saving ? "Recording…" : "Confirm Refund"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuperAdminDueManagementPanel({
  o,
  user,
  onUpdated,
}: {
  o: any;
  user: User;
  onUpdated: () => Promise<void> | void;
}) {
  const isAdmin = user.role === "SUPER_ADMIN";
  if (!isAdmin || !o) return null;

  const total = Number(o.total || 0);
  const amountPaid = Number(o.amount_paid || 0);
  const dueAmount = Number(o.due_amount || 0);
  const isDuePending = dueAmount > 0;

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordAmount, setRecordAmount] = useState<string>("");
  const [recordNote, setRecordNote] = useState("");
  const [recording, setRecording] = useState(false);

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(o.due_note || "");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNoteDraft(o.due_note || "");
    if (dueAmount > 0) {
      setRecordAmount(String(dueAmount / 100));
    }
  }, [o.due_note, dueAmount]);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "update_due_note",
        due_note: noteDraft,
      });
      toast.success("Private due note saved.");
      setEditingNote(false);
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSavingNote(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRupees = Number(recordAmount);
    if (!cleanRupees || isNaN(cleanRupees) || cleanRupees <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }
    const cleanCents = Math.round(cleanRupees * 100);
    setRecording(true);
    try {
      await api(`manage/orders/${o.id}`, {
        action: "record_due_payment",
        amount: cleanCents,
        note: recordNote,
      });
      toast.success("Payment collected and recorded!");
      setRecordOpen(false);
      setRecordNote("");
      await onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setRecording(false);
    }
  };

  const paymentLogs: any[] = o.payment_logs || [];

  return (
    <div
      className="panel stack no-print"
      style={{
        border: isDuePending
          ? "1.5px solid var(--status-warn-border)"
          : "1px solid var(--border)",
        background: isDuePending
          ? "linear-gradient(180deg, var(--status-warn-bg) 0%, var(--card) 100%)"
          : "var(--card)",
        padding: "16px",
        borderRadius: 10,
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Coins
            size={20}
            style={{ color: isDuePending ? "var(--status-warn-text)" : "var(--status-good-text)" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Due Balance & Margin Management
              </h3>
              <span
                className="mono-pill"
                style={{
                  fontSize: "0.70rem",
                  fontWeight: 700,
                  background: "var(--status-purple-bg)",
                  color: "var(--status-purple-text)",
                  border: "1px solid var(--status-purple-border)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ShieldCheck size={12} /> Super Admin Only
              </span>
            </div>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.80rem",
                color: "var(--muted-foreground)",
              }}
            >
              Private payment tracking, remaining dues & collection history
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isDuePending ? (
            <span
              className="mono-pill"
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                background: "var(--status-warn-bg)",
                color: "var(--status-warn-text)",
                border: "1.5px solid var(--status-warn-border)",
                padding: "3px 10px",
              }}
            >
              ⚠️ Due Pending: {money(dueAmount)}
            </span>
          ) : (
            <span
              className="mono-pill"
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                background: "var(--status-good-bg)",
                color: "var(--status-good-text)",
                border: "1.5px solid var(--status-good-border)",
                padding: "3px 10px",
              }}
            >
              ✓ Payment Fully Cleared
            </span>
          )}
          {isDuePending && (
            <button
              type="button"
              className="btn compact primary"
              onClick={() => {
                setRecordAmount(String(dueAmount / 100));
                setRecordOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "4px 10px",
                background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                borderColor: "#b45309",
                color: "#ffffff",
              }}
            >
              <Coins size={13} /> Collect Due Payment
            </button>
          )}
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--muted)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--muted-foreground)",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Total Bill
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--foreground)",
              marginTop: 2,
            }}
          >
            {money(total)}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--muted-foreground)",
              marginTop: 2,
            }}
          >
            Books + Delivery
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--status-good-bg)",
            border: "1px solid var(--status-good-border)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--status-good-text)",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Amount Received (Paid)
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: "var(--status-good-text)",
              marginTop: 2,
            }}
          >
            {money(amountPaid)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--status-good-text)", marginTop: 2, opacity: 0.9 }}>
            Collected & verified
          </div>
        </div>

        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: isDuePending
              ? "var(--status-danger-bg)"
              : "var(--status-good-bg)",
            border: isDuePending
              ? "1.5px solid var(--status-danger-border)"
              : "1px solid var(--status-good-border)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: isDuePending ? "var(--status-danger-text)" : "var(--status-good-text)",
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            Remaining Due / Margin
          </div>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              color: isDuePending ? "var(--status-danger-text)" : "var(--status-good-text)",
              marginTop: 2,
            }}
          >
            {money(dueAmount)}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: isDuePending ? "var(--status-danger-text)" : "var(--status-good-text)",
              marginTop: 2,
              opacity: 0.9,
            }}
          >
            {isDuePending ? "Pending collection" : "Zero balance"}
          </div>
        </div>
      </div>

      {/* Private Due Note */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
              Private Admin Due Note
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--muted-foreground)",
              }}
            >
              (Hidden from customer & staff)
            </span>
          </div>
          {!editingNote && (
            <button
              type="button"
              className="btn compact"
              onClick={() => {
                setNoteDraft(o.due_note || "");
                setEditingNote(true);
              }}
              style={{
                fontSize: "0.74rem",
                padding: "2px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Pencil size={12} /> {o.due_note ? "Edit Note" : "+ Add Note"}
            </button>
          )}
        </div>

        {editingNote ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="e.g. Rs. 100 pending - will collect on delivery / next order"
              style={{ fontSize: "0.85rem", width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn compact"
                onClick={() => setEditingNote(false)}
                disabled={savingNote}
                style={{ fontSize: "0.76rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn compact primary"
                onClick={handleSaveNote}
                disabled={savingNote}
                style={{ fontSize: "0.76rem" }}
              >
                {savingNote ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: "0.85rem",
              color: o.due_note ? "var(--foreground)" : "var(--muted-foreground)",
              fontStyle: o.due_note ? "normal" : "italic",
            }}
          >
            {o.due_note || "No private notes recorded yet."}
          </div>
        )}
      </div>

      {/* Payment History Log */}
      {paymentLogs.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Receipt size={15} style={{ color: "var(--primary)" }} />
              <strong style={{ fontSize: "0.88rem" }}>
                Payment History & Installments Log
              </strong>
            </div>
            <span
              className="mono-pill"
              style={{ fontSize: "0.72rem", fontWeight: 600 }}
            >
              {paymentLogs.length}{" "}
              {paymentLogs.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div
            style={{
              overflowX: "auto",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.82rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--muted)",
                    borderBottom: "1px solid var(--border)",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>Date</th>
                  <th
                    style={{
                      padding: "7px 10px",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    Amount Paid
                  </th>
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>Note</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>
                    Recorded By
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentLogs.map((log: any, idx: number) => {
                  const typeLabel =
                    log.type === "ADVANCE"
                      ? "Advance Payment"
                      : log.type === "FULL_PAYMENT"
                        ? "Full Clearance"
                        : "Due Collection";
                  return (
                    <tr
                      key={log.id || idx}
                      style={{
                        borderBottom:
                          idx < paymentLogs.length - 1
                            ? "1px solid var(--border)"
                            : "none",
                        background:
                          idx % 2 === 0 ? "transparent" : "var(--muted)",
                      }}
                    >
                      <td
                        style={{
                          padding: "7px 10px",
                          color: "var(--muted-foreground)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(log.created_at || log.payment_date).toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--status-good-text)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {money(log.amount)}
                      </td>
                      <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                        <span
                          className="mono-pill"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background:
                              log.type === "ADVANCE"
                                ? "var(--status-info-bg)"
                                : log.type === "FULL_PAYMENT"
                                  ? "var(--status-good-bg)"
                                  : "var(--status-warn-bg)",
                            color:
                              log.type === "ADVANCE"
                                ? "var(--status-info-text)"
                                : log.type === "FULL_PAYMENT"
                                  ? "var(--status-good-text)"
                                  : "var(--status-warn-text)",
                            border: `1px solid ${
                              log.type === "ADVANCE"
                                ? "var(--status-info-border)"
                                : log.type === "FULL_PAYMENT"
                                  ? "var(--status-good-border)"
                                  : "var(--status-warn-border)"
                            }`,
                          }}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          color: "var(--foreground)",
                        }}
                      >
                        {log.note || "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 10px",
                          color: "var(--muted-foreground)",
                          fontSize: "0.78rem",
                        }}
                      >
                        {log.actor || "Super Admin"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Due Payment Modal */}
      <Dialog open={recordOpen} onOpenChange={(v) => !v && !recording && setRecordOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Due Payment Collection</DialogTitle>
            <DialogDescription>
              Order {o.reference || o.id} · Customer: {o.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="stack" style={{ gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--muted)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Total Order Bill:</span>
                <strong style={{ display: "block", fontSize: "0.95rem" }}>{money(total)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Already Received:</span>
                <strong style={{ display: "block", fontSize: "0.95rem", color: "var(--status-good-text)" }}>{money(amountPaid)}</strong>
              </div>
              <div style={{ gridColumn: "1 / -1", paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>Current Due Balance:</span>
                <strong style={{ display: "block", fontSize: "1.1rem", color: "var(--status-danger-text)" }}>{money(dueAmount)}</strong>
              </div>
            </div>

            <Field label="Amount Collected Now (PKR)">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={recordAmount}
                onChange={(e) => setRecordAmount(e.target.value)}
                placeholder="e.g. 100"
                style={{ fontSize: "0.95rem", fontWeight: 700 }}
              />
            </Field>

            {(() => {
              const entered = Math.round(Number(recordAmount || 0) * 100);
              const remainingAfter = Math.max(0, dueAmount - entered);
              return (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: remainingAfter === 0 ? "var(--status-good-bg)" : "var(--status-warn-bg)",
                    border: `1px solid ${remainingAfter === 0 ? "var(--status-good-border)" : "var(--status-warn-border)"}`,
                    fontSize: "0.82rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Remaining Due After Collection:</span>
                  <strong style={{ color: remainingAfter === 0 ? "var(--status-good-text)" : "var(--status-warn-text)" }}>
                    {money(remainingAfter)} {remainingAfter === 0 && "(Will mark as Fully Paid ✓)"}
                  </strong>
                </div>
              );
            })()}

            <Field label="Collection Note / Payment Method">
              <input
                value={recordNote}
                onChange={(e) => setRecordNote(e.target.value)}
                placeholder="e.g. Cash collected by delivery rider, or Easypaisa transfer"
                style={{ fontSize: "0.85rem" }}
              />
            </Field>

            <div className="actions" style={{ marginTop: 4 }}>
              <button
                type="button"
                className="btn"
                disabled={recording}
                onClick={() => setRecordOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={recording || !recordAmount}
                style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", borderColor: "#b45309", color: "#ffffff" }}
              >
                {recording ? "Saving Payment…" : "Save Payment Record"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
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
  const [partialPaidInput, setPartialPaidInput] = useState<string>("");
  const [partialDueNote, setPartialDueNote] = useState<string>("");

  useEffect(() => {
    if (o && o.status === "PAYMENT_PENDING") {
      const defaultVal = o.detected_amount ? o.detected_amount / 100 : o.total / 100;
      setPartialPaidInput(String(defaultVal));
      setPartialDueNote("");
    }
  }, [o?.id, o?.status, o?.total, o?.detected_amount]);

  const admin = user.role === "SUPER_ADMIN";
  const isVendor = user.role === "VENDOR";
  const canUpdate = admin || user.permissions.includes("orders.update");

  const act = async (
    action: string,
    status?: string,
    amountPaid?: number,
    dueNote?: string,
  ) => {
    try {
      await api("manage/orders/" + id, {
        action,
        status,
        note,
        amount_paid: amountPaid,
        due_note: dueNote,
        version: o.version,
      });
      setNote("");
      setNext("");
      toast.success("Order updated.");
      notifyOrdersUpdated();
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const deleteOrder = async () => {
    try {
      await api("manage/orders/" + id, {}, "DELETE");
      toast.success("Order deleted successfully.");
      notifyOrdersUpdated();
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
                              {Number(o.actual_courier_charges || 0) > 0 ? (
                                <span className="mono-pill" style={{ marginLeft: 6, fontSize: "0.74rem", background: "rgba(37, 99, 235, 0.1)", color: "var(--primary)" }}>
                                  Ledger Cost: Rs. {Number(o.actual_courier_charges).toLocaleString()}
                                </span>
                              ) : null}
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
              {isVendor && o.status === "PROCESSING" && !o.vendor_dispatched_at && (
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
                        <strong style={{ fontSize: "0.92rem" }}>Printing (Pending)</strong>
                        <span
                          className="mono-pill"
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background: o.vendor_printed_at ? "rgba(22, 163, 74, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: o.vendor_printed_at ? "#15803d" : "#b45309",
                          }}
                        >
                          {o.vendor_printed_at ? "Printed ✓" : "Printing (Pending)"}
                        </span>
                      </div>
                      <p className="small-text muted" style={{ margin: "2px 0 0" }}>
                        {o.vendor_printed_at
                          ? `Marked as printed (${formatDateDMY(o.vendor_printed_at)}). Ready for dispatch or pickup.`
                          : "Order is in printing pending status waiting for printing."}
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
                          notifyOrdersUpdated();
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
                      <Building2 size={12} /> Dispatched to Campus
                    </span>
                  )}
                </div>
              )}

              <div className="checkout-grid order-modal-grid">
                <div className="stack">
                  {isVendor ? (
                    <VendorOrderBooksPanel o={o} onUpdated={reload} />
                  ) : (
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

                      <AdminOrderBooksPanel o={o} user={user} onUpdated={reload} />
                      <StudentRefundManagementPanel o={o} user={user} onUpdated={reload} />
                      <SuperAdminDueManagementPanel o={o} user={user} onUpdated={reload} />

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
                          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total books to print:</span>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {o.total_books ?? ((o.items || []).filter((it: any) => !it.is_unavailable && !it.in_office_stock).reduce((s: number, it: any) => s + (it.quantity || 1), 0))}{" "}
                            {Number(o.total_books ?? ((o.items || []).filter((it: any) => !it.is_unavailable && !it.in_office_stock).reduce((s: number, it: any) => s + (it.quantity || 1), 0))) === 1 ? "book" : "books"}
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total pages:</span>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {Number(o.vendor_pages ?? ((o.items || []).filter((it: any) => !it.is_unavailable && !it.in_office_stock).reduce((s: number, it: any) => s + (Number(it.pages) || 0) * (it.quantity || 1), 0))).toLocaleString()} pages
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px dashed var(--border)" }}>
                          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--foreground)" }}>Vendor Earning:</span>
                          <strong style={{ fontSize: "1.1rem", color: "#15803d" }}>
                            Rs. {Number(o.vendor_price || 0).toLocaleString()}
                          </strong>
                        </div>
                        {o.vendor_rate_breakdown?.formula && (
                          <div style={{ fontSize: "0.76rem", color: "var(--muted-foreground)", background: "rgba(22, 163, 74, 0.08)", padding: "5px 8px", borderRadius: 6, border: "1px dashed rgba(22, 163, 74, 0.25)" }}>
                            Calculation: {o.vendor_rate_breakdown.formula}
                          </div>
                        )}
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
                        {o.status === "PROCESSING" && !o.vendor_dispatched_at && !(o.items && o.items.length > 0 && o.items.every((it: any) => Boolean(it.received_from_vendor))) && (
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
                        )}
                      </div>

                      {isOtherCityOrder(o) ? (
                        o.status === "SHIPPED" ? (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              background: "var(--status-good-bg)",
                              border: "1px solid var(--status-good-border)",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                            }}
                          >
                            <strong style={{ color: "var(--status-good-text)" }}>🚚 Shipped via Courier:</strong>
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
                                  notifyOrdersUpdated();
                                  await reload();
                                } catch (e) {
                                  toast.error(errorText(e));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              style={{ gap: 6, background: "linear-gradient(135deg, #059669 0%, #047857 100%)", borderColor: "#047857", color: "#ffffff" }}
                            >
                              <CheckCircle2 size={14} /> Mark as Delivered
                            </button>
                          </div>
                        ) : o.status === "DELIVERED" ? (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              background: "var(--status-good-bg)",
                              border: "1px solid var(--status-good-border)",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                            }}
                          >
                            <strong style={{ color: "var(--status-good-text)" }}>✅ Delivered to Student:</strong>
                            <p style={{ margin: "4px 0 0" }}>
                              Fulfillment complete. Delivered via {o.courier_name} (Tracking: {o.courier_tracking_id}).
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: "12px 14px",
                              borderRadius: 8,
                              background: "var(--status-info-bg)",
                              border: "1px solid var(--status-info-border)",
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
                            background: "var(--status-warn-bg)",
                            border: "1px solid var(--status-warn-border)",
                            fontSize: "0.85rem",
                            lineHeight: 1.45,
                          }}
                        >
                          <strong>🏛️ Send to Campus:</strong>
                          <p style={{ margin: "4px 0 8px" }}>
                            This order is for Lahore / VU Qanchi Campus. Once books are printed, click below to mark this batch as dispatched to Campus.
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
                                  toast.success("Order dispatched to Campus ✓");
                                  await reload();
                                } catch (e) {
                                  toast.error(errorText(e));
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              style={{ gap: 6, background: "linear-gradient(135deg, #1d64b4 0%, #154c8a 100%)", borderColor: "#16467c", color: "#ffffff" }}
                            >
                              <Building2 size={14} /> Send to Campus
                            </button>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                              <span
                                className="mono-pill"
                                style={{
                                  background: "var(--status-info-bg)",
                                  color: "var(--status-info-text)",
                                  border: "1px solid var(--status-info-border)",
                                  fontWeight: 600,
                                }}
                              >
                                <Building2 size={12} /> Sent to Campus ✓
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                                Batch sent to Bookstore Office for student delivery
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
                            <span className="mono-pill" style={{ background: "var(--status-good-bg)", color: "var(--status-good-text)", border: "1px solid var(--status-good-border)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle2 size={13} /> Printed by Vendor ({formatDateDMY(o.vendor_printed_at)})
                            </span>
                          )}
                          {o.vendor_dispatched_at && (
                            <span className="mono-pill" style={{ background: "var(--status-info-bg)", color: "var(--status-info-text)", border: "1px solid var(--status-info-border)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <Building2 size={13} /> Dispatched by Vendor to Campus ({formatDateDMY(o.vendor_dispatched_at)})
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

                      {admin && o.status === "PAYMENT_PENDING" && (
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            background: "rgba(37, 99, 235, 0.05)",
                            border: "1px solid rgba(37, 99, 235, 0.2)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            margin: "4px 0",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Amount Received / Paid (PKR):</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={partialPaidInput}
                              onChange={(e) => setPartialPaidInput(e.target.value)}
                              style={{ width: "130px", textAlign: "right", fontWeight: 700, padding: "5px 8px" }}
                            />
                          </div>

                          {(() => {
                            const enteredCents = Math.round(Number(partialPaidInput || 0) * 100);
                            const dueCents = Math.max(0, (o.total || 0) - enteredCents);
                            if (dueCents > 0) {
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  <div
                                    style={{
                                      padding: "8px 10px",
                                      borderRadius: 6,
                                      background: "var(--status-warn-bg)",
                                      border: "1px solid var(--status-warn-border)",
                                      color: "var(--status-warn-text)",
                                      fontSize: "0.82rem",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span>⚠️ Remaining Due Margin:</span>
                                    <strong>{money(dueCents)}</strong>
                                  </div>
                                  <Field label="Private Due Note (Super Admin only)">
                                    <input
                                      value={partialDueNote}
                                      onChange={(e) => setPartialDueNote(e.target.value)}
                                      placeholder="e.g. Rs. 100 pending - will collect on delivery"
                                      style={{ fontSize: "0.84rem" }}
                                    />
                                  </Field>
                                </div>
                              );
                            }
                            return (
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: "var(--status-good-text)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <CheckCircle2 size={13} /> Full amount received ({money(enteredCents)}). No balance due.
                              </div>
                            );
                          })()}
                        </div>
                      )}

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
                      {admin && o.status === "PAYMENT_PENDING" && (() => {
                        const enteredCents = Math.round(Number(partialPaidInput || 0) * 100);
                        const dueCents = Math.max(0, (o.total || 0) - enteredCents);
                        const isPartial = dueCents > 0;
                        return (
                          <div className="actions">
                            <button
                              className="btn compact primary"
                              style={{
                                background: isPartial
                                  ? "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                                  : undefined,
                                borderColor: isPartial ? "#b45309" : undefined,
                                color: isPartial ? "#ffffff" : undefined,
                              }}
                              onClick={() =>
                                setDecision({
                                  action: "approve",
                                  label: isPartial
                                    ? `Approve with Partial Payment (${money(dueCents)} Due)`
                                    : "Approve Payment",
                                  amount_paid: enteredCents,
                                  due_amount: dueCents,
                                  due_note: partialDueNote,
                                })
                              }
                            >
                              {isPartial
                                ? `Approve Partial (${money(dueCents)} Due)`
                                : "Approve Payment"}
                            </button>
                            <button
                              className="btn compact"
                              onClick={() => setDecision({ action: "reject", label: "Reject Payment" })}
                            >
                              Reject Payment
                            </button>
                            <button
                              className="btn compact"
                              onClick={() => setDecision({ action: "request", label: "Request New Slip" })}
                            >
                              Request New Slip
                            </button>
                            <button
                              className="btn compact"
                              onClick={() => setDecision({ action: "manual", label: "Manual Review" })}
                            >
                              Manual Review
                            </button>
                          </div>
                        );
                      })()}
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
                              background: "var(--status-danger-bg)",
                              border: "1.5px solid var(--status-danger-border)",
                              color: "var(--status-danger-text)",
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
              ? decision?.due_amount > 0
                ? `Confirm approving order with partial payment of ${money(decision.amount_paid)}. A remaining balance of ${money(decision.due_amount)} will be recorded as pending due.`
                : "Confirm only after checking the bank transaction. Approval confirms the order."
              : "This decision will be recorded in the order history and audit log."
          }
          onConfirm={() =>
            act(
              decision.action,
              decision.status,
              decision.amount_paid,
              decision.due_note,
            )
          }
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
  PROCESSING: {
    to: "SHIPPED",
    toLabel: "Shipped",
    fromLabel: "Printing (Pending)",
  },
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
  { id: "PROCESSING", label: "Printing (Pending)", title: "Orders Currently in Printing (Pending)", icon: "🖨️", statuses: ["PROCESSING"], urgent: true, color: "printing" },
  { id: "PRINTED", label: "Printed / Ready", title: "Orders Printed & Ready for Dispatch", icon: "📦", statuses: ["PROCESSING"], color: "confirmed" },
  { id: "SHIPPED", label: "Shipped", title: "Shipped / With Rider", icon: "🚚", statuses: ["SHIPPED"], color: "shipped" },
  { id: "DELIVERED", label: "Delivered", title: "Delivered / Completed", icon: "✅", statuses: ["DELIVERED"], color: "delivered" },
  { id: "CANCELLED", label: "Cancelled", title: "Cancelled Orders", icon: "❌", statuses: ["CANCELLED"], color: "cancelled" },
  { id: "REJECTED", label: "Rejected", title: "Rejected Orders", icon: "🚫", statuses: ["REJECTED"], color: "rejected" },
  { id: "REFUND_REQUESTED", label: "Refunded", title: "Refund Requested / Processed", icon: "💸", statuses: ["REFUND_REQUESTED"], color: "refunded" },
  { id: "REFUNDS_DUE", label: "Refunds Pending", title: "Orders with pending student advance refund", icon: "⚠️", statuses: ["REFUNDS_DUE"], urgent: true, color: "pending" },
];

const ORDER_DELIVERY_CHIPS = [
  { id: "all", label: "All Delivery Channels", icon: "🌐" },
  { id: "campus", label: "Qanchi Campus", icon: "🏛️" },
  { id: "lahore", label: "Lahore (Rider)", icon: "🛵" },
  { id: "other", label: "Other Cities (Courier)", icon: "📦" },
];

const VENDOR_WORKFLOW_TABS: WorkflowTab[] = [
  { id: "PROCESSING", label: "Printing (Pending)", title: "Orders Currently In Printing (Pending)", icon: "🖨️", statuses: ["PROCESSING"], urgent: true, color: "printing" },
  { id: "PRINTED", label: "Printed / Ready", title: "Orders Printed & Ready for Dispatch", icon: "📦", statuses: ["PROCESSING"], color: "confirmed" },
  { id: "SHIPPED", label: "Shipped", title: "Orders Shipped / Handed Over", icon: "🚚", statuses: ["SHIPPED"], color: "shipped" },
  { id: "DELIVERED", label: "Delivered", title: "Completed Orders", icon: "✅", statuses: ["DELIVERED"], color: "delivered" },
  { id: "ALL", label: "All Orders", title: "All Orders", icon: "📋", statuses: [], color: "all" },
];

const VENDOR_STAGES_CONFIG: {
  id: string;
  label: string;
  title: string;
  icon: LucideIcon;
  iconSize: number;
  subtext: (count: number) => string;
  theme: {
    activeBorder: string;
    activeBg: string;
    activeText: string;
    activeIconBg: string;
    activeIconColor: string;
    indicator: string;
    idleBorder: string;
    idleBg: string;
    idleText: string;
    idleIconBg: string;
    idleIconColor: string;
  };
}[] = [
  {
    id: "PROCESSING",
    label: "Printing (Pending)",
    title: "Orders Currently In Printing Queue (Urgent Action Required)",
    icon: Printer,
    iconSize: 24,
    subtext: (c) => (c === 0 ? "Queue clear" : "Action needed (Print now)"),
    theme: {
      activeBorder: "var(--destructive)",
      activeBg: "linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, var(--card) 100%)",
      activeText: "var(--status-danger-text)",
      activeIconBg: "var(--destructive)",
      activeIconColor: "#ffffff",
      indicator: "var(--destructive)",
      idleBorder: "var(--status-danger-border)",
      idleBg: "var(--status-danger-bg)",
      idleText: "var(--status-danger-text)",
      idleIconBg: "var(--status-danger-bg)",
      idleIconColor: "var(--status-danger-text)",
    },
  },
  {
    id: "PRINTED",
    label: "Printed / Ready",
    title: "Orders Printed & Ready for Dispatch",
    icon: CheckCircle2,
    iconSize: 22,
    subtext: (c) => (c === 0 ? "None ready" : "Ready for dispatch"),
    theme: {
      activeBorder: "var(--status-good-border)",
      activeBg: "linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, var(--card) 100%)",
      activeText: "var(--status-good-text)",
      activeIconBg: "#10b981",
      activeIconColor: "#ffffff",
      indicator: "#10b981",
      idleBorder: "var(--status-good-border)",
      idleBg: "var(--status-good-bg)",
      idleText: "var(--status-good-text)",
      idleIconBg: "var(--status-good-bg)",
      idleIconColor: "var(--status-good-text)",
    },
  },
  {
    id: "SHIPPED",
    label: "Shipped",
    title: "Orders Shipped / Handed Over",
    icon: Truck,
    iconSize: 22,
    subtext: (c) => (c === 0 ? "None in transit" : "In transit to student"),
    theme: {
      activeBorder: "var(--status-info-border)",
      activeBg: "linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, var(--card) 100%)",
      activeText: "var(--status-info-text)",
      activeIconBg: "#2563eb",
      activeIconColor: "#ffffff",
      indicator: "#3b82f6",
      idleBorder: "var(--status-info-border)",
      idleBg: "var(--status-info-bg)",
      idleText: "var(--status-info-text)",
      idleIconBg: "var(--status-info-bg)",
      idleIconColor: "var(--status-info-text)",
    },
  },
  {
    id: "DELIVERED",
    label: "Delivered",
    title: "Delivered & Completed Orders",
    icon: Package,
    iconSize: 22,
    subtext: (c) => (c === 0 ? "No completions yet" : "Successfully delivered"),
    theme: {
      activeBorder: "var(--status-purple-border)",
      activeBg: "linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, var(--card) 100%)",
      activeText: "var(--status-purple-text)",
      activeIconBg: "#7c3aed",
      activeIconColor: "#ffffff",
      indicator: "#8b5cf6",
      idleBorder: "var(--status-purple-border)",
      idleBg: "var(--status-purple-bg)",
      idleText: "var(--status-purple-text)",
      idleIconBg: "var(--status-purple-bg)",
      idleIconColor: "var(--status-purple-text)",
    },
  },
  {
    id: "ALL",
    label: "All Orders",
    title: "All Assigned Orders",
    icon: ShoppingBag,
    iconSize: 22,
    subtext: (c) => (c === 0 ? "Total volume" : "Total assigned orders"),
    theme: {
      activeBorder: "var(--primary)",
      activeBg: "linear-gradient(135deg, rgba(37, 99, 235, 0.14) 0%, var(--card) 100%)",
      activeText: "var(--foreground)",
      activeIconBg: "var(--primary)",
      activeIconColor: "#ffffff",
      indicator: "var(--primary)",
      idleBorder: "var(--border)",
      idleBg: "var(--card)",
      idleText: "var(--foreground)",
      idleIconBg: "var(--secondary)",
      idleIconColor: "var(--foreground)",
    },
  },
];

const VENDOR_DELIVERY_CHIPS = [
  { id: "all", label: "All Orders", icon: "🌐" },
  { id: "other", label: "Parcels (Courier Dispatch)", icon: "📦" },
  { id: "campus_lahore", label: "Qanchi Campus Lahore", icon: "🏛️" },
];


function VendorRemoveQueueModal({
  order,
  onClose,
  onSuccess,
}: {
  order: any;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const [reasonCategory, setReasonCategory] = useState("Paper / Cover Stock Shortage");
  const [detailNote, setDetailNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      reasonCategory === "OTHER"
        ? detailNote.trim()
        : detailNote.trim()
          ? `${reasonCategory} — ${detailNote.trim()}`
          : reasonCategory;

    if (!finalReason || finalReason.length < 3) {
      toast.error("Please enter a valid reason for removing this order from printing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api(`manage/orders/${order.id}`, {
        action: "printing_queue",
        in_queue: false,
        reason: finalReason,
      });
      toast.success(res.message || "Order removed from printing and returned to unassigned queue ✓");
      notifyOrdersUpdated();
      await onSuccess();
      onClose();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent style={{ maxWidth: 460 }}>
        <DialogHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <XCircle size={18} />
            </div>
            <div>
              <DialogTitle style={{ fontSize: "1.05rem", margin: 0 }}>
                Remove from Printing Queue
              </DialogTitle>
              <DialogDescription style={{ fontSize: "0.80rem", marginTop: 2 }}>
                Order #{order.reference || order.id} · Student: {order.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px dashed rgba(239, 68, 68, 0.35)",
              fontSize: "0.80rem",
              color: "#b91c1c",
              lineHeight: 1.4,
            }}
          >
            ⚠️ <strong>Notice:</strong> This order will be unassigned from your vendor account and returned to the Bookstore Administration Confirmed queue for reassignment.
          </div>

          <Field label="Reason for Removal (Required)">
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="toolbar-search-input"
              style={{
                width: "100%",
                fontSize: "0.84rem",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--foreground)",
                fontWeight: 600,
              }}
            >
              <option value="Paper / Cover Stock Shortage">📦 Paper / Cover Stock Shortage (Kaghaz / Cover khatam hai)</option>
              <option value="Printing Machine Maintenance / Breakdown">⚙️ Printing Machine Breakdown / Maintenance (Machine kharab hai)</option>
              <option value="Binding Delay / Spiral Shortage">⏳ Binding Delay / Spiral Shortage (Binding ka masla hai)</option>
              <option value="Book PDF / Margin Defect">📄 Book PDF / Margin Defect (File / Page margin ka issue hai)</option>
              <option value="OTHER">✍️ Other / Custom Reason (Apni waja likhein)</option>
            </select>
          </Field>

          <Field label={reasonCategory === "OTHER" ? "Detailed Reason (Required)" : "Additional Notes (Optional)"}>
            <input
              type="text"
              required={reasonCategory === "OTHER"}
              placeholder={
                reasonCategory === "OTHER"
                  ? "Explain why this order cannot be printed…"
                  : "Optional remarks for Bookstore Office…"
              }
              value={detailNote}
              onChange={(e) => setDetailNote(e.target.value)}
              className="toolbar-search-input"
              style={{
                width: "100%",
                fontSize: "0.84rem",
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
              }}
            />
          </Field>

          <div className="actions" style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn compact" disabled={submitting} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn compact primary"
              disabled={submitting}
              style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
            >
              {submitting ? "Removing…" : "Confirm & Remove from Queue"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
    [quickShippingId, setQuickShippingId] = useState<string | null>(null),
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
    [dispatchingOffice, setDispatchingOffice] = useState(false),
    [removingQueueOrder, setRemovingQueueOrder] = useState<any | null>(null),
    [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, page, q, campus, statusList, deliveryTypeList]);

  const handleVendorPrint = async (ord: any, markAsPrinted: boolean) => {
    setPrintingBusyId(ord.id);
    try {
      await api(`manage/orders/${ord.id}`, {
        action: "vendor_print",
        printed: markAsPrinted,
      });
      toast.success(markAsPrinted ? "Marked as Printed ✓" : "Print status cleared (back in queue)");
      notifyOrdersUpdated();
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
      notifyOrdersUpdated();
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
      notifyOrdersUpdated();
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
      notifyOrdersUpdated();
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setMarkingDeliveredId(null);
    }
  };

  const handleQuickShip = async (ord: any) => {
    setQuickShippingId(ord.id);
    try {
      await api(`manage/orders/${ord.id}`, {
        action: "status",
        status: "SHIPPED",
        version: ord.version,
        note: "Marked as Shipped by Bookstore Office (Received from Vendor)",
      });
      toast.success(`Order ${ord.reference || ord.id} marked as Shipped ✓`);
      notifyOrdersUpdated();
      await reload();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setQuickShippingId(null);
    }
  };

  const handleBatchVendorPrint = async (
    ids: string[] = [],
    markAsPrinted = true,
    allInQueue = false,
  ) => {
    if (!ids.length && !allInQueue) return;
    if (isVendor && deliveryTypeList.length === 0) {
      toast.error(
        "Please select either 'Other Cities' or 'Qanchi Campus Lahore' before batch printing.",
      );
      return;
    }
    setBatchPrinting(true);
    try {
      const res = await api("manage/orders/batch-vendor-print", {
        orderIds: ids.length > 0 ? ids : undefined,
        allInQueue,
        printed: markAsPrinted,
        deliveryType: deliveryTypeList.join(","),
        campusId: campus,
        q,
      });
      toast.success(
        res.message ||
          (markAsPrinted
            ? `Marked ${res.count ?? ids.length} order(s) as printed ✓`
            : `Unmarked print status for ${res.count ?? ids.length} order(s).`),
      );
      notifyOrdersUpdated();
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBatchPrinting(false);
    }
  };

  const handleBatchVendorDispatchOffice = async (
    paramsOrIds: string[] | { allEligible?: boolean; ids?: string[] } = { allEligible: true },
  ) => {
    setBatchDispatching(true);
    try {
      const isObj = !Array.isArray(paramsOrIds) && typeof paramsOrIds === "object";
      const payload = isObj
        ? { allEligible: paramsOrIds.allEligible, orderIds: paramsOrIds.ids }
        : { orderIds: paramsOrIds };
      const res = await api("manage/orders/batch-vendor-dispatch-office", payload);
      toast.success(res.message || `Dispatched ${res.count ?? "all"} order(s) to Qanchi Campus.`);
      notifyOrdersUpdated();
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
      toast.success("Order dispatched to Campus ✓");
      setDispatchOfficeOrder(null);
      notifyOrdersUpdated();
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setDispatchingOffice(false);
    }
  };

  const exportOrders = async () => {
    if (!["CONFIRMED", "PROCESSING", "PRINTED", "SHIPPED", "DELIVERED"].includes(activeTab)) {
      toast.error("Orders can only be exported after payment is confirmed.");
      return;
    }
    if (deliveryTypeList.length === 0) {
      toast.error(
        "Please select a specific delivery channel (Qanchi Campus, Lahore, or Other Cities) before exporting.",
      );
      return;
    }
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
          deliveryPrefix = "Parcels";
          sheetName = "Parcels";
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
      const isShippedOrDelivered =
        activeTab === "SHIPPED" ||
        activeTab === "DELIVERED" ||
        statusList.includes("SHIPPED") ||
        statusList.includes("DELIVERED") ||
        (rows.length > 0 &&
          rows.every(
            (r: any) => r.status === "SHIPPED" || r.status === "DELIVERED",
          ));
      const includeAddress = deliveryTypeList.length === 0 || deliveryTypeList.includes("other");
      const includeMobile = includeAddress || isShippedOrDelivered;

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
          includeMobile,
          sheetName,
          includeBookSummary,
        });
        toast.success(
          `Exported ${rows.length} order(s)${includeAddress ? " with address & phone" : includeMobile ? " with mobile" : ""}${includeBookSummary ? " with Books Summary" : ""} to ${filename}.`,
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
          const rawItems =
            o.items && o.items.length > 0
              ? o.items
              : [{ code: "—", title: "Order Record", quantity: 1 }];
          const eligibleItems = rawItems.filter(
            (it: any) => !it.is_unavailable && !it.in_office_stock,
          );
          const items =
            eligibleItems.length > 0
              ? eligibleItems
              : rawItems.length > 0 && (rawItems[0].is_unavailable || rawItems[0].in_office_stock)
                ? []
                : rawItems;
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

    // Auto-poll every 5 seconds in background so Super Admin and Vendor are always in real-time sync without manual page refresh
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        void reload();
      }
    }, 5000);

    const onFocus = () => {
      void reload();
    };
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void reload();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("bookstore-orders-sync");
        bc.onmessage = () => {
          void reload();
        };
      }
    } catch {}

    return () => {
      window.removeEventListener("orders-updated", handler);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      bc?.close();
    };
  }, [reload]);

  const activeFlowStep =
    statusList.length === 1 && STATUS_ADVANCE_FLOW[statusList[0]]
      ? {
          ...STATUS_ADVANCE_FLOW[statusList[0]],
          fromLabel:
            activeTab === "PRINTED"
              ? "Printed"
              : STATUS_ADVANCE_FLOW[statusList[0]].fromLabel,
        }
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
        toast.error(
          "Other City orders require courier tracking. Filter by 'Qanchi Campus' or 'Lahore' to mark in 1 click, or add tracking for other city orders.",
        );
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
        printed: printedFilter,
      });
      const updatedCount = res.count ?? filteredCount;
      toast.success(
        `Successfully updated ${updatedCount} order(s) from "${activeFlowStep.fromLabel}" to "${activeFlowStep.toLabel}".`,
      );
      setBatchConfirm(null);
      setStatusList([activeFlowStep.to]);
      setActiveTab(activeFlowStep.to);
      setPage(1);
      notifyOrdersUpdated();
      await reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBatchUpdating(false);
    }
  };

  const isPaymentConfirmedTab = [
    "CONFIRMED",
    "PROCESSING",
    "PRINTED",
    "SHIPPED",
    "DELIVERED",
  ].includes(activeTab);

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
    if (tab.id === "REFUNDS_DUE") {
      return data.status_counts.REFUNDS_DUE || 0;
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

  const currentOrderRows: any[] = data?.rows || [];
  const allVisibleSelected = currentOrderRows.length > 0 && currentOrderRows.every((r: any) => selectedIds.includes(r.id));
  const someVisibleSelected = currentOrderRows.some((r: any) => selectedIds.includes(r.id));

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(currentOrderRows.map((r: any) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...currentOrderRows.map((r: any) => r.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const selectAllCheckbox = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={allVisibleSelected}
        ref={(el) => {
          if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
        }}
        onChange={toggleSelectAll}
        title="Select / Deselect all actionable orders"
        style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#2563eb" }}
      />
    </div>
  );

  const headers = isVendor
    ? [
        selectAllCheckbox,
        "Order",
        "Student",
        "Books & Pages",
        "Vendor Earning",
        "Date",
        "Status",
        "Logistics & Action",
        "View",
      ]
    : isPendingView
      ? [
          selectAllCheckbox,
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
          selectAllCheckbox,
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
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)",
            border: "1.5px solid rgba(239, 68, 68, 0.35)",
            borderRadius: 12,
            padding: "13px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            className="notice-icon"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#dc2626",
              flexShrink: 0,
            }}
          >
            <Printer size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="vendor-urgent-dot" />
              <strong style={{ fontSize: "0.96rem", color: "#b91c1c", fontWeight: 700 }}>
                {data.status_counts["PROCESSING"]}{" "}
                {data.status_counts["PROCESSING"] === 1 ? "Order" : "Orders"} waiting in your Printing Queue!
              </strong>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: "0.83rem", color: "var(--muted-foreground)" }}>
              Print the books for these orders. Mark them as "Printed" when ready, then dispatch Other City orders via courier or send Lahore/Campus batches to the Bookstore Office.
            </p>
          </div>
        </div>
      )}

      {isVendor ? (
        <div className="vendor-workflow-cards-grid" role="tablist" aria-label="Vendor Order Stages">
          {VENDOR_STAGES_CONFIG.map((stage) => {
            const active = activeTab === stage.id;
            const count =
              getTabCount({
                id: stage.id,
                statuses:
                  stage.id === "PROCESSING" || stage.id === "PRINTED"
                    ? ["PROCESSING"]
                    : stage.id === "ALL"
                      ? []
                      : [stage.id],
              } as any) ?? 0;
            const StageIcon = stage.icon;
            const isProcessingUrgent = stage.id === "PROCESSING" && count > 0;

            const cardBorder = active
              ? `2px solid ${stage.theme.activeBorder}`
              : `1.5px solid ${stage.theme.idleBorder}`;

            const cardBg = active
              ? stage.theme.activeBg
              : stage.theme.idleBg;

            const iconBg = active
              ? stage.theme.activeIconBg
              : stage.theme.idleIconBg;

            const iconColor = active
              ? stage.theme.activeIconColor
              : stage.theme.idleIconColor;

            const textColor = active
              ? stage.theme.activeText
              : isProcessingUrgent
                ? stage.theme.idleText
                : stage.id === "PRINTED"
                  ? stage.theme.idleText
                  : stage.id === "SHIPPED"
                    ? stage.theme.idleText
                    : stage.id === "DELIVERED"
                      ? stage.theme.idleText
                      : "var(--foreground)";

            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={stage.title}
                className={`vendor-stage-card ${active ? "active" : ""}`}
                style={{
                  border: cardBorder,
                  background: cardBg,
                }}
                onClick={() => {
                  setPage(1);
                  setActiveTab(stage.id);
                  if (stage.id === "PROCESSING") {
                    setStatusList(["PROCESSING"]);
                    setPrintedFilter("0");
                  } else if (stage.id === "PRINTED") {
                    setStatusList(["PROCESSING"]);
                    setPrintedFilter("1");
                  } else if (stage.id === "ALL") {
                    setStatusList([]);
                    setPrintedFilter("");
                  } else {
                    setStatusList([stage.id]);
                    setPrintedFilter("");
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    width: "100%",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    {isProcessingUrgent && <span className="vendor-urgent-dot" title="Action required: pending printing" />}
                    <span
                      style={{
                        fontSize: "0.86rem",
                        fontWeight: 700,
                        color: textColor,
                        letterSpacing: "0.2px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {stage.label}
                    </span>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: iconBg,
                      color: iconColor,
                      flexShrink: 0,
                      boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : undefined,
                      transition: "all 0.18s ease",
                    }}
                  >
                    <StageIcon size={stage.iconSize || 22} />
                  </span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <strong
                      style={{
                        fontSize: "1.9rem",
                        fontWeight: 800,
                        lineHeight: 1.1,
                        color: textColor,
                      }}
                    >
                      {count}
                    </strong>
                    <span
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--muted-foreground)",
                        fontWeight: 500,
                      }}
                    >
                      {count === 1 ? "order" : "orders"}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: active ? stage.theme.activeText : "var(--muted-foreground)",
                      marginTop: 3,
                      fontWeight: 500,
                    }}
                  >
                    {stage.subtext(count)}
                  </div>
                </div>

                {active && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -2,
                      left: "15%",
                      right: "15%",
                      height: 3,
                      borderRadius: "3px 3px 0 0",
                      background: stage.theme.indicator,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="orders-workflow-tabs-container" role="tablist" aria-label="Order Workflow Stages">
          {ORDER_WORKFLOW_TABS.map((tab) => {
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
                  if (tab.id === "REFUNDS_DUE") {
                    setStatusList(["REFUNDS_DUE"]);
                    setPrintedFilter("");
                  } else if (tab.id === "PROCESSING") {
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
      )}

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
        {isPaymentConfirmedTab && deliveryTypeList.length === 0 && (
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--muted-foreground)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 14,
              background: "var(--muted)",
            }}
          >
            <span>💡</span>
            <span>
              {isVendor ? (
                <>
                  Select <strong>Other Cities</strong> or <strong>Qanchi Campus Lahore</strong> to export or batch print
                </>
              ) : (
                <>
                  Select <strong>Qanchi Campus</strong>, <strong>Lahore</strong>, or <strong>Other Cities</strong> to export
                </>
              )}
            </span>
          </span>
        )}
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
        {isPaymentConfirmedTab && deliveryTypeList.length > 0 && (
          <div className="toolbar-actions-divider" />
        )}
        {isPaymentConfirmedTab && deliveryTypeList.length > 0 && (
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
        )}
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
        {isVendor && activeTab === "PROCESSING" && deliveryTypeList.length > 0 && (() => {
          const queueTotal = data?.total ?? currentRows.length;
          const isEnabled = queueTotal > 0 && !batchPrinting && !loading;

          return (
            <button
              type="button"
              className={`btn compact toolbar-batch-btn ${isEnabled ? "active" : ""}`}
              disabled={!isEnabled}
              onClick={() => {
                if (queueTotal === 0) {
                  toast.info("No orders in printing queue.");
                  return;
                }
                handleBatchVendorPrint([], true, true);
              }}
              title={
                queueTotal > 0
                  ? `Mark all ${queueTotal} order(s) in printing queue as printed`
                  : "No orders in printing queue"
              }
            >
              <span className="toolbar-btn-icon-circle">
                <CheckCircle2 size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
              </span>
              <span>
                {batchPrinting
                  ? "Updating…"
                  : `Mark All Printed ${queueTotal > 0 ? `(${queueTotal})` : ""}`}
              </span>
            </button>
          );
        })()}
        {isVendor && activeTab === "PRINTED" && (() => {
          const isCampusLahoreSelected =
            deliveryTypeList.includes("campus") || deliveryTypeList.includes("lahore");
          if (!isCampusLahoreSelected) return null;

          const printedTotal = data?.total ?? currentRows.length;
          const isEnabled = printedTotal > 0 && !batchDispatching && !loading;

          return (
            <button
              type="button"
              className={`btn compact toolbar-batch-btn ${isEnabled ? "active" : ""}`}
              disabled={!isEnabled}
              onClick={() => handleBatchVendorDispatchOffice({ allEligible: true })}
              title={
                printedTotal > 0
                  ? `Dispatch all ${printedTotal} printed order(s) to Qanchi Campus`
                  : "No printed orders pending dispatch to Qanchi Campus"
              }
            >
              <span className="toolbar-btn-icon-circle">
                <Building2 size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
              </span>
              <span>
                {batchDispatching
                  ? "Dispatching…"
                  : `Send All to Qanchi Campus ${printedTotal > 0 ? `(${printedTotal})` : ""}`}
              </span>
            </button>
          );
        })()}
        {!isVendor && canUpdate && activeFlowStep && (
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
                    toast.error(
                      "Other City orders require courier tracking. Filter by 'Qanchi Campus' or 'Lahore' to mark in 1 click, or add tracking for other city orders.",
                    );
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
              {activeFlowStep.to === "SHIPPED" ? (
                <Truck size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
              ) : (
                <ArrowRightCircle size={14} strokeWidth={2.4} className="toolbar-batch-icon" />
              )}
            </span>
            <span>
              {batchUpdating
                ? "Updating…"
                : activeFlowStep
                  ? `Mark All ${activeFlowStep.toLabel} (${filteredCount})`
                  : "Change All Status"}
            </span>
          </button>
        )}
      </div>
      {selectedIds.length > 0 && (() => {
        const selectedRows = (data?.rows || []).filter((r: any) => selectedIds.includes(r.id));
        const printableOrders = selectedRows.filter((r: any) => r.status === "PROCESSING" && !r.vendor_printed_at);
        const unprintableOrders = selectedRows.filter((r: any) => r.status === "PROCESSING" && !!r.vendor_printed_at);
        const assignableOrders = selectedRows.filter((r: any) => r.status === "CONFIRMED" || (r.status === "PROCESSING" && !r.vendor_id));

        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "10px 16px",
              background: "rgba(37, 99, 235, 0.08)",
              border: "1.5px solid #3b82f6",
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                ✓
              </span>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--foreground)" }}>
                <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "order" : "orders"} selected
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {canUpdate && printableOrders.length > 0 && (
                <button
                  type="button"
                  className="btn compact primary"
                  disabled={batchPrinting}
                  onClick={() => handleBatchVendorPrint(printableOrders.map((o: any) => o.id), true)}
                  style={{ background: "#16a34a", borderColor: "#16a34a", fontWeight: 600 }}
                  title={`Mark selected ${printableOrders.length} order(s) as printed`}
                >
                  <CheckCircle2 size={13} />
                  {batchPrinting ? "Saving…" : `Mark Selected as Printed (${printableOrders.length})`}
                </button>
              )}

              {canUpdate && unprintableOrders.length > 0 && (
                <button
                  type="button"
                  className="btn compact"
                  disabled={batchPrinting}
                  onClick={() => handleBatchVendorPrint(unprintableOrders.map((o: any) => o.id), false)}
                  style={{ fontWeight: 600 }}
                  title={`Clear printed status for selected ${unprintableOrders.length} order(s)`}
                >
                  <RotateCcw size={13} /> Unmark Printed ({unprintableOrders.length})
                </button>
              )}

              {isAdmin && !isVendor && assignableOrders.length > 0 && (
                <button
                  type="button"
                  className="btn compact"
                  onClick={() => setBulkAssigningOrders(assignableOrders)}
                  style={{ fontWeight: 600 }}
                  title={`Assign selected ${assignableOrders.length} order(s) to a vendor`}
                >
                  <Send size={13} /> Send to Vendor ({assignableOrders.length})
                </button>
              )}

              <button
                type="button"
                className="btn compact"
                onClick={() => setSelectedIds([])}
                style={{
                  fontSize: "0.76rem",
                  color: "var(--muted-foreground)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                Clear selection
              </button>
            </div>
          </div>
        );
      })()}
      <Result loading={loading} error={error}>
        <DataTable
          headers={headers}
          rows={(data?.rows || []).map((o: any) => {
            const isTerminalOrder = ["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status);
            const selectCell = (
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={!isTerminalOrder && selectedIds.includes(o.id)}
                  disabled={isTerminalOrder}
                  onChange={() => !isTerminalOrder && toggleSelectOrder(o.id)}
                  title={isTerminalOrder ? "Delivered or terminal orders cannot be modified" : `Select order ${o.reference || o.id}`}
                  style={{
                    cursor: isTerminalOrder ? "not-allowed" : "pointer",
                    width: 16,
                    height: 16,
                    accentColor: "#2563eb",
                    opacity: isTerminalOrder ? 0.35 : 1,
                  }}
                />
              </div>
            );
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
            ) : isAdmin && mapUrl ? (
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
            ) : (
              <span
                className={`map-pin-pill ${badgeClass}`}
                style={{ cursor: "default" }}
                title="Lahore Route (Handled by Bookstore Rider)"
              >
                <BadgeIcon size={12} /> {badgeLabel}
              </span>
            );

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
                        <Package size={11} /> {o.courier_name}: {o.courier_tracking_id}{Number(o.actual_courier_charges || 0) > 0 ? ` · Rs. ${Number(o.actual_courier_charges).toLocaleString()}` : ""}
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
            const booksTooltip =
              (o.items || []).length > 0
                ? (o.items || [])
                    .filter((it: any) => isVendor ? (!it.is_unavailable && !it.in_office_stock) : !it.is_unavailable)
                    .map(
                      (it: any) =>
                        `• ${it.code ? `[${it.code}] ` : ""}${it.title || "Book"}${it.quantity > 1 ? ` × ${it.quantity}` : ""}${it.in_office_stock ? " [In Office Shelf]" : ""}`,
                    )
                    .join("\n")
                : `${booksCount} book(s) ordered`;

            const rawOrderItems: any[] = o.items || [];
            const rcvdItemsCount = rawOrderItems
              .filter((it: any) => it.received_from_vendor)
              .reduce((s: number, it: any) => s + (it.quantity || 1), 0);
            const isAllDelivered = booksCount > 0 && rcvdItemsCount === booksCount;
            const hasShortage = booksCount > 0 && rcvdItemsCount < booksCount;
            const isPartiallyDelivered = hasShortage && (rcvdItemsCount > 0 || !!o.vendor_dispatched_at);

            const orderItems: any[] = o.items || [];
            const pendingItems = orderItems.filter((it: any) => !it.received_from_vendor);
            const pendingTooltip =
              pendingItems.length > 0
                ? `Pending from Vendor (${pendingItems.length} book${pendingItems.length === 1 ? "" : "s"}):\n${pendingItems
                    .map(
                      (p: any) =>
                        `• [${p.code}] ${p.title || "Book"}${p.quantity > 1 ? ` × ${p.quantity}` : ""}`,
                    )
                    .join("\n")}`
                : "";

            const booksCell = (
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: 3,
                  cursor: orderItems.length > 0 ? "help" : "default",
                  minWidth: 150,
                  maxWidth: 240,
                }}
                title={booksTooltip}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{booksCount}</strong>{" "}
                  <span className="small-text muted" style={{ fontSize: "0.78rem" }}>
                    {booksCount === 1 ? "book" : "books"}
                  </span>
                  {isPartiallyDelivered && (
                    <span
                      className="mono-pill"
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        background: "rgba(245, 158, 11, 0.15)",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        padding: "1px 6px",
                        borderRadius: 9999,
                      }}
                      title={`${rcvdItemsCount} of ${booksCount} book(s) received at office. ${booksCount - rcvdItemsCount} still pending from vendor.`}
                    >
                      {rcvdItemsCount}/{booksCount} Rcvd
                    </span>
                  )}
                  {isAllDelivered && (
                    <span
                      className="mono-pill"
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        background: "rgba(22, 163, 74, 0.12)",
                        color: "#15803d",
                        border: "1px solid #86efac",
                        padding: "1px 6px",
                        borderRadius: 9999,
                      }}
                      title={`All ${booksCount} book(s) received from vendor`}
                    >
                      ✓ {booksCount === 1 ? "1 Rcvd" : "All Rcvd"}
                    </span>
                  )}
                </div>

                {isPartiallyDelivered && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      flexWrap: "wrap",
                      marginTop: 1,
                    }}
                    title={pendingTooltip}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "#dc2626",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#dc2626",
                          display: "inline-block",
                        }}
                      />
                      Pending:
                    </span>
                    {pendingItems.map((p: any) => (
                      <span
                        key={p.id || p.code}
                        className="mono-pill"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono, monospace)",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#dc2626",
                          border: "1px solid rgba(239, 68, 68, 0.28)",
                          padding: "1px 5px",
                          borderRadius: 4,
                          cursor: "help",
                          whiteSpace: "nowrap",
                        }}
                        title={`${p.code}: ${p.title || "Book"}${p.quantity > 1 ? ` (Qty: ${p.quantity})` : ""}`}
                      >
                        {p.code}
                        {p.quantity > 1 && (
                          <span style={{ opacity: 0.7, fontWeight: 500, marginLeft: 2 }}>
                            ×{p.quantity}
                          </span>
                        )}
                      </span>
                    ))}
                    {pendingItems.length === 1 && pendingItems[0]?.title && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--muted-foreground)",
                          maxWidth: 130,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                        }}
                        title={pendingItems[0].title}
                      >
                        {pendingItems[0].title}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );

            if (isVendor) {
              const orderItems: any[] = (o.items || []).filter(
                (it: any) => !it.is_unavailable && !it.in_office_stock,
              );
              const totalPages = Number(
                o.vendor_pages ??
                orderItems.reduce((s: number, it: any) => s + (Number(it.pages) || 0) * (it.quantity || 1), 0)
              );

              const vPendingItems = orderItems.filter((it: any) => !it.received_from_vendor);
              const vRcvdCount = orderItems.filter((it: any) => !!it.received_from_vendor).length;
              const vIsPartial = vPendingItems.length > 0 && (vRcvdCount > 0 || !!o.vendor_dispatched_at);
              const vIsAllRcvd = orderItems.length > 0 && vRcvdCount === orderItems.length;

              const vendorBooksCell = (
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: 3,
                    minWidth: 150,
                    maxWidth: 240,
                  }}
                  title={booksTooltip}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span
                      className="mono-pill"
                      style={{
                        fontWeight: 700,
                        fontSize: "0.76rem",
                        background: "rgba(59, 130, 246, 0.12)",
                        color: "#1d4ed8",
                        padding: "3px 8px",
                      }}
                    >
                      {booksCount} {booksCount === 1 ? "book" : "books"}
                    </span>
                    {totalPages > 0 && (
                      <span
                        className="mono-pill"
                        style={{
                          fontWeight: 600,
                          fontSize: "0.74rem",
                          background: "var(--muted)",
                          color: "var(--foreground)",
                          padding: "3px 8px",
                        }}
                      >
                        {totalPages.toLocaleString()} pages
                      </span>
                    )}
                  </div>
                  {vIsPartial && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        flexWrap: "wrap",
                        marginTop: 1,
                      }}
                      title={`Office received ${vRcvdCount} of ${orderItems.length} books. Waiting for delivery: ${vPendingItems.map((p: any) => p.code).join(", ")}`}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: "#dc2626",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          textTransform: "uppercase",
                          letterSpacing: "0.02em",
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#dc2626",
                            display: "inline-block",
                          }}
                        />
                        Pending:
                      </span>
                      {vPendingItems.map((p: any) => (
                        <span
                          key={p.id || p.code}
                          className="mono-pill"
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono, monospace)",
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "#dc2626",
                            border: "1px solid rgba(239, 68, 68, 0.28)",
                            padding: "1px 5px",
                            borderRadius: 4,
                            cursor: "help",
                            whiteSpace: "nowrap",
                          }}
                          title={`${p.code}: ${p.title || "Book"}${p.quantity > 1 ? ` (Qty: ${p.quantity})` : ""}`}
                        >
                          {p.code}
                          {p.quantity > 1 && (
                            <span style={{ opacity: 0.7, fontWeight: 500, marginLeft: 2 }}>
                              ×{p.quantity}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {!isOther && vIsAllRcvd && (
                    <span
                      className="mono-pill"
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        background: "rgba(22, 163, 74, 0.10)",
                        color: "#15803d",
                        border: "1px solid #86efac",
                        padding: "1px 6px",
                        width: "fit-content",
                        borderRadius: 9999,
                      }}
                      title="All books in this order have been received by the Bookstore Office"
                    >
                      ✓ All Received by Office
                    </span>
                  )}
                </div>
              );

              const vendorEarningCell = (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 3, cursor: "help", minWidth: 135 }}
                  title={Number(o.actual_courier_charges || 0) > 0
                    ? `Total: Rs. ${(Number(o.vendor_price || 0) + Number(o.actual_courier_charges || 0)).toLocaleString()} (Printing Rs. ${Number(o.vendor_price || 0).toLocaleString()} + Courier Rs. ${Number(o.actual_courier_charges).toLocaleString()})`
                    : `Formula: (${totalPages} pages × Rs. ${o.vendor_per_page_rate ?? 1.6}) + (${booksCount} books × Rs. ${o.vendor_binding_rate ?? 30}) = Rs. ${Number(o.vendor_price || 0).toLocaleString()}`}
                >
                  <strong style={{ fontSize: "0.98rem", color: "#15803d" }}>
                    Rs. {(Number(o.vendor_price || 0) + Number(o.actual_courier_charges || 0)).toLocaleString()}
                  </strong>
                  {Number(o.actual_courier_charges || 0) > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span
                        className="mono-pill"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          background: "rgba(37, 99, 235, 0.12)",
                          color: "var(--primary)",
                          padding: "1px 6px",
                          width: "fit-content",
                        }}
                      >
                        🚚 Courier: Rs. {Number(o.actual_courier_charges).toLocaleString()}
                      </span>
                      <span className="small-text muted" style={{ fontSize: "0.68rem" }}>
                        Print: Rs. {Number(o.vendor_price || 0).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span
                      className="mono-pill"
                      style={{
                        fontSize: "0.68rem",
                        background: "rgba(22, 163, 74, 0.08)",
                        color: "#166534",
                        border: "1px dashed rgba(22, 163, 74, 0.3)",
                        padding: "1px 6px",
                        width: "fit-content",
                      }}
                    >
                      ({totalPages}p × {o.vendor_per_page_rate ?? 1.6} + {booksCount}b × {o.vendor_binding_rate ?? 30})
                    </span>
                  )}
                </div>
              );

              const vendorStatusCell = (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Status value={o.status} />
                  {o.status === "PROCESSING" && !vIsAllRcvd && !o.vendor_dispatched_at && (
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
                          background: o.vendor_printed_at ? "rgba(245, 158, 11, 0.12)" : "rgba(22, 163, 74, 0.12)",
                          color: o.vendor_printed_at ? "#b45309" : "#15803d",
                          border: o.vendor_printed_at ? "1px solid #fde68a" : "1px solid #86efac",
                          transition: "all 0.15s ease",
                          width: "fit-content",
                        }}
                        title={o.vendor_printed_at ? "Click to unmark as printed" : "Click to mark as printed"}
                      >
                        {o.vendor_printed_at ? <RotateCcw size={11} /> : <CheckCircle2 size={11} color="currentColor" />}
                        {printingBusyId === o.id ? "Saving…" : o.vendor_printed_at ? "Unmark Printed" : "Mark as Printed"}
                      </button>
                    </div>
                  )}
                </div>
              );

              return [
                selectCell,
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
                vendorEarningCell,
                formatDateDMY(o.created_at),
                vendorStatusCell,
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
                        <Package size={11} /> {o.courier_name}: {o.courier_tracking_id}{Number(o.actual_courier_charges || 0) > 0 ? ` · Rs. ${Number(o.actual_courier_charges).toLocaleString()}` : ""}
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
                        <Building2 size={12} /> Send to Campus
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
                        title="Batch dispatched to Campus"
                      >
                        <Building2 size={12} /> Sent to Campus ✓
                      </span>
                    ) : (
                      <span
                        className="map-pin-pill campus-badge"
                        style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                        title="Deliver this batch to Campus"
                      >
                        <Building2 size={12} /> Send to Campus
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
                        title={`Printed on ${formatDateDMY(o.vendor_printed_at)}`}
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
                        title="Pending print"
                      >
                        <Clock size={11} /> In Printing Queue
                      </span>
                    )}
                    {canUpdate && (
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
                          fontSize: "0.70rem",
                          fontWeight: 600,
                          padding: "1px 7px",
                          borderRadius: 9999,
                          cursor: "pointer",
                          background: o.vendor_printed_at ? "rgba(245, 158, 11, 0.12)" : "rgba(22, 163, 74, 0.12)",
                          color: o.vendor_printed_at ? "#b45309" : "#15803d",
                          border: o.vendor_printed_at ? "1px solid #fde68a" : "1px solid #86efac",
                          transition: "all 0.15s ease",
                          width: "fit-content",
                        }}
                        title={o.vendor_printed_at ? "Click to unmark as printed" : "Click to mark as printed"}
                      >
                        {o.vendor_printed_at ? <RotateCcw size={10} /> : <CheckCircle2 size={10} color="currentColor" />}
                        {printingBusyId === o.id ? "Saving…" : o.vendor_printed_at ? "Unmark" : "Mark Printed"}
                      </button>
                    )}
                  </div>
                )}
                {o.vendor_dispatched_at && (
                  <div style={{ marginTop: 4 }}>
                    {isPartiallyDelivered ? (
                      <span
                        className="mono-pill"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.70rem",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 9999,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          width: "fit-content",
                        }}
                        title={`Partially received in Campus: ${rcvdItemsCount} of ${booksCount} books arrived. ${booksCount - rcvdItemsCount} book(s) missing or misprinted.`}
                      >
                        <Building2 size={10} /> Partially Received in Campus ({rcvdItemsCount}/{booksCount})
                      </span>
                    ) : (
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
                        title={`Received in Campus from vendor on ${formatDateDMY(o.vendor_dispatched_at)}`}
                      >
                        <Building2 size={10} /> Received in Campus ✓
                      </span>
                    )}
                  </div>
                )}
              </div>
            );

            return isPendingView
              ? [
                  selectCell,
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
                    {isAdmin && (Number(o.refund_due || 0) > 0 || o.refund_status === "REFUND_PENDING") && (
                      <span
                        className="mono-pill"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          background: "#fee2e2",
                          color: "#b91c1c",
                          border: "1.5px solid #f87171",
                          padding: "2px 6px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 3,
                          borderRadius: 4,
                          width: "fit-content",
                        }}
                        title={`Student paid advance. Excess amount to return: ${money(o.refund_due)}${o.refund_note ? ` (${o.refund_note})` : ""}`}
                      >
                        💸 Return to Student: {money(o.refund_due)}
                      </span>
                    )}
                  </div>,
                  booksCell,
                  formatDateDMY(o.created_at),
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{money(o.total)}</strong>
                    {isAdmin && Number(o.due_amount || 0) > 0 && (
                      <span
                        className="mono-pill"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          padding: "1px 5px",
                          width: "fit-content",
                        }}
                        title={`Paid: ${money(o.amount_paid || 0)} · Due: ${money(o.due_amount)}`}
                      >
                        Due: {money(o.due_amount)}
                      </span>
                    )}
                  </div>,
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
                  selectCell,
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <strong>{money(o.total)}</strong>
                    {isAdmin && Number(o.due_amount || 0) > 0 && (
                      <span
                        className="mono-pill"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          padding: "1px 5px",
                          width: "fit-content",
                        }}
                        title={`Paid: ${money(o.amount_paid || 0)} · Due: ${money(o.due_amount)}`}
                      >
                        Due: {money(o.due_amount)}
                      </span>
                    )}
                    {isAdmin && (Number(o.refund_due || 0) > 0 || o.refund_status === "REFUND_PENDING") && (
                      <span
                        className="mono-pill"
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                          padding: "1px 5px",
                          width: "fit-content",
                        }}
                        title={`Student refund pending: ${money(o.refund_due)}`}
                      >
                        Refund Due: {money(o.refund_due)}
                      </span>
                    )}
                  </div>,
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
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "nowrap",
                          }}
                        >
                          {o.status === "PROCESSING" &&
                            (!isOtherCityOrder(o) ? (
                              <button
                                type="button"
                                className="btn compact"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  background: "#2563eb",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                                disabled={quickShippingId === o.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickShip(o);
                                }}
                                title="Books received at office; mark as Shipped to student"
                              >
                                <Truck size={12} />
                                {quickShippingId === o.id ? "Saving…" : "Mark Shipped"}
                              </button>
                            ) : o.courier_name && o.courier_tracking_id ? (
                              <button
                                type="button"
                                className="courier-tracking-pill"
                                style={{ fontSize: "0.72rem", padding: "2px 7px" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCourierOrder(o);
                                }}
                                title={`Shipped via ${o.courier_name} (${o.courier_tracking_id}). Click to edit.`}
                              >
                                <Truck size={11} /> {o.courier_name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn compact"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  padding: "3px 9px",
                                  borderRadius: 9999,
                                  background: "#0284c7",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCourierOrder(o);
                                }}
                                title="Add external courier tracking to dispatch parcel"
                              >
                                <Truck size={12} /> Ship Courier
                              </button>
                            ))}
                          {o.status === "SHIPPED" && (
                            <button
                              type="button"
                              className="btn compact"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                padding: "3px 9px",
                                borderRadius: 9999,
                                background: "#059669",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                              disabled={markingDeliveredId === o.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkDelivered(o);
                              }}
                              title="Mark this order as Delivered to student"
                            >
                              <CheckCircle2 size={12} />
                              {markingDeliveredId === o.id ? "Saving…" : "Mark Delivered"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn compact danger-button icon-only order-delete-btn"
                            title="Delete order"
                            onClick={() => setDeletingOrder(o)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>,
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
        title={`Send Order ${dispatchOfficeOrder?.reference || ""} to Campus?`}
        description="Mark this Lahore / VU Qanchi Campus order as printed and sent to the Campus Office. The admin will be notified and can track receipt."
        onConfirm={handleDispatchOffice}
      />
      {removingQueueOrder && (
        <VendorRemoveQueueModal
          order={removingQueueOrder}
          onClose={() => setRemovingQueueOrder(null)}
          onSuccess={reload}
        />
      )}
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
    [busy, setBusy] = useState(false),
    [partialPaidInput, setPartialPaidInput] = useState<string>(""),
    [partialDueNote, setPartialDueNote] = useState<string>(""),
    [removeQueueOpen, setRemoveQueueOpen] = useState(false);

  useEffect(() => {
    if (o && o.status === "PAYMENT_PENDING") {
      const defaultVal = o.detected_amount ? o.detected_amount / 100 : o.total / 100;
      setPartialPaidInput(String(defaultVal));
      setPartialDueNote("");
    }
  }, [o?.id, o?.status, o?.total, o?.detected_amount]);

  const admin = user.role === "SUPER_ADMIN",
    isVendor = user.role === "VENDOR",
    canUpdate = admin || isVendor || user.permissions.includes("orders.update");
  const act = async (
    action: string,
    status?: string,
    amountPaid?: number,
    dueNote?: string,
  ) => {
    try {
      await api("manage/orders/" + id, {
        action,
        status,
        note,
        amount_paid: amountPaid,
        due_note: dueNote,
        version: o.version,
      });
      setNote("");
      setNext("");
      toast.success("Order updated.");
      notifyOrdersUpdated();
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
                        notifyOrdersUpdated();
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
                          notifyOrdersUpdated();
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

                  </>
                )}
              </div>
            </div>
          )}

          <div className="checkout-grid">
            {isVendor ? (
              <div className="stack no-print">
                <VendorOrderBooksPanel o={o} onUpdated={reload} />
              </div>
            ) : (
              <>
                <div className="print-only">
                  <OrderReceipt o={o} />
                </div>
                <div className="stack no-print">
                  <AdminOrderBooksPanel o={o} user={user} onUpdated={reload} />
                  <SuperAdminDueManagementPanel o={o} user={user} onUpdated={reload} />
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
                      <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total books to print:</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {o.total_books ?? ((o.items || []).filter((it: any) => !it.is_unavailable && !it.in_office_stock).reduce((s: number, it: any) => s + (it.quantity || 1), 0))}{" "}
                        {Number(o.total_books ?? ((o.items || []).filter((it: any) => !it.is_unavailable && !it.in_office_stock).reduce((s: number, it: any) => s + (it.quantity || 1), 0))) === 1 ? "book" : "books"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Total pages:</span>
                      <strong style={{ fontSize: "0.95rem" }}>
                        {Number(o.vendor_pages ?? ((o.items || []).filter((it: any) => !it.is_unavailable && !it.in_office_stock).reduce((s: number, it: any) => s + (Number(it.pages) || 0) * (it.quantity || 1), 0))).toLocaleString()} pages
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px dashed var(--border)" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--foreground)" }}>Vendor Earning:</span>
                      <strong style={{ fontSize: "1.1rem", color: "#15803d" }}>
                        Rs. {Number(o.vendor_price || 0).toLocaleString()}
                      </strong>
                    </div>
                    {o.vendor_rate_breakdown?.formula && (
                      <div style={{ fontSize: "0.76rem", color: "var(--muted-foreground)", background: "rgba(22, 163, 74, 0.08)", padding: "5px 8px", borderRadius: 6, border: "1px dashed rgba(22, 163, 74, 0.25)" }}>
                        Calculation: {o.vendor_rate_breakdown.formula}
                      </div>
                    )}
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
                    {o.status === "PROCESSING" && !o.vendor_dispatched_at && !(o.items && o.items.length > 0 && o.items.every((it: any) => Boolean(it.received_from_vendor))) && (
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
                    )}
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
                              notifyOrdersUpdated();
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
                      <strong>🏛️ Send to Campus:</strong>
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
                              toast.success("Order dispatched to Campus ✓");
                              await reload();
                            } catch (e) {
                              toast.error(errorText(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                          style={{ gap: 6, background: "#2563eb" }}
                        >
                          <Building2 size={14} /> Send to Campus
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
                            <Building2 size={12} /> Sent to Campus ✓
                          </span>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                            Batch sent to Campus for student delivery
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

                  {admin && o.status === "PAYMENT_PENDING" && (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "rgba(37, 99, 235, 0.05)",
                        border: "1px solid rgba(37, 99, 235, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        margin: "4px 0",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>Amount Received / Paid (PKR):</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={partialPaidInput}
                          onChange={(e) => setPartialPaidInput(e.target.value)}
                          style={{ width: "130px", textAlign: "right", fontWeight: 700, padding: "5px 8px" }}
                        />
                      </div>

                      {(() => {
                        const enteredCents = Math.round(Number(partialPaidInput || 0) * 100);
                        const dueCents = Math.max(0, (o.total || 0) - enteredCents);
                        if (dueCents > 0) {
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  background: "rgba(245, 158, 11, 0.12)",
                                  border: "1px solid #fde68a",
                                  color: "#b45309",
                                  fontSize: "0.82rem",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span>⚠️ Remaining Due Margin:</span>
                                <strong>{money(dueCents)}</strong>
                              </div>
                              <Field label="Private Due Note (Super Admin only)">
                                <input
                                  value={partialDueNote}
                                  onChange={(e) => setPartialDueNote(e.target.value)}
                                  placeholder="e.g. Rs. 100 pending - will collect on delivery"
                                  style={{ fontSize: "0.84rem" }}
                                />
                              </Field>
                            </div>
                          );
                        }
                        return (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "#15803d",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CheckCircle2 size={13} /> Full amount received ({money(enteredCents)}). No balance due.
                          </div>
                        );
                      })()}
                    </div>
                  )}

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
                  {admin && o.status === "PAYMENT_PENDING" && (() => {
                    const enteredCents = Math.round(Number(partialPaidInput || 0) * 100);
                    const dueCents = Math.max(0, (o.total || 0) - enteredCents);
                    const isPartial = dueCents > 0;
                    return (
                      <div className="actions">
                        <button
                          className="btn compact primary"
                          style={{ background: isPartial ? "#d97706" : undefined }}
                          onClick={() =>
                            setDecision({
                              action: "approve",
                              label: isPartial
                                ? `Approve with Partial Payment (${money(dueCents)} Due)`
                                : "Approve Payment",
                              amount_paid: enteredCents,
                              due_amount: dueCents,
                              due_note: partialDueNote,
                            })
                          }
                        >
                          {isPartial
                            ? `Approve Partial (${money(dueCents)} Due)`
                            : "Approve Payment"}
                        </button>
                        <button
                          className="btn compact"
                          onClick={() => setDecision({ action: "reject", label: "Reject Payment" })}
                        >
                          Reject Payment
                        </button>
                        <button
                          className="btn compact"
                          onClick={() => setDecision({ action: "request", label: "Request New Slip" })}
                        >
                          Request New Slip
                        </button>
                        <button
                          className="btn compact"
                          onClick={() => setDecision({ action: "manual", label: "Manual Review" })}
                        >
                          Manual Review
                        </button>
                      </div>
                    );
                  })()}
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
                ? decision?.due_amount > 0
                  ? `Confirm approving order with partial payment of ${money(decision.amount_paid)}. A remaining balance of ${money(decision.due_amount)} will be recorded as pending due.`
                  : "Confirm only after checking the bank transaction. Approval confirms the order."
                : "This decision will be recorded in the order history and audit log."
            }
            onConfirm={() =>
              act(
                decision.action,
                decision.status,
                decision.amount_paid,
                decision.due_note,
              )
            }
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
          {removeQueueOpen && (
            <VendorRemoveQueueModal
              order={o}
              onClose={() => setRemoveQueueOpen(false)}
              onSuccess={reload}
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


function VendorPendingBooksModal({
  vendor,
  onClose,
}: {
  vendor: any;
  onClose: () => void;
}) {
  const { data, loading, error } = useData<any>(
    `manage/vendor-pending-books?vendor_id=${vendor.id}`
  );

  const [filterTab, setFilterTab] = useState<"ALL" | "SHORTAGE" | "PRINTING">("ALL");

  const pendingBooks: any[] = data?.pendingBooks || [];
  const totalQty = data?.totalPendingQty ?? 0;
  const totalShortageQty = data?.totalShortageQty ?? 0;
  const totalPrintingQty = data?.totalPrintingQty ?? 0;
  const totalTitles = data?.totalPendingTitles ?? 0;
  const whatsappUrl = data?.whatsappUrl;
  const whatsappMessage = data?.whatsappMessage || "";

  const filteredBooks = pendingBooks.filter((b) => {
    if (filterTab === "SHORTAGE") return (b.shortageQty || 0) > 0;
    if (filterTab === "PRINTING") return (b.printingQty || 0) > 0;
    return true;
  });

  const copyToClipboard = () => {
    if (!whatsappMessage) return;
    navigator.clipboard.writeText(whatsappMessage);
    toast.success("Pending books checklist copied to clipboard ✓");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ maxWidth: 640 }}>
        <DialogHeader>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: "rgba(37, 99, 235, 0.12)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClipboardList size={20} />
            </div>
            <div>
              <DialogTitle style={{ fontSize: "1.15rem", margin: 0 }}>
                Pending Books Checklist — {vendor.name}
              </DialogTitle>
              <DialogDescription style={{ fontSize: "0.82rem", marginTop: 2 }}>
                Books pending for Campus & Lahore orders (excluding Other City courier parcels)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Result loading={loading} error={error}>
          {pendingBooks.length === 0 ? (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                background: "rgba(22, 163, 74, 0.06)",
                borderRadius: 8,
                border: "1px dashed #86efac",
              }}
            >
              <CheckCircle2 size={36} color="#16a34a" style={{ margin: "0 auto 8px" }} />
              <strong style={{ display: "block", color: "#15803d", fontSize: "1rem" }}>
                All Campus Books Received!
              </strong>
              <p className="small-text muted" style={{ marginTop: 4 }}>
                There are no pending books waiting from {vendor.name} for Campus. All batches fulfilled.
              </p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {/* Filter Tabs / Pills */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  background: "var(--muted)",
                  padding: "10px 14px",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn compact ${filterTab === "ALL" ? "primary" : ""}`}
                    style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: 9999 }}
                    onClick={() => setFilterTab("ALL")}
                  >
                    All Pending ({totalQty})
                  </button>
                  {totalShortageQty > 0 && (
                    <button
                      type="button"
                      className="btn compact"
                      style={{
                        fontSize: "0.78rem",
                        padding: "3px 10px",
                        borderRadius: 9999,
                        background: filterTab === "SHORTAGE" ? "#dc2626" : "rgba(239, 68, 68, 0.12)",
                        color: filterTab === "SHORTAGE" ? "#fff" : "#dc2626",
                        borderColor: filterTab === "SHORTAGE" ? "#dc2626" : "rgba(239, 68, 68, 0.3)",
                        fontWeight: 700,
                      }}
                      onClick={() => setFilterTab("SHORTAGE")}
                    >
                      🔴 Office Shortage ({totalShortageQty})
                    </button>
                  )}
                  {totalPrintingQty > 0 && (
                    <button
                      type="button"
                      className="btn compact"
                      style={{
                        fontSize: "0.78rem",
                        padding: "3px 10px",
                        borderRadius: 9999,
                        background: filterTab === "PRINTING" ? "#d97706" : "rgba(245, 158, 11, 0.12)",
                        color: filterTab === "PRINTING" ? "#fff" : "#b45309",
                        borderColor: filterTab === "PRINTING" ? "#d97706" : "rgba(245, 158, 11, 0.3)",
                        fontWeight: 600,
                      }}
                      onClick={() => setFilterTab("PRINTING")}
                    >
                      🟡 In Printing ({totalPrintingQty})
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                  Across <strong>{totalTitles}</strong> course title{totalTitles !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Table of Pending Books (No order references, clean 4 columns) */}
              <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", width: 35 }}>#</th>
                      <th style={{ padding: "8px 10px", width: 90 }}>Code</th>
                      <th style={{ padding: "8px 10px" }}>Title / Course</th>
                      <th style={{ padding: "8px 10px", width: 140 }}>Status / Category</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", width: 70 }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((b: any, idx: number) => {
                      const isShortage = (b.shortageQty || 0) > 0;
                      const isPrinting = (b.printingQty || 0) > 0;
                      return (
                        <tr
                          key={b.code + idx}
                          style={{
                            borderBottom: idx < filteredBooks.length - 1 ? "1px solid var(--border)" : "none",
                            background: isShortage
                              ? "rgba(239, 68, 68, 0.04)"
                              : idx % 2 === 0
                                ? "transparent"
                                : "var(--muted)",
                          }}
                        >
                          <td style={{ padding: "7px 10px", color: "var(--muted-foreground)" }}>{idx + 1}</td>
                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                            <span
                              className="mono-pill"
                              style={{
                                fontWeight: 700,
                                fontSize: "0.76rem",
                                background: isShortage ? "rgba(239, 68, 68, 0.12)" : "rgba(37, 99, 235, 0.10)",
                                color: isShortage ? "#dc2626" : "var(--primary)",
                              }}
                            >
                              {b.code}
                            </span>
                          </td>
                          <td style={{ padding: "7px 10px", fontWeight: 500 }}>{b.title || "—"}</td>
                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                            {isShortage && isPrinting ? (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                <span className="mono-pill" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", fontWeight: 700, fontSize: "0.70rem", padding: "1px 6px" }}>
                                  🔴 Shortage: {b.shortageQty}
                                </span>
                                <span className="mono-pill" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#b45309", fontWeight: 600, fontSize: "0.70rem", padding: "1px 6px" }}>
                                  🟡 Printing: {b.printingQty}
                                </span>
                              </div>
                            ) : isShortage ? (
                              <span className="mono-pill" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", fontWeight: 700, fontSize: "0.72rem", padding: "2px 7px" }}>
                                🔴 Office Shortage ({b.shortageQty})
                              </span>
                            ) : (
                              <span className="mono-pill" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#b45309", fontWeight: 600, fontSize: "0.72rem", padding: "2px 7px" }}>
                                🟡 In Printing
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "7px 10px", textAlign: "right" }}>
                            <span
                              className="mono-pill"
                              style={{
                                fontWeight: 800,
                                fontSize: "0.82rem",
                                background: isShortage ? "rgba(239, 68, 68, 0.15)" : "rgba(37, 99, 235, 0.12)",
                                color: isShortage ? "#dc2626" : "#1d4ed8",
                                padding: "2px 8px",
                              }}
                            >
                              {b.totalQty}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                <button
                  type="button"
                  className="btn compact"
                  onClick={copyToClipboard}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <Copy size={13} /> Copy Text Checklist
                </button>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button type="button" className="btn compact" onClick={onClose}>
                    Close
                  </button>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn compact primary"
                      style={{
                        background: "#25D366",
                        borderColor: "#25D366",
                        color: "#fff",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        textDecoration: "none",
                      }}
                      title="Send consolidated checklist directly to vendor on WhatsApp"
                    >
                      <MessageCircle size={14} /> Send via WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </Result>
      </DialogContent>
    </Dialog>
  );
}

function Vendors() {
  const { data, error, loading, reload } = useData<any[]>("manage/vendors");
  const [edit, setEdit] = useState<any>(null);
  const [remove, setRemove] = useState<any>(null);
  const [ledgerVendor, setLedgerVendor] = useState<any>(null);
  const [pendingBooksVendor, setPendingBooksVendor] = useState<any>(null);
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
  const totalCourierCharges = vendors.reduce(
    (sum, v) => sum + (Number(v.total_courier_charges) || 0),
    0,
  );
  const totalPrintingCost = vendors.reduce(
    (sum, v) => sum + (Number(v.total_printing_cost) || 0),
    0,
  );
  const totalEarningsGenerated = vendors.reduce(
    (sum, v) => sum + (Number(v.total_earnings) || 0),
    0,
  );
  const totalPaidToVendors = vendors.reduce(
    (sum, v) => sum + (Number(v.total_paid) || 0),
    0,
  );
  const totalPendingBalance = vendors.reduce(
    (sum, v) => sum + (Number(v.pending_balance) || 0),
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
      <div
        className="metrics vendors-metrics"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="metric metric-blue">
          <div className="metric-heading">
            <span>Total Vendors</span>
            <span className="metric-icon">
              <Factory size={19} />
            </span>
          </div>
          <strong>{totalVendors}</strong>
          <small>{activeVendors} active printing partner{activeVendors !== 1 ? "s" : ""}</small>
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

        <div className="metric metric-sky">
          <div className="metric-heading">
            <span>Courier Charges</span>
            <span className="metric-icon">
              <Truck size={19} />
            </span>
          </div>
          <strong style={{ color: "var(--primary)" }}>Rs. {totalCourierCharges.toLocaleString()}</strong>
          <small>Total courier charges for other cities</small>
        </div>

        <div className="metric metric-blue">
          <div className="metric-heading">
            <span>Total Generated (Khata)</span>
            <span className="metric-icon">
              <Coins size={19} />
            </span>
          </div>
          <strong>Rs. {totalEarningsGenerated.toLocaleString()}</strong>
          <small>Printing Rs. {totalPrintingCost.toLocaleString()} + Courier Rs. {totalCourierCharges.toLocaleString()}</small>
        </div>

        <div className="metric metric-emerald">
          <div className="metric-heading">
            <span>Total Paid</span>
            <span className="metric-icon">
              <CheckCircle2 size={19} />
            </span>
          </div>
          <strong style={{ color: "var(--status-good-text)" }}>Rs. {totalPaidToVendors.toLocaleString()}</strong>
          <small>Disbursed to all vendors</small>
        </div>

        <div className={`metric ${totalPendingBalance > 0 ? "metric-amber" : "metric-emerald"}`}>
          <div className="metric-heading">
            <span>Pending Balance</span>
            <span className="metric-icon">
              <Receipt size={19} />
            </span>
          </div>
          <strong style={{ color: totalPendingBalance > 0 ? "var(--status-warn-text)" : "var(--status-good-text)" }}>
            Rs. {totalPendingBalance.toLocaleString()}
          </strong>
          <small>{totalPendingBalance > 0 ? "Remaining payable" : "All cleared"}</small>
        </div>
      </div>

      <div
        className="toolbar orders-toolbar"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: "1 1 auto" }}>
          <button
            type="button"
            className="btn primary compact"
            onClick={() =>
              setEdit({
                name: "",
                phone: "",
                email: "",
                password: "",
                address: "",
                per_page_rate: 1.6,
                binding_rate: 30,
                active: true,
              })
            }
          >
            <Plus size={16} />
            Add Vendor Partner
          </button>

          <div className="toolbar-search-box" style={{ maxWidth: 380, flex: "1 1 240px" }}>
            <Search size={15} className="toolbar-search-icon" />
            <input
              type="text"
              aria-label="Search vendors"
              placeholder="Search vendor name, phone, email, address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="toolbar-search-input"
            />
            {search && (
              <button
                type="button"
                className="toolbar-search-clear"
                onClick={() => setSearch("")}
                title="Clear search"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn compact"
            onClick={() => reload()}
            disabled={loading}
            title="Refresh vendor list"
          >
            <RefreshCw size={14} className={loading ? "refresh-spinning" : undefined} />
            Refresh
          </button>
        </div>
      </div>

      <Result loading={loading} error={error}>
        <DataTable
          headers={[
            "Vendor Partner",
            "Contact & WhatsApp",
            "Pricing Rates",
            "Ledger & Balance",
            "Active Workload",
            "Portal Access",
            "Actions",
          ]}
          rows={filtered.map((v) => {
            const waNumber = formatWhatsAppPhone(v.phone || "");
            const waHref = waNumber ? `https://wa.me/${waNumber}` : null;
            return [
              <div key={`vendor-${v.id}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <strong style={{ fontSize: "0.93rem" }}>{v.name}</strong>
                <span className="mono small-text" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                  {v.email}
                </span>
              </div>,

              <div key={`contact-${v.id}`} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
                <span className="mono" style={{ fontSize: "0.84rem" }}>{v.phone || "—"}</span>
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="btn compact"
                    style={{
                      padding: "2px 7px",
                      height: 24,
                      fontSize: "0.74rem",
                      gap: 4,
                      color: "#16a34a",
                      borderColor: "rgba(22, 163, 74, 0.3)",
                      background: "rgba(22, 163, 74, 0.08)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    title={`Open WhatsApp chat with ${v.name}`}
                  >
                    <MessageCircle size={12} />
                    WhatsApp
                  </a>
                )}
              </div>,

              <div key={`rates-${v.id}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <strong style={{ fontSize: "0.88rem" }}>Rs. {Number(v.per_page_rate ?? 1.6).toFixed(2)}</strong>
                  <span className="small-text muted">/ page</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted-foreground)" }}>Rs. {Number(v.binding_rate ?? 30).toFixed(2)}</span>
                  <span className="small-text muted">/ binding</span>
                </div>
              </div>,

              <div key={`ledger-${v.id}`} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 175 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.80rem" }}>
                  <span className="muted">Printing:</span>
                  <span>Rs. {Number(v.total_printing_cost || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.80rem" }}>
                  <span className="muted">Courier:</span>
                  <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                    Rs. {Number(v.total_courier_charges || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.82rem", borderTop: "1px dashed var(--border)", paddingTop: 2 }}>
                  <strong style={{ fontSize: "0.84rem" }}>Total Earned:</strong>
                  <strong style={{ fontSize: "0.86rem" }}>Rs. {Number(v.total_earnings || 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.78rem" }}>
                  <span className="muted">Paid:</span>
                  <span style={{ color: "#15803d", fontWeight: 600 }}>
                    Rs. {Number(v.total_paid || 0).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.78rem" }}>
                  <span className="muted">Balance:</span>
                  <span
                    className="mono-pill"
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 6px",
                      background: (v.pending_balance || 0) > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(22, 163, 74, 0.12)",
                      color: (v.pending_balance || 0) > 0 ? "#b45309" : "#15803d",
                    }}
                  >
                    Rs. {Number(v.pending_balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>,

              <div key={`workload-${v.id}`} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
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
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  background: v.active ? "rgba(22, 163, 74, 0.12)" : "var(--muted)",
                  color: v.active ? "#15803d" : "var(--muted-foreground)",
                }}
              >
                {v.active ? "Active" : "Disabled"}
              </span>,

              <div
                className="row-actions"
                key={`act-${v.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "nowrap",
                }}
              >
                <button
                  type="button"
                  className="btn compact"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: "0.75rem",
                    padding: "4px 9px",
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "1px solid #1d4ed8",
                    fontWeight: 600,
                    textDecoration: "none",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                  }}
                  onClick={() => setLedgerVendor(v)}
                  title={`Open payment ledger and record disbursements for ${v.name}`}
                >
                  <Receipt size={13} color="#ffffff" strokeWidth={2.2} />
                  <span style={{ color: "#ffffff", textDecoration: "none", fontWeight: 600 }}>Ledger</span>
                </button>
                <button
                  type="button"
                  className="btn compact"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.75rem",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(37, 99, 235, 0.08)",
                    color: "var(--primary)",
                    border: "1px solid rgba(37, 99, 235, 0.3)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => setPendingBooksVendor(v)}
                  title={`View pending books checklist for ${v.name}`}
                >
                  <ClipboardList size={13} />
                  <span>Pending</span>
                </button>
                <button
                  onClick={() =>
                    setEdit({
                      id: v.id,
                      name: v.name,
                      phone: v.phone,
                      email: v.email,
                      address: v.address || "",
                      per_page_rate: v.per_page_rate ?? 1.6,
                      binding_rate: v.binding_rate ?? 30,
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
        <DialogContent
          style={{
            maxWidth: 660,
            width: "95vw",
            maxHeight: "92vh",
            overflowY: "auto",
            padding: "22px 26px",
          }}
        >
          <DialogHeader style={{ marginBottom: 10 }}>
            <DialogTitle style={{ fontSize: "1.2rem" }}>
              {edit?.id ? "Edit Vendor Partner" : "Add Vendor Partner"}
            </DialogTitle>
            <DialogDescription style={{ fontSize: "0.84rem" }}>
              {edit?.id
                ? "Update vendor contact details, pricing rates, or set a new password."
                : "Create a new printing vendor partner with portal credentials and custom printing rates."}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <form
              style={{ display: "flex", flexDirection: "column", gap: 13 }}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const perPageNum = Number(edit.per_page_rate);
                  const bindingRateNum = Number(edit.binding_rate);
                  const payload: any = {
                    name: edit.name,
                    phone: edit.phone,
                    address: edit.address || null,
                    per_page_rate: !isNaN(perPageNum) && perPageNum > 0 ? perPageNum : 1.6,
                    binding_rate: !isNaN(bindingRateNum) && bindingRateNum >= 0 ? bindingRateNum : 30,
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
              {/* Row 1: Name and WhatsApp Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
              </div>

              {/* Row 2: Login email and password */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field
                  label="Login email address"
                  hint={edit.id ? "Email cannot be changed." : "Used to sign in at /vendor/login"}
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
                  hint={edit.id ? "Leave blank to keep existing." : "Min 6 characters"}
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
              </div>

              {/* Row 3: Pricing Rates (Per Page & Binding Cost) */}
              <div
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "10px 14px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)" }}>
                    Printing Rates (Hidden From Vendor)
                  </span>
                  <span className="small-text muted" style={{ fontSize: "0.75rem" }}>
                    Used for auto-calculating vendor earnings
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field
                    label="Per Page Rate (Rs.)"
                    hint="Default: Rs. 1.60 / page"
                  >
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="1.60"
                      value={edit.per_page_rate}
                      onChange={(e) => setEdit({ ...edit, per_page_rate: e.target.value })}
                    />
                  </Field>

                  <Field
                    label="Binding Cost (Rs. per book)"
                    hint="Default: Rs. 30.00 / book"
                  >
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      placeholder="30.00"
                      value={edit.binding_rate}
                      onChange={(e) => setEdit({ ...edit, binding_rate: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              {/* Row 4: Address */}
              <Field label="Press / Workshop address" hint="Physical location or city notes">
                <input
                  placeholder="e.g. Shop # 4, Urdu Bazaar, Lahore"
                  value={edit.address}
                  onChange={(e) => setEdit({ ...edit, address: e.target.value })}
                />
              </Field>

              {/* Row 5: Footer Actions & Active Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: edit.id ? "space-between" : "flex-end",
                  gap: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                  marginTop: 2,
                }}
              >
                {edit.id ? (
                  <div className="toggle-row" style={{ margin: 0 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 550 }}>Portal access active</span>
                    <Switch
                      checked={edit.active}
                      onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                    />
                  </div>
                ) : null}

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setEdit(null)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn primary" disabled={busy}>
                    {busy ? "Saving…" : edit.id ? "Save vendor" : "Create vendor partner"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {ledgerVendor && (
        <VendorLedgerModal
          vendor={ledgerVendor}
          onClose={() => setLedgerVendor(null)}
          onUpdated={() => reload()}
        />
      )}
      {pendingBooksVendor && (
        <VendorPendingBooksModal
          vendor={pendingBooksVendor}
          onClose={() => setPendingBooksVendor(null)}
        />
      )}

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

function VendorLedgerModal({
  vendor,
  onClose,
  onUpdated,
}: {
  vendor: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { data: ledger, error, loading, reload } = useData<VendorLedger>(
    `manage/vendor-ledger?vendor_id=${vendor.id}`,
  );
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const summary = ledger?.summary || {
    total_orders: 0,
    total_pages: 0,
    total_books: 0,
    per_page_rate: vendor.per_page_rate ?? 1.6,
    binding_rate: vendor.binding_rate ?? 30,
    total_printing_cost: 0,
    total_courier_charges: 0,
    courier_orders_count: 0,
    total_earned: vendor.total_earnings ?? 0,
    total_paid: vendor.total_paid ?? 0,
    pending_balance: vendor.pending_balance ?? 0,
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a valid payment amount greater than 0");
      return;
    }
    setSaving(true);
    try {
      await api("manage/vendor-payments", {
        vendor_id: vendor.id,
        amount: parsedAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(`Payment of Rs. ${parsedAmount.toLocaleString()} recorded for ${vendor.name}`);
      setAmount("");
      setReference("");
      setNotes("");
      await reload();
      onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await api(`manage/vendor-payments/${paymentId}`, {}, "DELETE");
      toast.success("Payment entry deleted.");
      setDeletingPaymentId(null);
      await reload();
      onUpdated();
    } catch (err) {
      toast.error(errorText(err));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ maxWidth: 840, maxHeight: "90vh", overflowY: "auto" }}>
        <DialogHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <DialogTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.2rem" }}>
                <Receipt size={20} style={{ color: "var(--primary)" }} />
                <span>Vendor Ledger — {vendor.name}</span>
              </DialogTitle>
              <DialogDescription style={{ marginTop: 4 }}>
                Financial balance, auto-calculated order earnings, and payment disbursements.
              </DialogDescription>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="mono-pill" style={{ fontSize: "0.76rem" }}>
                Per page: Rs. {Number(summary.per_page_rate).toFixed(2)}
              </span>
              <span className="mono-pill" style={{ fontSize: "0.76rem" }}>
                Binding: Rs. {Number(summary.binding_rate).toFixed(2)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <Result loading={loading} error={error}>
          {/* Summary Cards */}
          <div
            className="metrics"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              margin: "12px 0 20px",
            }}
          >
            <div className="metric metric-blue">
              <span style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                Total Earned (Khata)
              </span>
              <strong style={{ fontSize: "1.35rem", margin: "4px 0" }}>
                Rs. {summary.total_earned.toLocaleString()}
              </strong>
              <small style={{ color: "var(--muted-foreground)" }}>
                Printing Rs. {((summary.total_printing_cost !== undefined ? summary.total_printing_cost : (summary.total_earned - (summary.total_courier_charges || 0)))).toLocaleString()} + Courier Rs. {(summary.total_courier_charges || 0).toLocaleString()}
              </small>
            </div>

            <div className="metric metric-sky">
              <span style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                Courier Charges
              </span>
              <strong style={{ fontSize: "1.35rem", margin: "4px 0", color: "var(--primary)" }}>
                Rs. {(summary.total_courier_charges || 0).toLocaleString()}
              </strong>
              <small style={{ color: "var(--muted-foreground)" }}>
                {summary.courier_orders_count || 0} Other City courier order{summary.courier_orders_count !== 1 ? "s" : ""}
              </small>
            </div>

            <div className="metric metric-emerald">
              <span style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                Total Amount Paid
              </span>
              <strong style={{ fontSize: "1.35rem", margin: "4px 0", color: "#15803d" }}>
                Rs. {summary.total_paid.toLocaleString()}
              </strong>
              <small style={{ color: "var(--muted-foreground)" }}>
                {ledger?.payments?.length || 0} recorded disbursement{ledger?.payments?.length !== 1 ? "s" : ""}
              </small>
            </div>

            <div className={`metric ${summary.pending_balance > 0 ? "metric-amber" : "metric-emerald"}`}>
              <span style={{ fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted-foreground)", fontWeight: 600 }}>
                Remaining Pending
              </span>
              <strong
                style={{
                  fontSize: "1.35rem",
                  margin: "4px 0",
                  color: summary.pending_balance > 0 ? "#b45309" : "#15803d",
                }}
              >
                Rs. {summary.pending_balance.toLocaleString()}
              </strong>
              <small style={{ color: "var(--muted-foreground)" }}>
                {summary.pending_balance > 0 ? "Outstanding balance payable" : "All accounts fully settled ✓"}
              </small>
            </div>
          </div>

          {/* Record New Payment Form */}
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              marginBottom: 20,
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={16} /> Record Payment to {vendor.name}
            </h4>
            <form onSubmit={handleCreatePayment}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 100000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Easypaisa">Easypaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Transaction Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meezan #9812739"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 auto" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Notes / Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid 1 Lakh for batch #45 printing orders"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !amount}
                  className="btn primary compact"
                  style={{ height: 38, padding: "0 16px", whiteSpace: "nowrap" }}
                >
                  {saving ? "Saving…" : "Save Payment"}
                </button>
              </div>
            </form>
          </div>

          {/* Payment History Table */}
          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>
              Disbursement History ({ledger?.payments?.length || 0})
            </h4>
            {(!ledger?.payments || ledger.payments.length === 0) ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted-foreground)", background: "var(--card)", borderRadius: 8, border: "1px dashed var(--border)" }}>
                No payment disbursements recorded for this vendor yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Date</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Amount</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Method</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Reference</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Notes</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Recorded By</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.payments.map((p, idx) => (
                      <tr
                        key={p.id || idx}
                        style={{
                          borderBottom: idx < ledger.payments.length - 1 ? "1px solid var(--border)" : "none",
                          background: idx % 2 === 0 ? "transparent" : "var(--muted)",
                        }}
                      >
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          {formatDateDMY(p.payment_date)}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "#15803d", whiteSpace: "nowrap" }}>
                          Rs. {Number(p.amount).toLocaleString()}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <span className="mono-pill" style={{ fontSize: "0.72rem" }}>
                            {p.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--muted-foreground)" }}>
                          {p.reference || "—"}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--muted-foreground)" }}>
                          {p.notes || "—"}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                          {p.created_by}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setDeletingPaymentId(p.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              padding: "4px",
                            }}
                            title="Delete this payment record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order-by-Order Breakdown */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                <Package size={16} /> Order-by-Order Student & Delivery Khata ({ledger?.orders?.length || 0})
              </h4>
              <span className="small-text muted">Individual order printing & courier accounting</span>
            </div>
            {(!ledger?.orders || ledger.orders.length === 0) ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted-foreground)", background: "var(--card)", borderRadius: 8, border: "1px dashed var(--border)" }}>
                No completed or assigned orders for this vendor yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Order Ref & Date</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Student Info</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Destination</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Books & Pages</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Printing Cost</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Courier Charges</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Total Credit</th>
                      <th style={{ padding: "8px 10px", fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger.orders || []).map((ord, idx) => {
                      const isOther = ord.delivery_type === "other" || ord.actual_courier_charges > 0 || (ord.courier_name && ord.courier_tracking_id);
                      return (
                        <tr
                          key={ord.id || idx}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            background: idx % 2 === 0 ? "transparent" : "var(--muted)",
                          }}
                        >
                          <td style={{ padding: "9px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
                            <div>{ord.reference}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: "normal" }}>
                              {formatDateDMY(ord.created_at)}
                            </div>
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            <strong>{ord.name}</strong>
                            {ord.phone && (
                              <div style={{ fontSize: "0.74rem", color: "var(--muted-foreground)" }}>
                                {ord.phone}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "9px 10px" }}>
                            <span>{ord.city || (ord.delivery_type === "campus" ? "Campus Pickup" : "Lahore Home")}</span>
                            {ord.courier_name && (
                              <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: 2, fontWeight: 500 }}>
                                🚚 {ord.courier_name}: {ord.courier_tracking_id}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            {ord.total_pages.toLocaleString()} pgs · {ord.total_books} bk{ord.total_books !== 1 ? "s" : ""}
                          </td>
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            Rs. {ord.printing_cost.toLocaleString()}
                          </td>
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            {isOther ? (
                              ord.actual_courier_charges > 0 ? (
                                <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                                  Rs. {ord.actual_courier_charges.toLocaleString()}
                                </span>
                              ) : (
                                <span style={{ color: "var(--muted-foreground)" }}>Rs. 0</span>
                              )
                            ) : (
                              <span style={{ color: "var(--muted-foreground)" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "9px 10px", fontWeight: 700, color: "#15803d", whiteSpace: "nowrap" }}>
                            Rs. {ord.total_credit.toLocaleString()}
                          </td>
                          <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                            <span className="mono-pill" style={{ fontSize: "0.72rem" }}>
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ background: "var(--muted)", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                    <tr>
                      <td colSpan={4} style={{ padding: "10px 10px" }}>
                        Total Breakdown ({(ledger.orders || []).length} Orders):
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        Rs. {(ledger.orders || []).reduce((s, o) => s + (o.printing_cost || 0), 0).toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--primary)", whiteSpace: "nowrap" }}>
                        Rs. {(ledger.orders || []).reduce((s, o) => s + (o.actual_courier_charges || 0), 0).toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 10px", color: "#15803d", fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                        Rs. {(ledger.orders || []).reduce((s, o) => s + (o.total_credit || 0), 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </Result>

        {deletingPaymentId && (
          <Confirm
            open={!!deletingPaymentId}
            onClose={() => setDeletingPaymentId(null)}
            title="Delete payment entry?"
            description="Are you sure you want to delete this payment record? The vendor's remaining pending balance will increase accordingly."
            onConfirm={() => handleDeletePayment(deletingPaymentId)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VendorDashboard({ user, base }: { user: User; base: string }) {
  const [showPendingModal, setShowPendingModal] = useState(false);
  const { data: ledger, error: ledgerError, loading: ledgerLoading, reload: reloadLedger } =
    useData<VendorLedger>("manage/vendor-ledger");
  const { data: ordersData, error: ordersError, loading: ordersLoading, reload: reloadOrders } =
    useData<any>("manage/orders?pageSize=6");

  const summary = ledger?.summary || {
    total_orders: 0,
    total_pages: 0,
    total_books: 0,
    printing_orders: 0,
    printed_orders: 0,
    per_page_rate: 1.6,
    binding_rate: 30,
    total_earned: 0,
    total_paid: 0,
    pending_balance: 0,
  };

  const recentOrders: any[] = ordersData?.rows || [];
  const loading = ledgerLoading || ordersLoading;
  const error = ledgerError || ordersError;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Top Welcome & Rate Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "16px 20px",
          borderRadius: 8,
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.08))",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
            <Factory size={22} style={{ color: "var(--primary)" }} />
            Printing Vendor Dashboard
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.86rem", color: "var(--muted-foreground)" }}>
            Welcome back! Here is your printing workload overview and payment ledger.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="mono-pill" style={{ background: "var(--status-info-bg)", color: "var(--status-info-text)", border: "1px solid var(--status-info-border)", fontWeight: 700, fontSize: "0.78rem" }}>
            Per Page: Rs. {Number(summary.per_page_rate).toFixed(2)}
          </span>
          <span className="mono-pill" style={{ background: "var(--status-good-bg)", color: "var(--status-good-text)", border: "1px solid var(--status-good-border)", fontWeight: 700, fontSize: "0.78rem" }}>
            Binding: Rs. {Number(summary.binding_rate).toFixed(2)} / book
          </span>
          <button
            type="button"
            className="btn compact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              background: "rgba(37, 99, 235, 0.10)",
              color: "var(--primary)",
              borderColor: "rgba(37, 99, 235, 0.3)",
            }}
            onClick={() => setShowPendingModal(true)}
            title="View checklist of all books currently pending intake at Bookstore Office"
          >
            <ClipboardList size={14} />
            Pending Books Checklist
          </button>
          <button
            type="button"
            className="btn compact"
            onClick={() => {
              reloadLedger();
              reloadOrders();
            }}
            disabled={loading}
            title="Refresh Dashboard"
          >
            <RefreshCw size={13} className={loading ? "refresh-spinning" : undefined} />
            Refresh
          </button>
        </div>
      </div>

      <Result loading={loading} error={error}>
        {/* 6 Clickable Metric Cards - 3 columns per row for clarity */}
        <div className="metrics vendor-metrics-grid">
          {/* 1. Total Orders Assigned */}
          <a
            href="/vendor/orders?status=ALL"
            className="metric metric-blue vendor-metric-card"
            title="Click to view all assigned orders"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.3px" }}>
                Total Orders Assigned
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(37, 99, 235, 0.1)",
                  color: "#2563eb",
                  flexShrink: 0,
                }}
              >
                <ShoppingBag size={20} />
              </span>
            </div>

            <div>
              <strong style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.15, display: "block", color: "var(--foreground)", marginBottom: 6 }}>
                {summary.total_orders}
              </strong>
              <div style={{ fontSize: "0.82rem", color: "#2563eb", fontWeight: 550, display: "flex", alignItems: "center", gap: 4 }}>
                View all orders & history →
              </div>
            </div>
          </a>

          {/* 2. Orders in Printing Queue */}
          <a
            href="/vendor/orders?status=PROCESSING"
            className="metric metric-amber vendor-metric-card"
            style={{
              border: (summary.printing_orders || 0) > 0 ? "1px solid #fde68a" : undefined,
              background: (summary.printing_orders || 0) > 0 ? "rgba(254, 243, 199, 0.35)" : undefined,
            }}
            title="Click to view orders waiting to be printed"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: (summary.printing_orders || 0) > 0 ? "#92400e" : "var(--muted-foreground)", letterSpacing: "0.3px" }}>
                Printing (Pending)
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(245, 158, 11, 0.14)",
                  color: "#d97706",
                  flexShrink: 0,
                }}
              >
                <Printer size={20} />
              </span>
            </div>

            <div>
              <strong style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.15, display: "block", color: (summary.printing_orders || 0) > 0 ? "var(--status-warn-text)" : "var(--foreground)", marginBottom: 6 }}>
                {summary.printing_orders || 0}
              </strong>
              <div style={{ fontSize: "0.82rem", color: (summary.printing_orders || 0) > 0 ? "var(--status-warn-text)" : "var(--muted-foreground)", fontWeight: 550, display: "flex", alignItems: "center", gap: 4 }}>
                {(summary.printing_orders || 0) > 0 ? "Active print queue →" : "Print queue clear ✓"}
              </div>
            </div>
          </a>

          {/* 3. Printed Orders */}
          <a
            href="/vendor/orders?status=PRINTED"
            className="metric metric-emerald vendor-metric-card"
            title="Click to view printed orders ready for dispatch"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.3px" }}>
                Printed Orders
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--status-good-bg)",
                  color: "var(--status-good-text)",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={20} />
              </span>
            </div>

            <div>
              <strong style={{ fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.15, display: "block", color: "var(--status-good-text)", marginBottom: 6 }}>
                {summary.printed_orders || 0}
              </strong>
              <div style={{ fontSize: "0.82rem", color: "var(--status-good-text)", fontWeight: 550, display: "flex", alignItems: "center", gap: 4 }}>
                Ready for dispatch / pickup →
              </div>
            </div>
          </a>

          {/* 4. Courier Charges */}
          <a
            href="/vendor/ledger"
            className="metric metric-sky vendor-metric-card"
            title="Click to view courier charges"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--primary)", letterSpacing: "0.3px" }}>
                Courier Charges
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(37, 99, 235, 0.12)",
                  color: "var(--primary)",
                  flexShrink: 0,
                }}
              >
                <Truck size={20} />
              </span>
            </div>

            <div>
              <strong style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.15, display: "block", color: "var(--primary)", marginBottom: 6 }}>
                Rs. {(summary.total_courier_charges || 0).toLocaleString()}
              </strong>
              <div style={{ fontSize: "0.82rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{summary.courier_orders_count || 0} Other City parcel{summary.courier_orders_count !== 1 ? "s" : ""}</span>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>→</span>
              </div>
            </div>
          </a>

          {/* 5. Total Earnings */}
          <a
            href="/vendor/ledger"
            className="metric metric-blue vendor-metric-card"
            title="Click to view payment ledger details"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.3px" }}>
                Total Earnings (Khata)
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--status-info-bg)",
                  color: "var(--status-info-text)",
                  flexShrink: 0,
                }}
              >
                <Coins size={20} />
              </span>
            </div>

            <div>
              <strong style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.15, display: "block", color: "var(--status-info-text)", marginBottom: 6 }}>
                Rs. {summary.total_earned.toLocaleString()}
              </strong>
              <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>Print: Rs. {((summary.total_printing_cost !== undefined ? summary.total_printing_cost : (summary.total_earned - (summary.total_courier_charges || 0)))).toLocaleString()} + Courier: Rs. {(summary.total_courier_charges || 0).toLocaleString()}</span>
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>→</span>
              </div>
            </div>
          </a>

          {/* 5. Total Received */}
          <a
            href="/vendor/ledger"
            className="metric metric-emerald vendor-metric-card"
            title="Click to view payments received from Admin"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.3px" }}>
                Total Received
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--status-good-bg)",
                  color: "var(--status-good-text)",
                  flexShrink: 0,
                }}
              >
                <CreditCard size={20} />
              </span>
            </div>

            <div>
              <strong style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.15, display: "block", color: "var(--status-good-text)", marginBottom: 6 }}>
                Rs. {summary.total_paid.toLocaleString()}
              </strong>
              <div style={{ fontSize: "0.82rem", color: "var(--status-good-text)", fontWeight: 550, display: "flex", alignItems: "center", gap: 4 }}>
                Disbursed by Admin →
              </div>
            </div>
          </a>

          {/* 6. Total Remaining / Pending Payment */}
          <a
            href="/vendor/ledger"
            className={`metric ${summary.pending_balance > 0 ? "metric-amber" : "metric-emerald"} vendor-metric-card`}
            style={{
              border: summary.pending_balance > 0 ? "1px solid var(--status-warn-border)" : undefined,
              background: summary.pending_balance > 0 ? "var(--status-warn-bg)" : undefined,
            }}
            title="Click to view payment ledger balance"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: summary.pending_balance > 0 ? "var(--status-warn-text)" : "var(--muted-foreground)", letterSpacing: "0.3px" }}>
                Remaining Pending
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: summary.pending_balance > 0 ? "var(--status-warn-bg)" : "var(--status-good-bg)",
                  color: summary.pending_balance > 0 ? "var(--status-warn-text)" : "var(--status-good-text)",
                  flexShrink: 0,
                }}
              >
                <Receipt size={20} />
              </span>
            </div>

            <div>
              <strong
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  lineHeight: 1.15,
                  display: "block",
                  color: summary.pending_balance > 0 ? "var(--status-warn-text)" : "var(--status-good-text)",
                  marginBottom: 6,
                }}
              >
                Rs. {summary.pending_balance.toLocaleString()}
              </strong>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: summary.pending_balance > 0 ? "var(--status-warn-text)" : "var(--status-good-text)",
                  fontWeight: 550,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {summary.pending_balance > 0 ? "Awaiting clearance from Admin →" : "All cleared ✓"}
              </div>
            </div>
          </a>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/vendor/orders?status=PROCESSING"
            className="btn primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px" }}
          >
            <Printer size={16} /> Open Printing Queue ({summary.printing_orders || 0})
          </a>
          <a
            href="/vendor/ledger"
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px" }}
          >
            <Receipt size={16} /> View Payment Ledger
          </a>
        </div>

        {/* Recent Orders Overview Table */}
        <div className="panel stack" style={{ gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Recent Printing Orders</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                Latest orders assigned with auto-calculated printing earnings
              </p>
            </div>
            <a href="/vendor/orders?status=ALL" className="btn compact">
              View all orders ({summary.total_orders}) →
            </a>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", border: "1px dashed var(--border)", borderRadius: 8 }}>
              No orders assigned yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Order ID</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Student Info</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Books & Pages</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Vendor Earning</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o, idx) => {
                    const rawItems: any[] = o.items || [];
                    const items = rawItems.filter(
                      (it: any) => !it.is_unavailable && !it.in_office_stock,
                    );
                    const booksCount = Number(
                      o.total_books ??
                      items.reduce((s: number, it: any) => s + (it.quantity || 1), 0)
                    );
                    const pagesCount = Number(
                      o.vendor_pages ??
                      items.reduce((s: number, it: any) => s + (Number(it.pages) || 0) * (it.quantity || 1), 0)
                    );
                    return (
                      <tr
                        key={o.id || idx}
                        style={{
                          borderBottom: idx < recentOrders.length - 1 ? "1px solid var(--border)" : "none",
                          background: idx % 2 === 0 ? "transparent" : "var(--muted)",
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                          <a href={`/vendor/orders/${o.id}`} style={{ color: "var(--primary)", textDecoration: "none" }}>
                            {o.reference || `#${o.id.slice(0, 8)}`}
                          </a>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <strong>{o.name}</strong>
                          {o.phone && (
                            <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                              {o.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "nowrap",
                              whiteSpace: "nowrap",
                            }}
                            title={(items || []).map((it: any) => `• ${it.title}${it.quantity > 1 ? ` (×${it.quantity})` : ""}`).join("\n")}
                          >
                            <span className="mono-pill" style={{ fontSize: "0.74rem", fontWeight: 700, background: "rgba(59, 130, 246, 0.12)", color: "#1d4ed8", padding: "2px 7px" }}>
                              {booksCount} {booksCount === 1 ? "book" : "books"}
                            </span>
                            {pagesCount > 0 && (
                              <span className="mono-pill" style={{ fontSize: "0.74rem", fontWeight: 600, padding: "2px 7px" }}>
                                {pagesCount.toLocaleString()} pages
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <strong style={{ fontSize: "0.95rem", color: "#15803d" }}>
                            Rs. {(Number(o.vendor_price || 0) + Number(o.actual_courier_charges || 0)).toLocaleString()}
                          </strong>
                          {Number(o.actual_courier_charges || 0) > 0 ? (
                            <div style={{ fontSize: "0.70rem", color: "var(--primary)", fontWeight: 600 }}>
                              Print: Rs. {Number(o.vendor_price || 0).toLocaleString()} + Courier: Rs. {Number(o.actual_courier_charges).toLocaleString()}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.70rem", color: "var(--muted-foreground)" }}>
                              ({pagesCount}p × {summary.per_page_rate} + {booksCount}b × {summary.binding_rate})
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                          {formatDateDMY(o.created_at)}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <Status value={o.status} />
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <a
                            href={`/vendor/orders/${o.id}`}
                            className="btn compact"
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order-by-Order Earnings Breakdown */}
        <div className="panel stack" style={{ gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>
                Order-by-Order Earnings Breakdown ({(ledger?.orders || []).length})
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                Transparent breakdown of printing earnings and courier charges per student order
              </p>
            </div>
            <span className="small-text muted">Auto-calculated per assigned order</span>
          </div>

          {(!ledger?.orders || ledger.orders.length === 0) ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--muted-foreground)", border: "1px dashed var(--border)", borderRadius: 8 }}>
              <Package size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No orders completed yet</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Order Ref & Date</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Student Info</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Destination</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Books & Pages</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Printing Cost</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Courier Charges</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Total Credit</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledger.orders || []).map((ord, idx) => {
                    const isOther = ord.delivery_type === "other" || ord.actual_courier_charges > 0 || (ord.courier_name && ord.courier_tracking_id);
                    return (
                      <tr
                        key={ord.id || idx}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: idx % 2 === 0 ? "transparent" : "var(--muted)",
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                          <div>{ord.reference}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: "normal" }}>
                            {formatDateDMY(ord.created_at)}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <strong>{ord.name}</strong>
                          {ord.phone && (
                            <div style={{ fontSize: "0.74rem", color: "var(--muted-foreground)" }}>
                              {ord.phone}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span>{ord.city || (ord.delivery_type === "campus" ? "Campus Pickup" : "Lahore Home")}</span>
                          {ord.courier_name && (
                            <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: 2, fontWeight: 500 }}>
                              🚚 {ord.courier_name}: {ord.courier_tracking_id}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          {ord.total_pages.toLocaleString()} pgs · {ord.total_books} bk{ord.total_books !== 1 ? "s" : ""}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          Rs. {ord.printing_cost.toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          {isOther ? (
                            ord.actual_courier_charges > 0 ? (
                              <span style={{ fontWeight: 600, color: "var(--primary)" }}>
                                Rs. {ord.actual_courier_charges.toLocaleString()}
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted-foreground)" }}>Rs. 0</span>
                            )
                          ) : (
                            <span style={{ color: "var(--muted-foreground)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#15803d", whiteSpace: "nowrap" }}>
                          Rs. {ord.total_credit.toLocaleString()}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <span className="mono-pill" style={{ fontSize: "0.72rem" }}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot style={{ background: "var(--muted)", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                  <tr>
                    <td colSpan={4} style={{ padding: "11px 12px" }}>
                      Total Summary ({(ledger.orders || []).length} Orders):
                    </td>
                    <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>
                      Rs. {(ledger.orders || []).reduce((s, o) => s + (o.printing_cost || 0), 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "11px 12px", color: "var(--primary)", whiteSpace: "nowrap" }}>
                      Rs. {(ledger.orders || []).reduce((s, o) => s + (o.actual_courier_charges || 0), 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "11px 12px", color: "#15803d", fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                      Rs. {(ledger.orders || []).reduce((s, o) => s + (o.total_credit || 0), 0).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </Result>
      {showPendingModal && (
        <VendorPendingBooksModal
          vendor={{ id: user.vendor_id || user.id, name: user.name || "Vendor" }}
          onClose={() => setShowPendingModal(false)}
        />
      )}
    </div>
  );
}

function VendorLedgerView({ user }: { user: User }) {
  const { data: ledger, error, loading, reload } = useData<VendorLedger>("manage/vendor-ledger");

  const summary = ledger?.summary || {
    total_orders: 0,
    total_pages: 0,
    total_books: 0,
    per_page_rate: 1.6,
    binding_rate: 30,
    total_printing_cost: 0,
    total_courier_charges: 0,
    courier_orders_count: 0,
    total_earned: 0,
    total_paid: 0,
    pending_balance: 0,
  };

  const payments = ledger?.payments || [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Rate Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "14px 18px",
          borderRadius: 8,
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.08))",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt size={20} style={{ color: "var(--primary)" }} />
            Payment Ledger & Earnings
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "var(--muted-foreground)" }}>
            Earnings are automatically calculated per order. Track all payments received from administration.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono-pill" style={{ background: "var(--status-info-bg)", color: "var(--status-info-text)", border: "1px solid var(--status-info-border)", fontWeight: 700, fontSize: "0.78rem" }}>
            Per Page: Rs. {Number(summary.per_page_rate).toFixed(2)}
          </span>
          <span className="mono-pill" style={{ background: "var(--status-good-bg)", color: "var(--status-good-text)", border: "1px solid var(--status-good-border)", fontWeight: 700, fontSize: "0.78rem" }}>
            Binding: Rs. {Number(summary.binding_rate).toFixed(2)} / book
          </span>
          <button
            type="button"
            className="btn compact"
            onClick={() => reload()}
            disabled={loading}
            title="Refresh Ledger"
          >
            <RefreshCw size={13} className={loading ? "refresh-spinning" : undefined} />
            Refresh
          </button>
        </div>
      </div>

      <Result loading={loading} error={error}>
        {/* 4 Financial Summary Cards */}
        <div
          className="metrics"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <div className="metric metric-blue">
            <div className="metric-heading">
              <span>Total Earned (Khata)</span>
              <span className="metric-icon">
                <Coins size={19} />
              </span>
            </div>
            <strong style={{ fontSize: "1.55rem", color: "var(--foreground)" }}>
              Rs. {summary.total_earned.toLocaleString()}
            </strong>
            <small style={{ color: "var(--muted-foreground)" }}>
              Printing Rs. {((summary.total_printing_cost !== undefined ? summary.total_printing_cost : (summary.total_earned - (summary.total_courier_charges || 0)))).toLocaleString()} + Courier Rs. {(summary.total_courier_charges || 0).toLocaleString()}
            </small>
          </div>

          <div className="metric metric-sky">
            <div className="metric-heading">
              <span>Courier Charges</span>
              <span className="metric-icon">
                <Truck size={19} />
              </span>
            </div>
            <strong style={{ fontSize: "1.55rem", color: "var(--primary)" }}>
              Rs. {(summary.total_courier_charges || 0).toLocaleString()}
            </strong>
            <small style={{ color: "var(--muted-foreground)" }}>
              {summary.courier_orders_count || 0} Other City courier order{summary.courier_orders_count !== 1 ? "s" : ""}
            </small>
          </div>

          <div className="metric metric-emerald">
            <div className="metric-heading">
              <span>Total Received</span>
              <span className="metric-icon">
                <CreditCard size={19} />
              </span>
            </div>
            <strong style={{ fontSize: "1.55rem", color: "var(--status-good-text)" }}>
              Rs. {summary.total_paid.toLocaleString()}
            </strong>
            <small style={{ color: "var(--muted-foreground)" }}>
              {payments.length} payment disbursement{payments.length !== 1 ? "s" : ""} received
            </small>
          </div>

          <div className={`metric ${summary.pending_balance > 0 ? "metric-amber" : "metric-emerald"}`}>
            <div className="metric-heading">
              <span>Remaining Balance</span>
              <span className="metric-icon">
                <Clock size={19} />
              </span>
            </div>
            <strong
              style={{
                fontSize: "1.55rem",
                color: summary.pending_balance > 0 ? "var(--status-warn-text)" : "var(--status-good-text)",
              }}
            >
              Rs. {summary.pending_balance.toLocaleString()}
            </strong>
            <small style={{ color: "var(--muted-foreground)" }}>
              {summary.pending_balance > 0 ? "Pending payment from Admin" : "All accounts cleared ✓"}
            </small>
          </div>
        </div>

        {/* Calculation formula explanation */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "var(--muted)",
            border: "1px solid var(--border)",
            fontSize: "0.84rem",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>
            📐 Auto-Calculation & Ledger Formula:
          </strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div>
              1. <strong>Printing & Binding Earning:</strong> (Total Order Pages × Rs. {Number(summary.per_page_rate).toFixed(2)}) + (Total Books × Rs. {Number(summary.binding_rate).toFixed(2)} Binding)
            </div>
            <div>
              2. <strong>Courier Charges:</strong> Actual courier expense entered when dispatching Other City orders (credited 100% into your ledger).
            </div>
            <div style={{ fontWeight: 600, color: "var(--primary)", marginTop: 2 }}>
              ➔ Total Vendor Credit = Printing & Binding Earning + Courier Charges
            </div>
          </div>
        </div>

        {/* Payments History Table */}
        <div className="panel stack" style={{ gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>
              Payment Receipts History ({payments.length})
            </h3>
            <span className="small-text muted">Disbursements recorded by Admin</span>
          </div>

          {payments.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted-foreground)", border: "1px dashed var(--border)", borderRadius: 8 }}>
              <Receipt size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No payments recorded yet</p>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
                When the administration records a payment disbursement for your press, it will appear here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Payment Date</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Amount Received</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Payment Method</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Reference / TxID</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Description / Notes</th>
                    <th style={{ padding: "9px 12px", fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => (
                    <tr
                      key={p.id || idx}
                      style={{
                        borderBottom: idx < payments.length - 1 ? "1px solid var(--border)" : "none",
                        background: idx % 2 === 0 ? "transparent" : "var(--muted)",
                      }}
                    >
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {formatDateDMY(p.payment_date)}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "#15803d", whiteSpace: "nowrap", fontSize: "0.95rem" }}>
                        Rs. {Number(p.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span className="mono-pill" style={{ fontSize: "0.75rem" }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--muted-foreground)" }}>
                        {p.reference || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--muted-foreground)" }}>
                        {p.notes || "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 9999,
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            background: "rgba(22, 163, 74, 0.12)",
                            color: "#15803d",
                          }}
                        >
                          <CheckCircle2 size={11} /> Received
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Result>
    </div>
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
    [logoUploading, setLogoUploading] = useState(false),
    [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        ...data.settings,
        logo_url: data.settings.logo_url ?? "",
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoUploading(true);
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
      if (!r.ok) throw new Error(d.error || "Failed to upload logo image");
      setForm((prev: any) => ({ ...prev, logo_url: d.url }));
      toast.success("Logo uploaded! Click 'Save System Configuration' to apply changes.");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

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
            detail: { store_name: form.store_name, logo_url: form.logo_url },
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
              <h3>GENERAL CONFIGURATION & BRANDING</h3>
            </div>

            {/* Logo Upload & Branding Section */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 10,
                background: "var(--muted)",
                border: "1px solid var(--border)",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                <div>
                  <strong style={{ fontSize: "0.95rem", display: "block" }}>
                    Website & Portal Brand Logo
                  </strong>
                  <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "var(--muted-foreground)" }}>
                    Upload your official institution or bookstore logo. It automatically updates across the storefront header, mobile drawer, footer, receipts, and admin/vendor portals.
                  </p>
                </div>
                {form.logo_url && (
                  <span
                    className="mono-pill"
                    style={{
                      background: "rgba(34, 197, 94, 0.12)",
                      color: "#15803d",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                    }}
                  >
                    Custom Logo Active ✓
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                {/* Live Preview Box */}
                <div
                  style={{
                    width: 170,
                    height: 72,
                    borderRadius: 8,
                    border: "2px dashed var(--border)",
                    background: "var(--background)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    overflow: "hidden",
                    position: "relative",
                  }}
                  title={form.logo_url ? "Current brand logo preview" : "No custom logo uploaded"}
                >
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Brand Logo Preview"
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
                      <BookOpen size={20} />
                      <span>Default Icon</span>
                    </div>
                  )}
                </div>

                {/* Upload & Action Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <label
                      className="btn"
                      style={{
                        margin: 0,
                        cursor: logoUploading ? "wait" : "pointer",
                        opacity: logoUploading ? 0.7 : 1,
                        fontSize: "0.84rem",
                        padding: "7px 16px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Upload size={15} />
                      <span>{logoUploading ? "Uploading Logo..." : form.logo_url ? "Change Logo" : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{ display: "none" }}
                        disabled={logoUploading}
                        onChange={handleLogoUpload}
                      />
                    </label>

                    {form.logo_url && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          margin: 0,
                          fontSize: "0.84rem",
                          padding: "7px 14px",
                          color: "var(--status-bad-text)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onClick={() => setForm({ ...form, logo_url: "" })}
                        title="Revert back to default bookstore icon"
                      >
                        <Trash2 size={14} />
                        <span>Remove Logo</span>
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                    Supported formats: PNG, JPG, WEBP, SVG. Transparent background with horizontal layout recommended.
                  </div>
                </div>
              </div>
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
