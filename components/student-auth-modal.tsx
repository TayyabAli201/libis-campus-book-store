"use client";

import { useState, useEffect } from "react";
import {
  User as UserIcon,
  X,
  Package,
  ShoppingBag,
  LogOut,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "./providers";
import { api, errorText } from "./shared";
import { money } from "@/lib/contracts";

declare global {
  interface Window {
    google?: any;
  }
}

interface StudentAuthModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_GOOGLE_CLIENT_ID =
  "179619485023-1k4hrmvraa85301ppgbj3d4v1tctro89.apps.googleusercontent.com";

export function StudentAuthModal({ open, onClose }: StudentAuthModalProps) {
  const { user, setUser, cart } = useApp();
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [gsiRendered, setGsiRendered] = useState(false);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  // Load Google Identity Services SDK
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initGoogleGsi();
      document.body.appendChild(script);
    } else {
      initGoogleGsi();
    }

    function initGoogleGsi() {
      if (!googleClientId || !window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });

        const btnContainer = document.getElementById("google-btn-rendered");
        if (btnContainer) {
          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            width: 340,
            text: "continue_with",
            shape: "pill",
          });
          setGsiRendered(true);
        }
      } catch {}
    }
  }, [open, googleClientId]);

  // Load student orders when signed in
  useEffect(() => {
    if (open && user?.role === "STUDENT") {
      setLoadingOrders(true);
      api("student-orders")
        .then((res: any) => {
          setOrders(Array.isArray(res?.orders) ? res.orders : []);
        })
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    }
  }, [open, user?.role]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setBusy(true);
    try {
      let clientProfile: any = null;
      try {
        const parts = response.credential.split(".");
        if (parts.length === 3) {
          clientProfile = JSON.parse(
            atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
          );
        }
      } catch {}

      const res = await api("student-auth", {
        method: "POST",
        body: JSON.stringify({
          credential: response.credential,
          email: clientProfile?.email,
          name: clientProfile?.name,
          picture: clientProfile?.picture,
          google_id: clientProfile?.sub,
        }),
      });
      if (res?.user) {
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.name || "Student"}!`);
        onClose();
      }
    } catch (e) {
      toast.error(errorText(e) || "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleClick = () => {
    const cid = googleClientId || DEFAULT_GOOGLE_CLIENT_ID;

    if (window.google?.accounts?.oauth2) {
      setBusy(true);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cid,
        scope: "email profile openid",
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            setBusy(false);
            if (tokenResponse.error !== "popup_closed_by_user") {
              toast.error(
                tokenResponse.error_description ||
                  tokenResponse.error ||
                  "Google sign-in was cancelled.",
              );
            }
            return;
          }
          if (tokenResponse?.access_token) {
            try {
              let profile: any = null;
              try {
                const uRes = await fetch(
                  "https://www.googleapis.com/oauth2/v3/userinfo",
                  {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                  },
                );
                if (uRes.ok) {
                  profile = await uRes.json();
                }
              } catch {}

              const res = await api("student-auth", {
                method: "POST",
                body: JSON.stringify({
                  access_token: tokenResponse.access_token,
                  email: profile?.email,
                  name: profile?.name,
                  picture: profile?.picture,
                  google_id: profile?.sub || profile?.id,
                }),
              });
              if (res?.user) {
                setUser(res.user);
                toast.success(`Signed in as ${res.user.name || res.user.email}!`);
                onClose();
              }
            } catch (e) {
              toast.error(errorText(e) || "Google sign-in failed.");
            } finally {
              setBusy(false);
            }
          } else {
            setBusy(false);
          }
        },
        error_callback: (err: any) => {
          setBusy(false);
          if (err?.message) toast.error(err.message);
        },
      });
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast.info("Connecting to Google authentication...");
    }
  };

  const handleQuickSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid student email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await api("student-auth", {
        method: "POST",
        body: JSON.stringify({
          email,
          name: nameInput.trim() || email.split("@")[0],
        }),
      });
      if (res?.user) {
        setUser(res.user);
        toast.success(`Signed in as ${res.user.name}!`);
      }
    } catch (e) {
      toast.error(errorText(e) || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await api("logout", { method: "POST" });
      setUser(null);
      setOrders([]);
      toast.success("Signed out successfully.");
      onClose();
    } catch {
      setUser(null);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const isStudent = user?.role === "STUDENT";
  const initials = (user?.name || user?.email || "VU")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--card)",
          color: "var(--card-foreground)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border)",
          position: "relative",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                {isStudent ? "Student Account" : "Sign In to Your Account"}
              </h3>
              <small style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>
                {isStudent ? "Virtual University Student Hub" : "Sync cart & live tracking"}
              </small>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button"
            style={{ padding: "6px", borderRadius: "8px" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* LOGGED IN VIEW */}
        {isStudent ? (
          <div>
            {/* Student Profile Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px",
                borderRadius: "14px",
                backgroundColor: "var(--secondary)",
                marginBottom: "18px",
              }}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #2563eb",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {initials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.68rem",
                    color: "#10b981",
                    fontWeight: 600,
                    marginTop: "2px",
                  }}
                >
                  <CheckCircle2 size={11} /> Cloud Cart Synced ({cart.length} items)
                </div>
              </div>
            </div>

            {/* Quick Actions / Orders */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--muted-foreground)" }}>
                  MY RECENT ORDERS
                </span>
                <a
                  href="/track"
                  onClick={onClose}
                  style={{
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Manual Lookup ↗
                </a>
              </div>

              {loadingOrders ? (
                <div style={{ textAlign: "center", padding: "16px", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                  <Loader2 className="animate-spin" size={16} style={{ display: "inline", marginRight: "6px" }} />
                  Loading your orders...
                </div>
              ) : orders.length === 0 ? (
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px dashed var(--border)",
                    textAlign: "center",
                    fontSize: "0.8rem",
                    color: "var(--muted-foreground)",
                  }}
                >
                  No orders found for this email address yet.
                  <div style={{ marginTop: "6px" }}>
                    <a
                      href="/books"
                      onClick={onClose}
                      style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                    >
                      Browse Course Handouts →
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {orders.map((ord) => (
                    <a
                      key={ord.id}
                      href={`/track?id=${encodeURIComponent(ord.reference)}`}
                      onClick={onClose}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        backgroundColor: "var(--secondary)",
                        border: "1px solid var(--border)",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "transform 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                          #{ord.reference}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                          {ord.total_books || 1} books · {ord.city || "Pakistan"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#2563eb" }}>
                          {money(ord.total || 0)}
                        </div>
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor:
                              ord.status === "DELIVERED"
                                ? "rgba(16, 185, 129, 0.15)"
                                : ord.status === "SHIPPED"
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                            color:
                              ord.status === "DELIVERED"
                                ? "#10b981"
                                : ord.status === "SHIPPED"
                                  ? "#3b82f6"
                                  : "#f59e0b",
                          }}
                        >
                          {ord.status}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "#ef4444",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "background-color 0.15s ease",
              }}
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        ) : (
          /* NOT LOGGED IN VIEW */
          <div>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "56px",
                  height: "56px",
                  borderRadius: "18px",
                  backgroundColor: "rgba(37, 99, 235, 0.1)",
                  color: "#2563eb",
                  marginBottom: "12px",
                }}
              >
                <ShoppingBag size={28} />
              </div>
              <h4 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 700 }}>
                VU Student Account
              </h4>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                Keep your cart synced across mobile & desktop, and track printed book dispatches effortlessly.
              </p>
            </div>

            {/* Google Button Container */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "16px", width: "100%" }}>
              <div
                id="google-btn-rendered"
                style={{
                  width: "100%",
                  display: gsiRendered ? "flex" : "none",
                  justifyContent: "center",
                  minHeight: "40px",
                }}
              />

              {!gsiRendered && (
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={busy}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "9999px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--card)",
                    color: "var(--card-foreground)",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                margin: "16px 0",
                color: "var(--muted-foreground)",
                fontSize: "0.75rem",
              }}
            >
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
              <span>OR ENTER EMAIL</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
            </div>

            {/* Quick Email Form */}
            <form onSubmit={handleQuickSignIn} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                id="student-email-input"
                type="email"
                required
                placeholder="Student Email (e.g. bc20040123@vu.edu.pk)"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                  color: "inherit",
                  fontSize: "0.85rem",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <input
                type="text"
                placeholder="Full Name (optional)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                  color: "inherit",
                  fontSize: "0.85rem",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                disabled={busy}
                className="btn primary full"
                style={{
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "0.88rem",
                  borderRadius: "10px",
                }}
              >
                {busy && <Loader2 className="animate-spin" size={15} />}
                Sign In As Student
              </button>
            </form>

            <div
              style={{
                marginTop: "16px",
                padding: "10px",
                borderRadius: "10px",
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                fontSize: "0.72rem",
                color: "var(--muted-foreground)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShieldCheck size={16} style={{ color: "#10b981", flexShrink: 0 }} />
              <span>
                Your data is secure. Guest checkout is always available without an account.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
