"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Search,
  ShoppingBag,
  Menu,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  Truck,
  Layers,
  Copy,
  Upload,
  Printer,
  Download,
  Package,
  ArrowRight,
  Sparkles,
  Building2,
  Navigation,
  MapPin,
  Crosshair,
  CheckCircle2,
  Mail,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useApp, ThemeSwitch } from "./providers";
import { WhatsAppIcon } from "./whatsapp-icon";
import {
  BookObject,
  BookExperience,
  ImmersiveHero,
  getBookPaletteClass,
} from "./book-experience";
import { StoreMotion } from "./store-motion";
import { receiptDate, receiptPaymentNote } from "@/lib/receipt-format";
import {
  api,
  Blank,
  Loading,
  Field,
  Choose,
  errorText,
  Status,
  VULogo,
} from "./shared";
import {
  money,
  statuses,
  type Book,
  type StoreSettings,
  type Quote,
} from "@/lib/contracts";
type Catalog = {
  books: Book[];
  settings: StoreSettings;
  campuses: { id: string; name: string; city: string }[];
  prices: { id: string; rate: number }[];
};
function whatsapp(s?: StoreSettings) {
  let num = s?.whatsapp || "03034049973";
  let n = num.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "92" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent("Hello, I need assistance regarding my Campus Bookstore order.")}`;
}
export function Store({
  mode = "home",
  initial,
  bookCode,
}: {
  mode?: string;
  initial?: Catalog;
  bookCode?: string;
}) {
  const { cart, ready } = useApp();
  const cartIds =
    mode === "cart" || mode === "checkout"
      ? cart.map((i) => i.id).join(",")
      : "";
  const [data, setData] = useState<Catalog | undefined>(initial),
    [error, setError] = useState("");
  useEffect(() => {
    if (!initial && ready)
      api("catalog" + (cartIds ? "?ids=" + encodeURIComponent(cartIds) : ""))
        .then(setData)
        .catch((e) => setError(errorText(e)));
  }, [initial, ready, cartIds]);
  return (
    <StoreMotion>
      <Header settings={data?.settings} />
      <main id="main">
        {error ? (
          <div className="section">
            <Blank title="We couldn’t load the bookstore" description={error}>
              <button className="btn" onClick={() => location.reload()}>
                Try again
              </button>
            </Blank>
          </div>
        ) : !data ? (
          <div className="section">
            <Loading />
          </div>
        ) : !data.settings.store_open ? (
          <MaintenanceScreen settings={data.settings} />
        ) : mode === "home" ? (
          <>
            <ImmersiveHero books={data.books} settings={data.settings} />
            <CatalogView data={data} isHome={true} />
            <HomeSections data={data} />
          </>
        ) : mode === "books" ? (
          <CatalogView data={data} isHome={false} />
        ) : mode === "cart" ? (
          <Cart data={data} />
        ) : mode === "checkout" ? (
          <Checkout data={data} />
        ) : mode === "orders" || mode === "track" || mode === "track-order" ? (
          <OrderTracking data={data} />
        ) : mode === "book" ? (
          <BookDetail data={data} code={bookCode!} />
        ) : (
          <Information mode={mode} data={data} />
        )}
      </main>
      {data && data.settings.store_open && (
        <>
          <Footer data={data} />
          <a
            className="whatsapp"
            href={whatsapp(data.settings)}
            target="_blank"
            rel="noreferrer"
            aria-label="Contact on WhatsApp"
          >
            <WhatsAppIcon size={26} />
          </a>
        </>
      )}
    </StoreMotion>
  );
}

function MaintenanceScreen({ settings }: { settings: StoreSettings }) {
  const phone = settings.whatsapp || "03034049973";
  return (
    <section className="section maintenance-section">
      <div className="maintenance-card">
        <div className="maintenance-header-badge">
          <AlertTriangle size={36} />
        </div>
        <span className="maintenance-eyebrow">STOREFRONT TEMPORARILY OFFLINE</span>
        <h1 className="maintenance-title">{settings.store_name || "Campus Bookstore"}</h1>
        {settings.header_tagline && (
          <p className="maintenance-tagline">{settings.header_tagline}</p>
        )}

        <div className="maintenance-message-box">
          <h3>System Maintenance Notice</h3>
          <p>
            {settings.maintenance_message ||
              "We are currently conducting scheduled system maintenance. Ordering is temporarily closed. Please check back soon!"}
          </p>
        </div>

        <div className="maintenance-contact-info">
          {settings.distribution_center_address && (
            <div className="maintenance-info-item">
              <Building2 size={18} />
              <span>
                Center:{" "}
                <a
                  href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "underline", color: "inherit" }}
                >
                  <strong>{settings.distribution_center_address}</strong>
                </a>
              </span>
            </div>
          )}
          {settings.support_hours && (
            <div className="maintenance-info-item">
              <Clock size={18} />
              <span>Support Hours: <strong>{settings.support_hours}</strong></span>
            </div>
          )}
        </div>

        <div className="maintenance-cta-group">
          <a
            className="support-whatsapp-btn"
            href={whatsapp(settings)}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon size={20} />
            <span>Contact Support ({phone})</span>
          </a>
          <a className="btn" href="/admin/login">
            Staff & Admin Login
          </a>
        </div>
      </div>
    </section>
  );
}
function Header({ settings }: { settings?: StoreSettings }) {
  const { cart } = useApp();
  const rawPathname = usePathname() || "/";
  const pathname = rawPathname === "" ? "/" : rawPathname;
  const [hash, setHash] = useState("");
  const count = cart.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    setHash(window.location.hash);
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const links = [
    ["Home", "/"],
    ["Books", "/books"],
    ["About Us", "/about"],
    ["Contact", "/contact"],
    ["Track order", "/track"],
  ];

  const isLinkActive = (url: string) => {
    if (url === "/") {
      return pathname === "/" && !hash;
    }
    return pathname.startsWith(url);
  };

  const storeName = settings?.store_name || "Campus Bookstore";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="store-header">
        <a className="brand" href="/">
          <BookOpen />
          <div className="brand-text-wrap">
            <span className="brand-title">{storeName}</span>
            {settings?.header_tagline && (
              <small className="brand-tagline-text">{settings.header_tagline}</small>
            )}
          </div>
        </a>
        <nav>
          {links.map(([label, url]) => {
            const active = isLinkActive(url);
            return (
              <a
                href={url}
                key={url}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  if (url.includes("#")) {
                    setHash(url.substring(url.indexOf("#")));
                  } else {
                    setHash("");
                  }
                }}
              >
                {label}
              </a>
            );
          })}
        </nav>
        <div className="header-tools">
          <a
            href="/books#search"
            className="icon-button"
            aria-label="Search books"
          >
            <Search size={21} />
          </a>
          <div className="header-theme">
            <ThemeSwitch />
          </div>
          <a
            className={`cart-link ${pathname.startsWith("/cart") ? "active" : ""}`}
            href="/cart"
            aria-label={`Cart, ${count} books`}
          >
            <ShoppingBag size={21} />
            <span key={count}>{count}</span>
          </a>
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
              >
                <Menu />
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{storeName}</SheetTitle>
                <SheetDescription>
                  {settings?.header_tagline || "Everything for your next chapter."}
                </SheetDescription>
              </SheetHeader>
              <div className="mobile-links">
                {links.map(([label, url]) => {
                  const active = isLinkActive(url);
                  return (
                    <a
                      href={url}
                      key={url}
                      className={active ? "active" : ""}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        if (url.includes("#")) {
                          setHash(url.substring(url.indexOf("#")));
                        } else {
                          setHash("");
                        }
                      }}
                    >
                      {label}
                    </a>
                  );
                })}
                <a href="/campus/login">Campus portal</a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    </>
  );
}
function Cover({ book, small = false }: { book: Book; small?: boolean }) {
  if (!small)
    return (
      <div className="catalog-book-stage">
        <div className="catalog-book-shadow" />
        <div className="catalog-book-model">
          <BookObject book={book} />
        </div>
      </div>
    );
  return book.cover ? (
    <img
      className={small ? "cover-thumb" : "book-cover"}
      src={book.cover}
      alt={`${book.title} cover`}
      loading="lazy"
      width={300}
      height={360}
    />
  ) : (
    <div
      className={
        "cover-placeholder category-" + book.category + (small ? " small" : "")
      }
    >
      <BookOpen size={small ? 24 : 35} />
      {!small && (
        <>
          <span className="cover-code">{book.code}</span>
          <span className="cover-title">{book.title}</span>
          <span className="cover-edition">COURSE MATERIALS</span>
        </>
      )}
    </div>
  );
}
function BookCard({ book }: { book: Book }) {
  const { add } = useApp();
  const paletteClass = getBookPaletteClass(book);
  const cardPalette = paletteClass.replace("book-palette-", "card-palette-");
  return (
    <article className={`book-card ${cardPalette} card-palette-${book.category}`}>
      <a
        href={"/books/" + book.code.toLowerCase()}
        className="cover-link"
        aria-label={`View ${book.title} (${book.code})`}
      >
        <Cover book={book} />
        <span className="cover-badge">{book.course_code}</span>
      </a>
      <div className="book-info">
        <div className="book-meta">
          <span>{book.pages} pages</span>
        </div>
        <a href={"/books/" + book.code.toLowerCase()}>
          <h3>{book.title}</h3>
        </a>
        <div className="book-bottom">
          <div>
            <strong>{money(book.price)}</strong>
          </div>
          <button
            className="add-button"
            onClick={() => add(book)}
            disabled={!book.active}
            aria-label={`Add ${book.code} to cart`}
          >
            <ShoppingBag size={14} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}
function CatalogView({
  data,
  isHome = false,
}: {
  data: Catalog;
  isHome?: boolean;
}) {
  const [remote, setRemote] = useState<Book[] | null>(null),
    [searching, setSearching] = useState(false),
    [searchError, setSearchError] = useState(""),
    [catalogPage, setCatalogPage] = useState(1);
  const [hasMore, setHasMore] = useState(data.books.length === 500);
  const queryRef = useRef("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const course = new URLSearchParams(location.search).get("course");
    if (course) setQuery(course.slice(0, 120));
  }, []);
  useEffect(() => {
    queryRef.current = query;
    setCatalogPage(1);
    setHasMore(false);
    if (!query) {
      setRemote(null);
      setHasMore(data.books.length === 500);
      setSearchError("");
      setSearching(false);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      setSearching(true);
      api("catalog?q=" + encodeURIComponent(query))
        .then((r) => {
          if (active) {
            setRemote(r.books);
            setHasMore(r.books.length === 500);
            setSearchError("");
          }
        })
        .catch((e) => {
          if (active) setSearchError(errorText(e));
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, data.books]);
  const matches = (remote || data.books).filter((b) =>
    [b.code, b.course_code, b.title, b.course_name].some((s) =>
      s.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "search_campus_books",
          title: "Search course books",
          description:
            "Search the visible bookstore catalog by book code, course code or name.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 120 } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          async execute(input: any) {
            if (typeof input?.query !== "string" || input.query.length > 120)
              throw new Error("Use a search query of 120 characters or fewer.");
            setQuery(input.query);
            const result = await api(
              "catalog?q=" + encodeURIComponent(input.query),
            );
            setRemote(result.books);
            return (result.books as Book[])
              .filter((b) =>
                [b.code, b.course_code, b.title, b.course_name].some((s) =>
                  s.toLowerCase().includes(input.query.toLowerCase()),
                ),
              )
              .slice(0, 20)
              .map((b) => ({
                code: b.code,
                title: b.title,
                priceMinor: b.price,
              }));
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => { });
    return () => controller.abort();
  }, [data.books]);
  return (
    <section className="section" id="books">
      <div className="section-top">
        <div>
          <span className="eyebrow">YOUR READING LIST, SORTED</span>
          <h2>Find your next chapter.</h2>
        </div>
        <span className="muted">{data.books.length} course books</span>
      </div>
      <form
        className="searchbar"
        id="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search by book or course code"
          placeholder="Try CS101, a course code or book title…"
        />
        {query && (
          <button
            className="btn compact"
            type="button"
            onClick={() => setQuery("")}
          >
            Clear
          </button>
        )}
      </form>
      <div className="catalog-filter">
        <span>Books for every kind of curious.</span>
      </div>
      {!data.settings.store_open && (
        <div className="notice">
          We’re temporarily pausing new orders. You can still browse the
          collection.
        </div>
      )}
      <div className="book-grid">
        {(isHome && !query ? matches.slice(0, 12) : matches).map((b) => (
          <BookCard key={b.id} book={b} />
        ))}
      </div>
      {isHome && (
        <div className="view-all-books-wrapper">
          <a href="/books" className="view-all-books-btn">
            <Sparkles className="btn-sparkle" size={18} />
            <span>View All Books</span>
            <span className="btn-count">({data.books.length}+)</span>
            <div className="btn-icon-wrapper">
              <ArrowRight className="btn-arrow" size={18} />
            </div>
          </a>
        </div>
      )}
      {hasMore && (
        <div className="pagination">
          <button
            className="btn"
            disabled={searching}
            onClick={async () => {
              setSearching(true);
              try {
                const r = await api(
                  "catalog?q=" +
                  encodeURIComponent(query) +
                  "&page=" +
                  (catalogPage + 1),
                );
                if (queryRef.current !== query) return;
                setRemote([...(remote || data.books), ...r.books]);
                setCatalogPage(catalogPage + 1);
                setHasMore(r.books.length === 500);
                setSearchError("");
              } catch (e) {
                if (queryRef.current === query) setSearchError(errorText(e));
              } finally {
                if (queryRef.current === query) setSearching(false);
              }
            }}
          >
            Load more books
          </button>
        </div>
      )}
      {searching && (
        <p role="status" className="small-text">
          Searching the catalog…
        </p>
      )}
      {searchError && (
        <p role="alert" className="error-text">
          {searchError}
        </p>
      )}
      {!searching && !searchError && !matches.length && (
        <Blank
          title="No books found"
          description="Try a different book code, course name or title."
        >
          <button
            className="btn"
            onClick={() => {
              setQuery("");
            }}
          >
            Reset search
          </button>
        </Blank>
      )}
    </section>
  );
}
export function OrderTrackerCard({ o }: { o: any }) {
  const steps = [
    { id: "placed", label: "Order Placed", icon: Clock },
    { id: "verified", label: "Payment Verified", icon: ShieldCheck },
    { id: "confirmed", label: "Order Confirmed", icon: CheckCircle2 },
    { id: "processing", label: "Processing", icon: Layers },
    { id: "ready", label: "Ready for Dispatch", icon: Package },
    { id: "shipped", label: "Shipped", icon: Truck },
    { id: "delivered", label: "Delivered", icon: CheckCircle2 },
  ];

  const getActiveStep = () => {
    const s = (o.status || "").toUpperCase();
    const ps = (o.payment_status || "").toUpperCase();

    if (s === "DELIVERED") return 6;
    if (s === "SHIPPED") return 5;
    if (s === "READY" || s === "READY_FOR_DISPATCH" || s === "DISPATCHED") return 4;
    if (s === "PROCESSING" || s === "PRINTING") return 3;
    if (s === "CONFIRMED" || s === "APPROVED") return 2;
    if (ps === "VERIFIED" || ps === "PAID" || ps === "VERIFIED_OK") return 1;
    return 0; // Order Placed
  };

  const currentStep = getActiveStep();
  const totalBooks = o.items
    ? o.items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
    : 0;

  return (
    <div className="order-track-card no-print">
      <div className="track-card-header">
        <div className="track-card-info">
          <span className="track-info-label">Order Reference:</span>
          <strong className="track-ref-code">{o.reference}</strong>
        </div>

        {(o.name || o.city) && (
          <div className="track-card-info">
            <span className="track-info-label">Student:</span>
            <strong className="track-student-val">
              {o.name || "Student"} {o.city ? `(${o.city})` : ""}
            </strong>
          </div>
        )}

        <div className="track-card-info">
          <span className="track-info-label">Status:</span>
          <span
            className={`track-status-badge ${currentStep === 6
                ? "status-delivered"
                : currentStep > 0
                  ? "status-active"
                  : "status-pending"
              }`}
          >
            {o.payment_status || o.status || "PAYMENT_PENDING"}
          </span>
        </div>

        {(o.delivery_type === "campus" ||
          (o.city && o.city.toLowerCase().includes("campus")) ||
          (o.address && o.address.toLowerCase().includes("campus"))) && (
          <div className="track-card-info">
            <span className="track-info-label">Pickup Location:</span>
            <a
              href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "underline",
                fontSize: "0.85rem",
              }}
            >
              <MapPin size={14} />
              <span>VU Qanchi Campus (Google Maps)</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      <div className="track-stepper-wrapper">
        <div className="track-stepper-line">
          <div
            className="track-stepper-progress"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>

        <div className="track-stepper-steps">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isActive = idx === currentStep;

            return (
              <div
                key={step.id}
                className={`track-step ${isActive ? "active" : isCompleted ? "completed" : "pending"
                  }`}
              >
                <div className="track-step-node">
                  <Icon size={20} />
                </div>
                <span className="track-step-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="track-card-footer">
        <span className="track-items-summary">
          {totalBooks} book(s) in this order
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div className="track-total-price">
            Total:{" "}
            <strong>
              {money(o.total || (o.subtotal || 0) + (o.delivery || 0), o.currency)}
            </strong>
          </div>
          {!o.tracking_only && <ReceiptButtons order={o} />}
        </div>
      </div>
    </div>
  );
}

function HomeSections({ data }: { data: Catalog }) {
  return (
    <>
      <section className="process-section">
        <div className="section">
          <span className="eyebrow">FROM YOUR READING LIST TO YOUR DOOR</span>
          <h2>A better way to book your semester.</h2>
          <div className="steps">
            {[
              [
                "01",
                "Find Your Book",
                "Search using book or course code.",
                Search,
              ],
              [
                "02",
                "Add to Cart",
                "Choose your books and quantities.",
                ShoppingBag,
              ],
              [
                "03",
                "Checkout & Pay",
                "Enter delivery details and upload your proof.",
                ShieldCheck,
              ],
              [
                "04",
                "Receive Your Books",
                "Follow your order from review to delivery.",
                Package,
              ],
            ].map(([num, title, text, Icon]: any) => (
              <div key={num}>
                <span className="step-number">{num}</span>
                <Icon size={27} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
function BookDetail({ data, code }: { data: Catalog; code: string }) {
  const b = data.books.find((b) => b.code.toLowerCase() === code.toLowerCase()),
    { add } = useApp();
  if (!b)
    return (
      <div className="section">
        <Blank
          title="Book not found"
          description="It may no longer be available."
        >
          <a href="/books" className="btn">
            Browse books
          </a>
        </Blank>
      </div>
    );
  return (
    <section className="section">
      <a href="/books" className="text-link">
        All books
      </a>
      <div className="book-detail">
        <BookExperience books={[b]} compact />
        <div>
          <span className="eyebrow">
            {b.code} / {b.course_code}
          </span>
          <h1>{b.title}</h1>
          <p>
            {b.author && `${b.author} · `}
            {b.campus_name || "All campuses"}
          </p>
          <p className="detail-description">{b.description}</p>
          <div className="detail-facts">
            <span>{b.pages} pages</span>
          </div>
          <span className="student-price-label">Student category</span>
          <h2>{money(b.price)}</h2>
          <button
            className="btn primary"
            disabled={!b.active || !data.settings.store_open}
            onClick={() => add(b)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <ShoppingBag size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </section>
  );
}
function Cart({ data }: { data: Catalog }) {
  const { cart, setCart } = useApp();
  const lines = cart.map((i) => ({
    ...i,
    book: data.books.find((b) => b.id === i.id),
  }));
  const subtotal = lines.reduce(
    (s, i) => s + (i.book?.price || 0) * i.quantity,
    0,
  );
  const invalid = lines.some((i) => !i.book);
  return (
    <section className="section">
      <span className="eyebrow">YOUR SEMESTER STARTS HERE</span>
      <h1 className="page-title">Your book bag.</h1>
      {!cart.length ? (
        <Blank
          title="Your cart is empty"
          description="Find the course books you need and add them here."
        >
          <a className="btn primary" href="/books">
            Explore Books
          </a>
        </Blank>
      ) : (
        <div className="checkout-grid">
          <div className="stack">
            {lines.map((i) => (
              <div className="cart-row" key={i.id}>
                {i.book && <Cover book={i.book} small />}
                <div>
                  <strong>{i.book?.title || "Unavailable book"}</strong>
                  <p>
                    {i.book?.code} · {i.book?.pages} pages
                  </p>
                  <p>
                    {i.book ? money(i.book.price) : "Remove to continue"} per
                    book
                  </p>
                  <div className="quantity">
                    <button
                      aria-label={`Decrease ${i.book?.code}`}
                      onClick={() =>
                        setCart(
                          cart
                            .map((c) =>
                              c.id === i.id
                                ? { ...c, quantity: c.quantity - 1 }
                                : c,
                            )
                            .filter((c) => c.quantity > 0),
                        )
                      }
                    >
                      <Minus size={16} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      disabled={!i.book}
                      aria-label={`Increase ${i.book?.code}`}
                      onClick={() =>
                        setCart(
                          cart.map((c) =>
                            c.id === i.id
                              ? { ...c, quantity: c.quantity + 1 }
                              : c,
                          ),
                        )
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <div className="cart-row-total">
                  <strong>{money((i.book?.price || 0) * i.quantity)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${i.book?.code}`}
                    onClick={() => {
                      setCart(cart.filter((c) => c.id !== i.id));
                      toast.success("Book removed from cart.");
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <aside className="panel summary">
            <h3>Order estimate</h3>
            <Totals subtotal={subtotal} />
            <p className="small-text">
              Select your delivery method (Campus, Lahore, or Other City) during checkout.
            </p>
            {invalid ? (
              <div className="notice">
                Update unavailable items to continue.
              </div>
            ) : (
              <a className="btn primary full" href="/checkout">
                Proceed to Checkout
              </a>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
function Totals({
  subtotal,
  delivery,
}: {
  subtotal: number;
  delivery?: number;
}) {
  return (
    <div className="totals">
      <div>
        <span>Books subtotal</span>
        <strong>{money(subtotal)}</strong>
      </div>
      {typeof delivery === "number" && (
        <>
          <div>
            <span>Delivery</span>
            <strong>{money(delivery)}</strong>
          </div>
          <div className="grand-total">
            <span>Grand total</span>
            <strong>{money(subtotal + delivery)}</strong>
          </div>
        </>
      )}
      {typeof delivery !== "number" && (
        <div className="grand-total">
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
      )}
    </div>
  );
}
function uploadProof(
  path: string,
  file: File,
  onProgress: (n: number) => void,
) {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/" + path);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("X-Requested-With", "CampusBookstore");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and retry."));
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        xhr.status >= 200 && xhr.status < 300
          ? resolve(d)
          : reject(new Error(d.error));
      } catch {
        reject(new Error("Upload failed. Please retry."));
      }
    };
    xhr.send(file);
  });
}
function ProofUploader({
  path,
  max,
  onUploaded,
}: {
  path: string;
  max: number;
  onUploaded: (d: any) => void;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  return (
    <div className="proof-uploader">
      <Upload />
      <h3>Upload payment proof</h3>
      <p>JPG, PNG or PDF · up to {max} MB</p>
      <input
        type="file"
        aria-label="Payment proof"
        accept="image/jpeg,image/png,application/pdf"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setError("");
          if (f.size > max * 1024 * 1024) {
            setError(`Choose a file smaller than ${max} MB.`);
            return;
          }
          if (
            !["image/jpeg", "image/png", "application/pdf"].includes(f.type)
          ) {
            setError("Choose a JPG, PNG or PDF.");
            return;
          }
          setBusy(true);
          setProgress(0);
          try {
            const r = await uploadProof(path, f, setProgress);
            onUploaded(r);
            toast.success("Payment proof uploaded.");
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && (
        <>
          <Progress value={progress} />
          <p role="status">
            {progress < 100 ? `Uploading ${progress}%` : "Reading the slip…"}
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <p className="small-text">
        Automatic extraction checks the amount only. An administrator must
        verify the actual payment.
      </p>
    </div>
  );
}
function LocationPinPicker({
  onPinCaptured,
}: {
  onPinCaptured?: (mapUrl: string) => void;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    setMapError(false);
  }, [coords, googleMapsUrl]);

  const handleGeoLocation = () => {
    setLocating(true);
    setStatusMessage("Locating via GPS...");

    if (!navigator.geolocation) {
      toast.info("GPS unavailable in browser. Please paste your Google Maps link below.");
      setStatusMessage("Please paste your Google Maps link or location address below.");
      setLocating(false);
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      setLocating(false);

      setCoords({ lat, lng });
      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      setGoogleMapsUrl(mapUrl);
      setStatusMessage("Live GPS Location Captured");
      onPinCaptured?.(mapUrl);
      toast.success("Live GPS Location Pinned on Google Maps!");
    };

    const tryFallback = () => {
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (err) => {
          setLocating(false);
          console.warn("Geolocation fallback error:", err);
          setStatusMessage("GPS unavailable or blocked. Please paste your Google Maps link or location address below.");
          toast.info("Please paste your Google Maps link or location address below.");
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => tryFallback(),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  const handleLinkChange = (input: string) => {
    setGoogleMapsUrl(input);
    onPinCaptured?.(input);
    if (input.trim()) {
      setStatusMessage("Google Maps Location Provided");
      const match =
        input.match(/([0-9]{1,2}\.[0-9]+)[,\s]+([0-9]{1,3}\.[0-9]+)/) ||
        input.match(/q=([0-9.-]+),([0-9.-]+)/) ||
        input.match(/@([0-9.-]+),([0-9.-]+)/);
      if (match && match[1] && match[2]) {
        const lat = Number(parseFloat(match[1]).toFixed(6));
        const lng = Number(parseFloat(match[2]).toFixed(6));
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setCoords({ lat, lng });
        }
      }
    } else {
      setStatusMessage("");
    }
  };

  const defaultLat = coords?.lat ?? 31.5204;
  const defaultLng = coords?.lng ?? 74.3587;

  const embedQuery = coords
    ? `${coords.lat},${coords.lng}`
    : googleMapsUrl.trim()
      ? encodeURIComponent(googleMapsUrl.trim())
      : "Lahore,Pakistan";

  const activeMapLink = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    : googleMapsUrl.trim() || null;

  const googleEmbedSrc = `https://maps.google.com/maps?q=${embedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const osmEmbedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${defaultLng - 0.015}%2C${defaultLat - 0.015}%2C${defaultLng + 0.015}%2C${defaultLat + 0.015}&layer=mapnik&marker=${defaultLat}%2C${defaultLng}`;

  return (
    <div className="location-pin-container">
      <div className="location-pin-header">
        <div className="location-pin-title">
          <MapPin size={18} className="pin-icon" />
          <span>Rider Drop Location (Google Maps)</span>
        </div>
        <button
          type="button"
          className="btn-gps-locate"
          disabled={locating}
          onClick={handleGeoLocation}
        >
          <Crosshair size={14} className={locating ? "spinning" : ""} />
          <span>{locating ? "Locating..." : "Pin My Live Location"}</span>
        </button>
      </div>

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <label
          className="field-label"
          style={{
            fontWeight: 600,
            display: "block",
            marginBottom: 6,
            fontSize: "0.85rem",
          }}
        >
          Paste Google Maps Share Link or Address:
        </label>
        <input
          type="text"
          placeholder="e.g. https://maps.app.goo.gl/xxx or https://maps.google.com/?q=31.52,74.35"
          value={googleMapsUrl}
          onChange={(e) => handleLinkChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
            fontSize: "0.9rem",
          }}
        />
        <p
          className="small-text"
          style={{ marginTop: 6, color: "var(--muted-foreground)" }}
        >
          💡 Click <strong>&quot;Pin My Live Location&quot;</strong> above, or click <strong>&quot;Open in Maps ↗&quot;</strong> in top-left of Google Map below to select any location and copy/paste its link here.
        </p>
      </div>

      <div className="leaflet-map-picker-wrap" style={{ height: "300px", position: "relative" }}>
        <iframe
          key={mapError ? "osm" : "gmap"}
          title="Google Map Location View"
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: "8px" }}
          loading="lazy"
          allowFullScreen
          onError={() => setMapError(true)}
          src={mapError ? osmEmbedSrc : googleEmbedSrc}
        />
      </div>

      <div
        className={`pin-status-bar ${activeMapLink ? "" : "warning"}`}
        style={{ marginTop: 10 }}
      >
        {coords ? (
          <>
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
            <span>
              Google Maps Live Pinned: <strong>{statusMessage || "Selected Location"}</strong> ({coords.lat}, {coords.lng})
            </span>
            {activeMapLink && (
              <a
                href={activeMapLink}
                target="_blank"
                rel="noreferrer"
                className="pin-map-link"
                style={{ marginLeft: "auto", fontWeight: 600 }}
              >
                Open in Google Maps App ↗
              </a>
            )}
          </>
        ) : googleMapsUrl.trim() ? (
          <>
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
            <span style={{ wordBreak: "break-all" }}>
              Google Maps Link Captured: <strong>{googleMapsUrl}</strong>
            </span>
            {activeMapLink && (
              <a
                href={activeMapLink}
                target="_blank"
                rel="noreferrer"
                className="pin-map-link"
                style={{ marginLeft: "auto", fontWeight: 600 }}
              >
                Open Google Maps ↗
              </a>
            )}
          </>
        ) : (
          <>
            <MapPin size={16} style={{ color: "#f59e0b" }} />
            <span>
              {statusMessage ||
                "Click 'Pin My Live Location' or paste your Google Maps link above."}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
function Checkout({ data }: { data: Catalog }) {
  const { cart, setCart, ready } = useApp();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "Lahore",
    address: "",
    instructions: "",
    delivery_type: "lahore",
    campus_id: "",
  }),
    [quote, setQuote] = useState<Quote | null>(null),
    [step, setStep] = useState(1),
    [slip, setSlip] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key: string, value: string) =>
    setForm({ ...form, [key]: value });
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api("orders", { quote_id: quote!.id, slip_id: slip.id });
      setCart([]);
      location.href = `/orders?id=${encodeURIComponent(r.reference)}`;
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  if (!cart.length)
    return (
      <div className="section">
        <Blank title="Your cart is empty">
          <a className="btn primary" href="/books">
            Browse books
          </a>
        </Blank>
      </div>
    );
  return (
    <section className="section">
      <span className="eyebrow">A FEW DETAILS, THEN YOU’RE ALL SET</span>
      <h1 className="page-title">Checkout.</h1>
      <div className="checkout-steps">
        {["Delivery", "Payment"].map((s, i) => (
          <span key={s} className={i + 1 === step ? "active" : ""}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      {error && (
        <div className="notice error-text" role="alert">
          {error}
        </div>
      )}
      <div className="checkout-grid">
        <div className="panel">
          {step === 1 ? (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const r = await api("quote", {
                    ...form,
                    campus_id: form.campus_id || null,
                    items: cart,
                  });
                  setQuote(r);
                  setStep(2);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h3>Customer & delivery details</h3>
              <div className="form-grid">
                <Field label="Full Name">
                  <input
                    required
                    autoComplete="name"
                    value={form.name}
                    maxLength={100}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </Field>
                <Field label="WhatsApp Mobile Number">
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    maxLength={20}
                    placeholder="03xx xxxxxxx"
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
              </div>
              <div className="delivery-options-container">
                <label className="field-label" style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Select Delivery Method
                </label>
                <div className="delivery-cards-grid">
                  <button
                    type="button"
                    className={`delivery-option-card ${form.delivery_type === "campus" ? "selected" : ""}`}
                    onClick={() => {
                      setForm({
                        ...form,
                        delivery_type: "campus",
                        city: "VU Qanchi Campus",
                        address: "Pickup from VU Qanchi Campus Bookstore Counter",
                      });
                    }}
                  >
                    <div className="delivery-option-badge">{money(data.settings.delivery_campus ?? 10000)}</div>
                    <div className="delivery-option-icon">
                      <Building2 size={24} />
                    </div>
                    <div className="delivery-option-info">
                      <strong>VU Qanchi Campus Pickup</strong>
                      <span>Only from VU Qanchi Campus Counter</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`delivery-option-card ${form.delivery_type === "lahore" ? "selected" : ""}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        delivery_type: "lahore",
                        city: "Lahore",
                        address: form.address.startsWith("Pickup from") ? "" : form.address,
                      })
                    }
                  >
                    <div className="delivery-option-badge">{money(data.settings.delivery_lahore)}</div>
                    <div className="delivery-option-icon">
                      <Navigation size={24} />
                    </div>
                    <div className="delivery-option-info">
                      <strong>Lahore - At Home</strong>
                      <span>Rider delivery to home / map pin</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`delivery-option-card ${form.delivery_type === "other" ? "selected" : ""}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        delivery_type: "other",
                        city: form.city === "Lahore" || form.city.includes("Campus") ? "" : form.city,
                        address: form.address.startsWith("Pickup from") ? "" : form.address,
                      })
                    }
                  >
                    <div className="delivery-option-badge">{money(data.settings.delivery_other)}</div>
                    <div className="delivery-option-icon">
                      <Truck size={24} />
                    </div>
                    <div className="delivery-option-info">
                      <strong>Other City</strong>
                      <span>Courier delivery nationwide</span>
                    </div>
                  </button>
                </div>
              </div>

              {form.delivery_type === "campus" ? (
                <div className="campus-pickup-notice">
                  <div className="notice-icon">
                    <Building2 size={24} style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <strong>📍 Campus Pickup Only From VU Qanchi Campus ({money(data.settings.delivery_campus ?? 10000)})</strong>
                    <p style={{ marginTop: 4 }}>
                      ⚠️ <strong>Please Note:</strong> Campus pickup is available <u>only from the VU Qanchi Campus bookstore counter (Lahore)</u>. No home address required — just show your Order ID at the counter to collect your books.
                    </p>
                    <div style={{ marginTop: 10 }}>
                      <a
                        href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn compact"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.85rem",
                          background: "var(--primary)",
                          color: "var(--primary-foreground)",
                          textDecoration: "none",
                        }}
                      >
                        <MapPin size={15} />
                        <span>View VU Qanchi Campus on Google Maps</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              ) : form.delivery_type === "lahore" ? (
                <>
                  <div className="form-grid">
                    <Field label="City">
                      <input
                        readOnly
                        value="Lahore"
                        style={{ opacity: 0.85, cursor: "not-allowed" }}
                      />
                    </Field>
                  </div>

                  <LocationPinPicker
                    onPinCaptured={(pinUrl) => {
                      setForm((f) => {
                        const otherLines = (f.instructions || "")
                          .split("\n")
                          .filter((l) => !l.includes("📍 Pin Location:") && !l.includes("https://maps.google.com"))
                          .join("\n")
                          .trim();
                        return {
                          ...f,
                          instructions: otherLines
                            ? `${otherLines}\n📍 Pin Location: ${pinUrl}`
                            : `📍 Pin Location: ${pinUrl}`,
                        };
                      });
                    }}
                  />

                  <Field label="Complete Home / Street Address in Lahore">
                    <textarea
                      required
                      autoComplete="street-address"
                      rows={3}
                      placeholder="House #, Street #, Sector/Area, Nearby landmark"
                      value={form.address}
                      maxLength={500}
                      onChange={(e) => set("address", e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <div className="form-grid">
                    <Field label="City">
                      <input
                        required
                        placeholder="e.g. Faisalabad, Karachi, Rawalpindi"
                        autoComplete="address-level2"
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Complete Written Delivery Address (Courier Service)">
                    <textarea
                      required
                      autoComplete="street-address"
                      rows={3}
                      placeholder="Complete House/Apartment No, Street, Area/Mohallah, Postal Code"
                      value={form.address}
                      maxLength={500}
                      onChange={(e) => set("address", e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field label="Delivery instructions (optional)">
                <textarea
                  value={form.instructions}
                  maxLength={500}
                  onChange={(e) => set("instructions", e.target.value)}
                />
              </Field>
              <button className="btn primary" disabled={busy || !ready}>
                {busy ? "Checking prices…" : "Proceed to Payment"}
              </button>
            </form>
          ) : (
            <div className="stack">
              <h3>Transfer {money(quote!.total)}</h3>
              <p className="small-text">
                Your quote is valid for 30 minutes. Stock is reserved after you
                submit proof.
              </p>
              <div className="bank-card">
                <span className="eyebrow">{quote!.settings.bank_name}</span>
                <small>ACCOUNT NUMBER</small>
                <strong>{quote!.settings.bank_account}</strong>
                <button
                  className="btn compact"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(quote!.settings.bank_account)
                      .then(() => toast.success("Account number copied."))
                      .catch(() =>
                        toast.error(
                          "Copy unavailable. Select the number above.",
                        ),
                      )
                  }
                >
                  <Copy size={16} />
                  Copy Account Number
                </button>
                <small style={{ marginTop: 8 }}>IBAN NUMBER</small>
                <strong>{quote!.settings.bank_iban || "PK29MEZN0011550109645933"}</strong>
                <button
                  className="btn compact"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(quote!.settings.bank_iban || "PK29MEZN0011550109645933")
                      .then(() => toast.success("IBAN number copied."))
                      .catch(() =>
                        toast.error(
                          "Copy unavailable. Select the IBAN above.",
                        ),
                      )
                  }
                >
                  <Copy size={16} />
                  Copy IBAN Number
                </button>
                <small style={{ marginTop: 8 }}>ACCOUNT TITLE</small>
                <b>{quote!.settings.account_title}</b>
              </div>
              <ProofUploader
                path={"proofs?quote=" + quote!.id}
                max={data.settings.max_upload_mb}
                onUploaded={setSlip}
              />
              {slip && (
                <div className="notice">
                  <Status value={slip.status} />
                  <p>{slip.message}</p>
                  {slip.detected_amount !== null && (
                    <p>
                      Detected payment: {money(slip.detected_amount)} ·
                      Required: {money(quote!.total)}
                    </p>
                  )}
                </div>
              )}
              <button
                className="btn primary"
                disabled={!slip || busy}
                onClick={submit}
              >
                {busy ? "Submitting…" : "Submit Order for Verification"}
              </button>
              <p className="small-text">
                By submitting, you agree to our <a href="/terms">terms</a> and{" "}
                <a href="/privacy">privacy policy</a>.
              </p>
              <button
                className="btn"
                onClick={() => {
                  setStep(1);
                  setSlip(null);
                }}
              >
                Return to delivery details
              </button>
            </div>
          )}
        </div>
        <aside className="panel summary">
          <h3>Your books</h3>
          {(
            quote?.items ||
            cart.map((i) => {
              const b = data.books.find((book) => book.id === i.id);
              return {
                ...b,
                id: i.id,
                code: b?.code || "",
                title: b?.title || "",
                price: b?.price || 0,
                quantity: i.quantity,
                book: b,
              };
            })
          ).map((i: any) => {
            const bookObj =
              i.book ||
              data.books.find(
                (b) => b.code === i.code || b.id === i.id || b.title === i.title,
              );
            return (
              <div className="summary-item checkout-book-item" key={i.id || i.code}>
                {bookObj ? (
                  <Cover book={bookObj} small />
                ) : (
                  <div className="cover-placeholder small">
                    <BookOpen size={20} />
                  </div>
                )}
                <div className="summary-item-details">
                  <div className="summary-book-code">{i.code}</div>
                  <div className="summary-book-title">
                    {bookObj?.title || i.title || "Course Material"}
                  </div>
                  <div className="summary-book-qty">Qty: {i.quantity}</div>
                </div>
                <strong className="summary-item-price">
                  {money((i.price || 0) * i.quantity)}
                </strong>
              </div>
            );
          })}
          <Totals
            subtotal={
              quote?.subtotal ||
              cart.reduce(
                (s, i) =>
                  s +
                  (data.books.find((b) => b.id === i.id)?.price || 0) *
                  i.quantity,
                0,
              )
            }
            delivery={
              quote?.delivery ??
              (form.delivery_type === "campus"
                ? (data.settings.delivery_campus ?? 10000)
                : form.delivery_type === "lahore"
                  ? data.settings.delivery_lahore
                  : data.settings.delivery_other)
            }
          />
          <div className="small-text">
            <ShieldCheck size={18} /> Secure proof upload. Manual payment
            verification.
          </div>
        </aside>
      </div>
    </section>
  );
}
function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printOrderReceiptSlip(order: any) {
  const storeName = order.store?.store_name || "Campus Bookstore";
  const contact = [order.store?.support_email, order.store?.whatsapp]
    .filter(Boolean)
    .join(" · ");
  const isPickup =
    order.delivery_type === "campus" ||
    (order.city && String(order.city).toLowerCase().includes("campus")) ||
    (order.address && String(order.address).toLowerCase().includes("campus"));
  const locationLabel = isPickup ? "Pickup Location (VU Qanchi Campus)" : "Deliver to";

  const itemsHtml = (order.items || [])
    .map(
      (b: any) => `
        <tr>
          <td>
            <strong>${escapeHtml(b.title)}</strong>
            <small>${escapeHtml(b.code)} · ${b.pages} pages</small>
          </td>
          <td>${b.quantity}</td>
          <td>${escapeHtml(money(b.unit_price, order.currency))}</td>
          <td>${escapeHtml(money(b.unit_price * b.quantity, order.currency))}</td>
        </tr>
      `
    )
    .join("");

  const customerHtml = !order.tracking_only
    ? `
      <div class="receipt-customer">
        <div>
          <span class="receipt-label">Billed to</span>
          <h3>${escapeHtml(order.name || "")}</h3>
          <p>${escapeHtml(order.phone || "")}</p>
        </div>
        <div>
          <span class="receipt-label">${locationLabel}</span>
          <p>${escapeHtml(order.address || "")}<br />${escapeHtml(order.city || "")}</p>
        </div>
      </div>
    `
    : "";

  const instructionsHtml =
    !order.tracking_only && order.instructions
      ? `
      <div class="receipt-instructions">
        <span class="receipt-label">Delivery instructions</span>
        <p>${escapeHtml(order.instructions)}</p>
      </div>
    `
      : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Order Receipt - ${escapeHtml(order.reference || "")}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a3350;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: A4;
      margin: 12mm;
    }
    .order-receipt {
      width: 100%;
      max-width: 100%;
      border: 1px solid #d4e0f0;
      border-radius: 6px;
      background: #ffffff;
      overflow: hidden;
      color: #1a3350;
    }
    .receipt-header {
      border-top: 5px solid #2563a6;
      background: #edf5ff;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .receipt-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .receipt-brand-icon {
      color: #2563a6;
      display: flex;
    }
    .receipt-brand strong {
      display: block;
      font-size: 1.15rem;
      font-weight: 700;
      color: #1a3350;
      line-height: 1.3;
    }
    .receipt-brand span {
      display: block;
      margin-top: 3px;
      font-size: 0.62rem;
      letter-spacing: 0.14em;
      color: #5e7087;
      font-weight: 600;
    }
    .receipt-document-label {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #2563a6;
    }
    .receipt-meta {
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #d4e0f0;
      background: #ffffff;
    }
    .receipt-label {
      display: block;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5e7087;
      margin-bottom: 6px;
    }
    .receipt-meta h2 {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
      color: #1a3350;
      line-height: 1.4;
    }
    .receipt-meta p {
      font-size: 0.85rem;
      margin: 0;
      color: #1a3350;
      line-height: 1.6;
    }
    .receipt-customer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 18px 24px;
      border-bottom: 1px solid #d4e0f0;
      background: #ffffff;
    }
    .receipt-customer h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #1a3350;
    }
    .receipt-customer p {
      font-size: 0.84rem;
      line-height: 1.6;
      margin: 0;
      color: #1a3350;
    }
    .receipt-items {
      width: calc(100% - 48px);
      margin: 18px 24px;
      border-collapse: collapse;
      text-align: left;
    }
    .receipt-items th {
      background: #edf5ff;
      color: #1a3350;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 10px 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: none;
    }
    .receipt-items th:first-child { width: 48%; border-radius: 4px 0 0 4px; }
    .receipt-items th:nth-child(2) { width: 10%; text-align: right; }
    .receipt-items th:nth-child(3) { width: 20%; text-align: right; }
    .receipt-items th:last-child { width: 22%; text-align: right; border-radius: 0 4px 4px 0; }
    .receipt-items td {
      padding: 14px 8px;
      border-bottom: 1px solid #d4e0f0;
      font-size: 0.82rem;
      color: #1a3350;
      vertical-align: top;
    }
    .receipt-items td:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
    .receipt-items td strong { display: block; font-weight: 650; font-size: 0.88rem; line-height: 1.5; color: #1a3350; }
    .receipt-items td small { display: block; color: #5e7087; font-size: 0.72rem; margin-top: 4px; }
    .receipt-bottom {
      display: flex;
      justify-content: flex-end;
      padding: 18px 24px;
      background: #ffffff;
    }
    .receipt-totals {
      width: 280px;
      max-width: 100%;
      margin: 0;
      font-size: 0.85rem;
    }
    .receipt-totals > div {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      color: #1a3350;
    }
    .receipt-totals dd {
      margin: 0;
      text-align: right;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .receipt-totals .receipt-grand-total {
      margin-top: 8px;
      border-top: 2px solid #2563a6;
      color: #2563a6;
      padding-top: 10px;
      font-size: 1.05rem;
      font-weight: 800;
    }
    .receipt-instructions {
      padding: 0 24px 18px;
      font-size: 0.82rem;
      background: #ffffff;
    }
    .receipt-instructions p { margin: 4px 0 0; color: #1a3350; line-height: 1.5; }
    .receipt-footer {
      display: block;
      margin: 0 24px 20px;
      padding-top: 16px;
      border-top: 1px solid #d4e0f0;
      background: #ffffff;
    }
    .receipt-footer strong { font-size: 0.88rem; color: #1a3350; }
    .receipt-footer p, .receipt-footer span {
      font-size: 0.76rem;
      line-height: 1.6;
      color: #5e7087;
      margin: 5px 0 0;
    }
    .receipt-footer span { display: block; }
    .receipt-header, .receipt-meta, .receipt-customer, .receipt-bottom, .receipt-footer, .receipt-items tr {
      break-inside: avoid;
    }
    @media print {
      body { padding: 0; background: none; }
      .order-receipt { border: 1px solid #d4e0f0 !important; }
    }
  </style>
</head>
<body>
  <article class="order-receipt">
    <header class="receipt-header">
      <div class="receipt-brand">
        <span class="receipt-brand-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </span>
        <div>
          <strong>${escapeHtml(storeName)}</strong>
          <span>BOOKS FOR YOUR NEXT CHAPTER</span>
        </div>
      </div>
      <span class="receipt-document-label">${order.tracking_only ? "ORDER SUMMARY" : "ORDER RECEIPT"}</span>
    </header>
    <div class="receipt-meta">
      <div>
        <span class="receipt-label">Order ID</span>
        <h2>${escapeHtml(order.reference || "")}</h2>
      </div>
      <div>
        <span class="receipt-label">Issued on</span>
        <p>${escapeHtml(receiptDate(order.created_at))}</p>
      </div>
    </div>
    ${customerHtml}
    <table class="receipt-items">
      <thead>
        <tr>
          <th scope="col">Book / description</th>
          <th scope="col">Qty</th>
          <th scope="col">Unit price</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="receipt-bottom">
      <dl class="receipt-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>${escapeHtml(money(order.subtotal, order.currency))}</dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>${escapeHtml(money(order.delivery, order.currency))}</dd>
        </div>
        <div class="receipt-grand-total">
          <dt>Grand total</dt>
          <dd>${escapeHtml(money(order.total, order.currency))}</dd>
        </div>
      </dl>
    </div>
    ${instructionsHtml}
    <footer class="receipt-footer">
      <strong>Thank you for choosing ${escapeHtml(storeName)}.</strong>
      <p>${escapeHtml(receiptPaymentNote(order.payment_status))}</p>
      ${contact ? `<p>${escapeHtml(contact)}</p>` : ""}
      <span>Keep your Order ID for tracking and support.</span>
    </footer>
  </article>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        win.print();
      }
    }
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 10000);
  }, 250);
}

export function ReceiptButtons({ order }: { order: any }) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="track-receipt-actions no-print" style={{ display: "inline-flex", gap: 10, alignItems: "center", margin: 0, padding: 0 }}>
      <button
        type="button"
        className="track-receipt-btn-print"
        onClick={() => printOrderReceiptSlip(order)}
        title="Print official order receipt"
      >
        <Printer size={15} />
        <span>Print Receipt</span>
      </button>
      <button
        type="button"
        className="track-receipt-btn-download"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/orders/" + order.id + "/receipt");
            if (!r.ok) throw new Error("Unable to generate receipt.");
            const url = URL.createObjectURL(await r.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = order.reference + ".pdf";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch (e) {
            toast.error(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
        title="Download official PDF receipt"
      >
        <Download size={15} />
        <span>{busy ? "Preparing…" : "Download Receipt"}</span>
      </button>
    </div>
  );
}
export function OrderReceipt({ o }: { o: any }) {
  const storeName = o.store?.store_name || "Campus Bookstore";
  const contact = [o.store?.support_email, o.store?.whatsapp]
    .filter(Boolean)
    .join(" · ");
  return (
    <article
      className="order-receipt"
      aria-label={o.tracking_only ? "Order summary" : "Order receipt"}
    >
      <header className="receipt-header">
        <div className="receipt-brand">
          <span className="receipt-brand-icon">
            <BookOpen size={23} />
          </span>
          <div>
            <strong>{storeName}</strong>
            <span>BOOKS FOR YOUR NEXT CHAPTER</span>
          </div>
        </div>
        <span className="receipt-document-label">
          {o.tracking_only ? "ORDER SUMMARY" : "ORDER RECEIPT"}
        </span>
      </header>
      <div className="receipt-meta">
        <div>
          <span className="receipt-label">Order ID</span>
          <h2>{o.reference}</h2>
        </div>
        <div>
          <span className="receipt-label">Issued on</span>
          <p>{receiptDate(o.created_at)}</p>
        </div>
      </div>
      {!o.tracking_only && (
        <div className="receipt-customer">
          <div>
            <span className="receipt-label">Billed to</span>
            <h3>{o.name}</h3>
            <p>{o.phone}</p>
          </div>
          <div>
            <span className="receipt-label">
              {o.delivery_type === "campus" || (o.city && o.city.toLowerCase().includes("campus"))
                ? "Pickup Location (VU Qanchi Campus)"
                : "Deliver to"}
            </span>
            <p>
              {o.address}
              <br />
              {o.city}
            </p>
            {(o.delivery_type === "campus" ||
              (o.city && o.city.toLowerCase().includes("campus")) ||
              (o.address && o.address.toLowerCase().includes("campus"))) && (
              <p style={{ marginTop: 6 }} className="no-print">
                <a
                  href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: "var(--primary)",
                    fontWeight: 600,
                    textDecoration: "underline",
                    fontSize: "0.85rem",
                  }}
                >
                  <MapPin size={14} />
                  <span>View VU Qanchi Campus on Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              </p>
            )}
          </div>
        </div>
      )}
      <table className="receipt-items">
        <thead>
          <tr>
            <th scope="col">Book / description</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit price</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((b: any) => (
            <tr key={b.id || b.code}>
              <td>
                <strong>{b.title}</strong>
                <small>
                  {b.code} · {b.pages} pages
                </small>
              </td>
              <td>{b.quantity}</td>
              <td>{money(b.unit_price, o.currency)}</td>
              <td>{money(b.unit_price * b.quantity, o.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-bottom">
        <dl className="receipt-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(o.subtotal, o.currency)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>{money(o.delivery, o.currency)}</dd>
          </div>
          <div className="receipt-grand-total">
            <dt>Grand total</dt>
            <dd>{money(o.total, o.currency)}</dd>
          </div>
        </dl>
      </div>
      {!o.tracking_only && o.instructions && (
        <div className="receipt-instructions">
          <span className="receipt-label">Delivery instructions</span>
          <p>{o.instructions}</p>
        </div>
      )}
      <footer className="receipt-footer">
        <strong>Thank you for choosing {storeName}.</strong>
        <p>{receiptPaymentNote(o.payment_status)}</p>
        {contact && <p>{contact}</p>}
        <span>Keep your Order ID for tracking and support.</span>
      </footer>
    </article>
  );
}
function OrderTracking({ data }: { data: Catalog }) {
  const [o, setO] = useState<any>(null),
    [reference, setReference] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { ready } = useApp();
  const latestLookup = useRef(0);
  const load = async (id: string) => {
    if (!id.trim()) return;
    const lookup = ++latestLookup.current;
    setBusy(true);
    setError("");
    setO(null);
    try {
      const r = await api("orders/" + encodeURIComponent(id.trim()));
      if (lookup !== latestLookup.current) return;
      setO(r);
      setReference(r.reference);
      const url = new URL(window.location.href);
      url.searchParams.set("id", r.reference);
      window.history.replaceState(null, "", url.toString());
    } catch (e) {
      if (lookup === latestLookup.current) setError(errorText(e));
    } finally {
      if (lookup === latestLookup.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (!ready) return;
    const q = new URLSearchParams(location.search);
    const initialId =
      q.get("id") ||
      (location.hash.startsWith("#CBS-") ? location.hash.slice(1) : "");
    if (initialId) {
      setReference(initialId);
      void load(initialId);
    }
  }, [ready]);
  return (
    <section className="section track-page-container">
      <div className="home-track-section no-print" style={{ margin: "20px 0 35px" }}>
        <div className="home-track-badge">REAL-TIME ORDER TRACKING</div>
        <h1 className="home-track-title">Track Your Course Materials Order</h1>
        <p className="home-track-subtitle">
          Enter your unique Order ID (e.g. CBS-04102026-1024) to view status details.
        </p>

        <form
          className="home-track-form"
          onSubmit={(e) => {
            e.preventDefault();
            void load(reference);
          }}
        >
          <div className="home-track-input-wrap">
            <Search size={19} />
            <input
              type="text"
              className="home-track-input"
              placeholder="e.g. CBS-04102026-1024"
              value={reference}
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => setReference(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="home-track-btn" disabled={busy}>
            <span>{busy ? "Tracking…" : "Track"}</span>
          </button>
        </form>

        {error && (
          <div
            className="notice error-text"
            style={{ marginTop: 20, textAlign: "center" }}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>

      {busy ? (
        <div style={{ padding: "30px 0", display: "flex", justifyContent: "center" }}>
          <Loading />
        </div>
      ) : o ? (
        <>
          <OrderTrackerCard o={o} />
          <div className="print-only">
            <OrderReceipt o={o} />
          </div>
          {/* Top Priority Action: When Admin requests a new payment proof */}
          {o.payment_status === "NEW_SLIP_REQUESTED" && (
            <div
              className="track-details-wrapper no-print"
              style={{ maxWidth: 720, margin: "24px auto 0" }}
            >
              <div
                className="panel"
                style={{
                  border: "2px solid #ef4444",
                  background:
                    "linear-gradient(180deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.01) 100%)",
                  boxShadow: "0 6px 20px rgba(239, 68, 68, 0.12)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      padding: "10px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color: "#991b1b",
                        fontSize: "1.15rem",
                        fontWeight: 700,
                      }}
                    >
                      Action Required: Upload New Payment Proof
                    </h3>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "#4b5563",
                        fontSize: "0.88rem",
                      }}
                    >
                      Admin has requested a new payment slip. Please upload your valid payment screenshot / receipt below.
                    </p>
                  </div>
                </div>

                {o.payment_note && (
                  <div
                    style={{
                      marginBottom: 18,
                      background: "#ffffff",
                      border: "1px solid #fecaca",
                      borderLeft: "4px solid #ef4444",
                      padding: "12px 16px",
                      borderRadius: "0 8px 8px 0",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: "#991b1b",
                        fontSize: "0.82rem",
                        letterSpacing: "0.03em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Reason from Admin:
                    </strong>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        color: "#1f2937",
                        fontWeight: 500,
                      }}
                    >
                      {o.payment_note}
                    </span>
                  </div>
                )}

                {!o.tracking_only ? (
                  <ProofUploader
                    path={"proofs?order=" + o.id}
                    max={data.settings.max_upload_mb}
                    onUploaded={() => load(o.id)}
                  />
                ) : (
                  <p className="notice" style={{ margin: 0 }}>
                    Use the device you placed this order on to upload a replacement payment proof, or contact support.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="track-details-wrapper no-print" style={{ maxWidth: 720, margin: "24px auto 0" }}>
            <div className="panel">
              <h3 style={{ margin: "0 0 16px 0" }}>Order journey</h3>
              <div className="timeline">
                {o.history.map((h: any, i: number) => (
                  <div key={i}>
                    <Status value={h.status} />
                    {h.note && <p>{h.note}</p>}
                    <small>{new Date(h.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
function Information({ mode, data }: { mode: string; data: Catalog }) {
  if (mode === "contact") {
    return <SupportCallout data={data} />;
  }
  const s = data.settings;
  const rawPhone = s.whatsapp || "03034049973";
  const phone = rawPhone.replace(/^\+92/, "0").replace(/^\+/, "");

  const content: Record<
    string,
    {
      eyebrow?: string;
      title: string;
      subtitle?: string;
      sections: {
        title: string;
        text: string;
        icon?: any;
        badge?: string;
        accent?: string;
      }[];
    }
  > = {
    about: {
      eyebrow: "ABOUT CAMPUS BOOKSTORE",
      title: "Books that fit your campus life.",
      subtitle:
        "Empowering university students with effortless course book ordering, transparent pricing, and instant order tracking.",
      sections: [
        {
          title: "Your courses, one place",
          text: "We help students find required books using familiar course and book codes. Clear book prices make it easier to plan a semester, and online ordering keeps everything in one place.",
          icon: BookOpen,
          badge: "SEMESTER READY",
          accent: "cyan",
        },
        {
          title: "From search to your doorstep",
          text: "Browse course materials, add books to your cart, enter delivery details and upload your bank payment proof. Track progress with your Order ID. Your receipt is available on the device used to place the order.",
          icon: Truck,
          badge: "FAST DISPATCH",
          accent: "amber",
        },
        {
          title: "A human check at every payment",
          text: "Automatic document reading can help check an amount. An administrator makes the final decision after reviewing the actual payment.",
          icon: ShieldCheck,
          badge: "VERIFIED & SECURE",
          accent: "emerald",
        },
      ],
    },
    faq: {
      eyebrow: "HELP & SUPPORT",
      title: "Frequently Asked Questions",
      subtitle:
        "Everything you need to know about placing orders, payment verification, and order tracking.",
      sections: [
        {
          title: "Where can I see the total price?",
          text: "Each book shows its total price. Your cart and checkout show the complete order total, including delivery, before you confirm.",
          icon: Search,
          badge: "PRICING",
          accent: "cyan",
        },
        {
          title: "Do I need an account?",
          text: "No account is needed to browse, order or track progress. Enter the Order ID from your confirmation to track your books from any device.",
          icon: Package,
          badge: "ACCOUNT FREE",
          accent: "amber",
        },
        {
          title: "Does an amount match confirm my payment?",
          text: "No. OCR reads visible text only. An administrator must verify the actual payment before your order is processed.",
          icon: ShieldCheck,
          badge: "PAYMENTS",
          accent: "emerald",
        },
        {
          title: "What if my slip cannot be read?",
          text: "Your proof is submitted for manual review. If another slip is needed, the request appears on your order tracking page.",
          icon: AlertTriangle,
          badge: "VERIFICATION",
          accent: "purple",
        },
      ],
    },
    privacy: {
      eyebrow: "PRIVACY POLICY",
      title: "Privacy policy",
      subtitle: "How we collect, protect, and handle your order information.",
      sections: [
        {
          title: "Information we collect",
          text: "We store your name, WhatsApp number, delivery address, order contents and payment proof to fulfil and support your order. Administrative actions and browser information are recorded for accountability.",
          icon: ShieldCheck,
          badge: "DATA COLLECTION",
          accent: "cyan",
        },
        {
          title: "How information is used",
          text: "Order details are available to authorized staff and, for a selected campus, its authorized administrators. Payment slips are restricted to Super Admin. If a document extraction provider is configured, payment proof is sent securely to that provider for amount extraction.",
          icon: Layers,
          badge: "DATA USAGE",
          accent: "amber",
        },
        {
          title: "Your device and your choices",
          text: "Cart and theme preferences are stored on your device. Essential secure cookies maintain login and guest-order access. Contact support to request access, correction or deletion of information, subject to record-keeping obligations.",
          icon: BookOpen,
          badge: "YOUR RIGHTS",
          accent: "emerald",
        },
        {
          title: "Order tracking",
          text: "Anyone with your Order ID can view its status, books, totals and progress. Customer contact details, delivery addresses and payment documents are available only on the ordering device or to authorized staff.",
          icon: Package,
          badge: "TRACKING DATA",
          accent: "purple",
        },
      ],
    },
    terms: {
      eyebrow: "TERMS OF SERVICE",
      title: "Terms & conditions",
      subtitle: "Rules and guidelines for ordering books through Campus Bookstore.",
      sections: [
        {
          title: "Placing an order",
          text: "Prices and delivery fees are validated at submission. An order is pending until payment has been reviewed. Uploading a receipt does not establish that a bank transfer has been received.",
          icon: ShoppingBag,
          badge: "ORDERING",
          accent: "cyan",
        },
        {
          title: "Course materials",
          text: "Check the book code, course, page count and edition before ordering. Contact support if you are unsure which material is appropriate for your course.",
          icon: BookOpen,
          badge: "COURSE BOOKS",
          accent: "amber",
        },
        {
          title: "Payment and fulfilment",
          text: "Transfer the exact quoted total using the displayed bank details. Keep your Order ID to follow fulfilment updates on the tracking page.",
          icon: ShieldCheck,
          badge: "PAYMENTS",
          accent: "emerald",
        },
      ],
    },
    shipping: {
      eyebrow: "SHIPPING & DELIVERY",
      title: "Shipping policy",
      subtitle: "Delivery fees, dispatch schedules, and tracking guidelines.",
      sections: [
        {
          title: "Delivery charges",
          text: `Lahore delivery is ${money(s.delivery_lahore)}. Other cities are ${money(s.delivery_other)}. The server applies the current charge at checkout.`,
          icon: Truck,
          badge: "CHARGES",
          accent: "cyan",
        },
        {
          title: "Dispatch and tracking",
          text: "After payment verification, orders move through processing, ready for dispatch, shipped and delivered. Delivery estimates are provided by support; no guaranteed transit time is currently published.",
          icon: Package,
          badge: "DISPATCH",
          accent: "amber",
        },
        {
          title: "Address changes",
          text: "Contact support with your order reference as soon as possible. Changes after dispatch may not be possible.",
          icon: MapPin,
          badge: "UPDATES",
          accent: "purple",
        },
      ],
    },
    refund: {
      eyebrow: "REFUNDS & RETURNS",
      title: "Refund & cancellation policy",
      subtitle: "Guidelines for cancelling orders or requesting refunds.",
      sections: [
        {
          title: "Cancellations",
          text: "Contact support with your order reference before dispatch to request cancellation. The administrator will review the order and payment status.",
          icon: AlertTriangle,
          badge: "CANCELLATION",
          accent: "amber",
        },
        {
          title: "Refund requests",
          text: "Contact support if a book is missing, incorrect or damaged. Provide your order reference and relevant details. Refund requests are reviewed individually; payment is not automatically reversed by this application.",
          icon: ShieldCheck,
          badge: "REFUNDS",
          accent: "cyan",
        },
        {
          title: "Resolution",
          text: "Keep your payment proof and receipt until your request is resolved. Support will confirm the applicable return and refund arrangements.",
          icon: CheckCircle2,
          badge: "RESOLUTION",
          accent: "emerald",
        },
      ],
    },
  };

  const page = content[mode] || content.about;

  return (
    <section className="section static-3d-page">
      <div className="static-hero-header">
        <div className="static-eyebrow-pill">
          <Sparkles size={14} className="sparkle-icon" />
          <span>{page.eyebrow || "CAMPUS BOOKSTORE"}</span>
        </div>
        <h1 className="static-hero-title">{page.title}</h1>
        {page.subtitle && (
          <p className="static-hero-subtitle">{page.subtitle}</p>
        )}
      </div>

      <div className="static-grid-3d">
        {page.sections.map((sec, idx) => {
          const IconComp = sec.icon || BookOpen;
          return (
            <div
              key={sec.title}
              className={`static-card-3d accent-${sec.accent || "cyan"}`}
            >
              <div className="card-3d-top">
                <div className="card-3d-icon-box">
                  <IconComp size={24} />
                </div>
                <span className="card-3d-badge">
                  {sec.badge || `0${idx + 1}`}
                </span>
              </div>
              <h3 className="card-3d-title">{sec.title}</h3>
              <p className="card-3d-text">{sec.text}</p>
              <div className="card-3d-glow" />
            </div>
          );
        })}
      </div>

      <div className="static-highlights-banner">
        <div className="highlight-item">
          <CheckCircle2 size={22} className="highlight-icon cyan-icon" />
          <div>
            <strong>100% Verified Books</strong>
            <small>Authentic course materials</small>
          </div>
        </div>
        <div className="highlight-item">
          <Truck size={22} className="highlight-icon amber-icon" />
          <div>
            <strong>Campus & Rider Delivery</strong>
            <small>Fast dispatches daily</small>
          </div>
        </div>
        <div className="highlight-item">
          <ShieldCheck size={22} className="highlight-icon emerald-icon" />
          <div>
            <strong>Secure Verification</strong>
            <small>Manual admin payment checks</small>
          </div>
        </div>
      </div>

      <div className="static-actions-3d">
        <a
          className="btn-3d-whatsapp"
          href={whatsapp(s)}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsAppIcon size={20} />
          <span>WhatsApp ({phone})</span>
        </a>

        <a className="btn-3d-glass" href="/track">
          <Navigation size={18} />
          <span>Track Order</span>
        </a>

        {mode !== "faq" && (
          <a className="btn-3d-glass" href="/faq">
            <BookOpen size={18} />
            <span>Browse FAQs</span>
          </a>
        )}
      </div>
    </section>
  );
}

function SupportCallout({ data }: { data: Catalog }) {
  const s = data.settings;
  const rawPhone = s.whatsapp || "03034049973";
  const phone = rawPhone.replace(/^\+92/, "0").replace(/^\+/, "");
  const email =
    s.support_email && s.support_email !== "Not Available"
      ? s.support_email
      : "Available on WhatsApp";
  const hours =
    s.support_hours && !s.support_hours.toLowerCase().includes("announced")
      ? s.support_hours
      : "Mon – Sat: 9:00 AM – 9:00 PM";
  const address = s.distribution_center_address || "Qanchi, Lahore";

  return (
    <section className="section support-section">
      <div className="support-card contact-detail-card">
        <span className="support-eyebrow">STUDENT SUPPORT & CONTACT</span>
        <h1 className="support-title">{s.store_name || "Campus Bookstore"}</h1>
        <p className="support-subtitle">
          {s.header_tagline || "Have questions regarding your book order, course materials, or delivery status? Reach out directly to our campus team."}
        </p>

        <div className="support-grid">
          <div className="support-item">
            <div className="support-icon-wrap whatsapp-accent">
              <WhatsAppIcon size={24} />
            </div>
            <div>
              <span className="support-label">WHATSAPP</span>
              <strong className="support-value">{phone}</strong>
            </div>
          </div>

          <div className="support-item">
            <div className="support-icon-wrap email-accent">
              <Mail size={24} />
            </div>
            <div>
              <span className="support-label">OFFICIAL SUPPORT EMAIL</span>
              <strong className="support-value" style={{ fontSize: "0.88rem" }}>{email}</strong>
            </div>
          </div>

          <div className="support-item">
            <div className="support-icon-wrap hours-accent">
              <Clock size={24} />
            </div>
            <div>
              <span className="support-label">SUPPORT HOURS</span>
              <strong className="support-value">{hours}</strong>
            </div>
          </div>
        </div>

        <div className="contact-details-grid">
          <div className="contact-info-panel">
            <div>
              <div className="contact-panel-header">
                <Building2 size={20} />
                <h4>Distribution Center & Pickup</h4>
              </div>
              <p style={{ margin: "10px 0 0 0" }}>
                <strong>{s.store_name} Main Center</strong>
              </p>
              <div className="contact-address-box">
                <MapPin size={16} className="address-pin-icon" />
                <span>
                  Address:{" "}
                  <a
                    href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "underline", color: "inherit", fontWeight: 700 }}
                  >
                    {address}
                  </a>
                </span>
                <a
                  href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn compact"
                  style={{
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.8rem",
                    padding: "4px 10px",
                  }}
                >
                  <MapPin size={13} />
                  <span>View Map</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <p className="small-muted" style={{ margin: "4px 0 12px 0" }}>
                Official university course materials fulfillment center. Counter pickup & order dispatches available daily.
              </p>
            </div>
            <div className="contact-delivery-rates">
              <a
                href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                target="_blank"
                rel="noopener noreferrer"
                className="rate-badge"
                style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
                title="View VU Qanchi Campus Location on Google Maps"
              >
                <span>🏛️ VU Qanchi Campus Pickup</span>
                <strong>{money(s.delivery_campus ?? 10000)}</strong>
              </a>
              <div className="rate-badge">
                <span>🚀 Lahore Rider</span>
                <strong>{money(s.delivery_lahore)}</strong>
              </div>
              <div className="rate-badge">
                <span>📦 Other Cities</span>
                <strong>{money(s.delivery_other)}</strong>
              </div>
            </div>
          </div>

          <div className="contact-info-panel">
            <div>
              <div className="contact-panel-header">
                <ShieldCheck size={20} />
                <h4>Bank Transfer & Payment Details</h4>
              </div>
              <div className="contact-bank-summary">
                <div className="bank-summary-row">
                  <div className="bank-field-col">
                    <small>BANK NAME</small>
                    <strong>{s.bank_name || "Meezan Bank"}</strong>
                  </div>
                  <div className="bank-field-col">
                    <small>ACCOUNT TITLE</small>
                    <strong>{s.account_title || "DIGITAL GROWTH HUB"}</strong>
                  </div>
                </div>
                <div className="bank-summary-row full-width">
                  <div className="bank-field-col">
                    <small>ACCOUNT NUMBER</small>
                    <strong className="footer-account-num">{s.bank_account || "11550109645933"}</strong>
                  </div>
                </div>
                <div className="bank-summary-row full-width">
                  <div className="bank-field-col">
                    <small>IBAN NUMBER</small>
                    <strong className="footer-account-num">{s.bank_iban || "PK29MEZN0011550109645933"}</strong>
                  </div>
                </div>
              </div>
            </div>
            <p className="small-muted" style={{ marginTop: 10, marginBottom: 0 }}>
              🔒 Bank transfers are manually verified by store administrators after uploading your payment proof slip.
            </p>
          </div>
        </div>

        {(s.facebook_link || s.twitter_link || s.instagram_link || s.linkedin_link) && (
          <div className="support-social-section">
            <h4>Connect With Us</h4>
            <div className="social-links-grid">
              {s.facebook_link && (
                <a href={s.facebook_link} target="_blank" rel="noreferrer" className="social-link-card fb-card">
                  <FacebookIcon size={18} />
                  <span>Facebook Page</span>
                </a>
              )}
              {s.twitter_link && (
                <a href={s.twitter_link} target="_blank" rel="noreferrer" className="social-link-card twitter-card">
                  <TwitterIcon size={18} />
                  <span>Twitter / X</span>
                </a>
              )}
              {s.instagram_link && (
                <a href={s.instagram_link} target="_blank" rel="noreferrer" className="social-link-card insta-card">
                  <InstagramIcon size={18} />
                  <span>Instagram</span>
                </a>
              )}
              {s.linkedin_link && (
                <a href={s.linkedin_link} target="_blank" rel="noreferrer" className="social-link-card linkedin-card">
                  <LinkedinIcon size={18} />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="support-cta-group">
          <a
            className="support-whatsapp-btn"
            href={whatsapp(s)}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon size={22} />
            <span>WhatsApp ({phone})</span>
          </a>

          <a className="btn" href="/track">
            Track Order Status
          </a>

          <a className="btn" href="/faq">
            Browse FAQs
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ data }: { data: Catalog }) {
  const s = data.settings;
  const storeName = s.store_name || "Campus Bookstore";
  const tagline = s.header_tagline || "Your one-stop shop for educational books";

  return (
    <footer>
      <div className="footer-main">
        <div>
          <a className="footer-brand-logo" href="/">
            <span className="footer-logo-icon">
              <BookOpen size={20} />
            </span>
            <span className="footer-logo-text">{storeName.toUpperCase()}</span>
          </a>
          <p className="footer-brand-desc">{tagline}</p>
          <div className="footer-portal-links">
            <a href="/campus/login" className="footer-portal-link">
              <Building2 size={15} />
              <span>Campus Portal</span>
            </a>
            <span className="footer-portal-dot">•</span>
            <a href="/admin/login" className="footer-portal-link">
              <ShieldCheck size={15} />
              <span>Super Admin Portal</span>
            </a>
          </div>

          <div className="footer-social-bar">
            {s.facebook_link && (
              <a href={s.facebook_link} target="_blank" rel="noreferrer" title="Facebook" className="footer-social-icon">
                <FacebookIcon size={16} />
              </a>
            )}
            {s.twitter_link && (
              <a href={s.twitter_link} target="_blank" rel="noreferrer" title="Twitter" className="footer-social-icon">
                <TwitterIcon size={16} />
              </a>
            )}
            {s.instagram_link && (
              <a href={s.instagram_link} target="_blank" rel="noreferrer" title="Instagram" className="footer-social-icon">
                <InstagramIcon size={16} />
              </a>
            )}
            {s.linkedin_link && (
              <a href={s.linkedin_link} target="_blank" rel="noreferrer" title="LinkedIn" className="footer-social-icon">
                <LinkedinIcon size={16} />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="footer-column-title">QUICK LINKS</h4>
          <a href="/">Home Storefront</a>
          <a href="/books">Books Catalog</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Support</a>
          <a href="/track">Track Order</a>
        </div>

        <div>
          <h4 className="footer-column-title">STORE POLICIES</h4>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms & Conditions</a>
          <a href="/shipping">Shipping Policy</a>
          <a href="/refund">Refund & Cancellation</a>
        </div>

        <div>
          <h4 className="footer-column-title">CAMPUS SUPPORT</h4>
          <div className="footer-support-item">
            <span className="footer-support-label">WhatsApp:</span>{" "}
            <a
              href={whatsapp(s)}
              target="_blank"
              rel="noreferrer"
              className="footer-whatsapp-link"
            >
              {s.whatsapp || "03034049973"}
            </a>
          </div>
          {s.support_email && s.support_email !== "Not Available" && (
            <div className="footer-support-item">
              <span className="footer-support-label">Email:</span>{" "}
              <a href={`mailto:${s.support_email}`} className="footer-whatsapp-link">
                {s.support_email}
              </a>
            </div>
          )}
          <div className="footer-support-item">
            <span className="footer-support-label">Bank Account:</span>{" "}
            <strong className="footer-account-num">
              {s.bank_account || "11550109645933"}
            </strong>
          </div>
          <div className="footer-support-item">
            <span className="footer-support-label">IBAN:</span>{" "}
            <strong className="footer-account-num" style={{ fontSize: "0.8rem" }}>
              {s.bank_iban || "PK29MEZN0011550109645933"}
            </strong>
          </div>
          <div className="footer-support-item">
            <span className="footer-support-label">Bank Name:</span>{" "}
            <strong className="footer-bank-name">
              {s.bank_name || "Meezan Bank"}
            </strong>
          </div>
          {s.distribution_center_address && (
            <div className="footer-support-item">
              <span className="footer-support-label">Location:</span>{" "}
              <a
                href="https://maps.app.goo.gl/xgXSaNeVCBvSFtb57"
                target="_blank"
                rel="noreferrer"
                className="footer-whatsapp-link"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <span>{s.distribution_center_address}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {storeName}. All rights reserved.
        </span>
        <span>Powered by Next.js & Three.js 3D Engine</span>
      </div>
    </footer>
  );
}
