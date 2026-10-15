"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { api } from "./shared";
import type { Book, User } from "@/lib/contracts";
type CartItem = { id: string; quantity: number };
type State = {
  cart: CartItem[];
  add: (b: Book) => void;
  setCart: (v: CartItem[]) => void;
  user: User | null;
  ready: boolean;
};
const Context = createContext<State>(null!);
export function Providers({ children }: { children: ReactNode }) {
  const [cart, setCartState] = useState<CartItem[]>([]),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cbs_cart") || "[]");
      if (Array.isArray(saved))
        setCartState(
          saved
            .filter(
              (i) =>
                typeof i.id === "string" &&
                Number.isSafeInteger(i.quantity) &&
                i.quantity > 0,
            )
            .slice(0, 30),
        );
    } catch {}
    setHydrated(true);
    api("session")
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem("cbs_cart", JSON.stringify(cart));
      } catch {}
    }
  }, [cart, hydrated]);
  const setCart = (v: CartItem[]) => setCartState(v);
  const add = (b: Book) => {
    setCartState((old) => {
      const n = old.find((i) => i.id === b.id)?.quantity || 0;
      toast.success(`${b.code} added to your cart.`);
      return [
        ...old.filter((i) => i.id !== b.id),
        { id: b.id, quantity: n + 1 },
      ];
    });
  };
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Context.Provider value={{ cart, setCart, add, user, ready }}>
        {children}
        <Toaster richColors position="top-center" duration={2500} />
      </Context.Provider>
    </ThemeProvider>
  );
}
export const useApp = () => useContext(Context);
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      disabled={!mounted}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="theme-toggle-orbit" aria-hidden="true" />
      <Sun className="theme-toggle-sun" size={21} aria-hidden="true" />
      <Moon className="theme-toggle-moon" size={21} aria-hidden="true" />
      <span className="theme-toggle-stars" aria-hidden="true" />
    </button>
  );
}
