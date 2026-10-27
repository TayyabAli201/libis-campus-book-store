import { z } from "zod";
export const STUDENT_CATEGORY = "D";
export const categoryLabel = (category: string) =>
  category === STUDENT_CATEGORY ? "Student category" : `Category ${category}`;
export const money = (amount: number | null, currency = "PKR") =>
  amount === null
    ? "—"
    : (currency === "PKR" ? "Rs. " : currency + " ") +
      (amount / 100)
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        .replace(/\.00$/, "");
export const statuses: Record<string, string> = {
  PAYMENT_PENDING: "Payment Verification Pending",
  CONFIRMED: "Order Confirmed",
  PROCESSING: "Processing",
  READY: "Ready for Dispatch",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  REFUND_REQUESTED: "Refund Requested",
  PENDING: "Pending Admin Verification",
  VERIFIED: "Payment Verified",
  NEW_SLIP_REQUESTED: "New Slip Requested",
  MANUAL_REVIEW: "Manual Review",
  AMOUNT_MATCHED: "Amount Matched",
  AMOUNT_MISMATCH: "Amount Mismatch",
  OCR_FAILED: "OCR Failed",
  PROOF_UPLOADED: "Payment Proof Uploaded",
};

export function getCampusName(o: any): string {
  const directCampus = (o?.campus_name || o?.campus || "").trim();
  if (directCampus) {
    if (/qanchi/i.test(directCampus)) return "VU Qanchi";
    const cleaned = directCampus.replace(/\s*campus\s*/gi, "").trim();
    if (cleaned) return cleaned;
  }
  const city = (o?.city || "").trim();
  if (city && /qanchi/i.test(city)) {
    return "VU Qanchi";
  }
  if (city && /campus/i.test(city)) {
    const cleaned = city.replace(/\s*campus\s*/gi, "").trim();
    if (cleaned) return cleaned;
  }
  if (o?.address && /qanchi/i.test(o.address)) {
    return "VU Qanchi";
  }
  return "VU Qanchi";
}

export function isCampusOrder(o: any): boolean {
  if (!o) return false;
  return (
    o.delivery_type === "campus" ||
    Boolean(o.city && String(o.city).toLowerCase().includes("campus")) ||
    Boolean(o.address && String(o.address).toLowerCase().includes("campus"))
  );
}

export function isLahoreOrder(o: any): boolean {
  if (!o || isCampusOrder(o)) return false;
  return (
    o.delivery_type === "lahore" ||
    o.delivery_type === "lahore_home" ||
    Boolean(o.city && String(o.city).toLowerCase().includes("lahore"))
  );
}

export function extractOrderCoordinates(o: any): { lat: string; lng: string } | null {
  if (!o) return null;
  const text = `${o.address || ""} ${o.instructions || ""} ${o.delivery_type || ""}`;

  // 1. Direct coordinates match: e.g. 31.5204, 74.3587 or 31.5204,74.3587
  const coordMatch = text.match(/([-+]?\d{1,2}\.\d{3,})[,\s]+([-+]?\d{1,3}\.\d{3,})/);
  if (coordMatch) {
    return { lat: coordMatch[1], lng: coordMatch[2] };
  }

  // 2. Query param (q=lat,lng or query=lat,lng)
  const qMatch = text.match(/(?:q|query)=([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)/i);
  if (qMatch) {
    return { lat: qMatch[1], lng: qMatch[2] };
  }

  // 3. Full google maps url with coordinates
  const urlMatch = text.match(/(https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps)\S+)/i);
  if (urlMatch) {
    const rawUrl = urlMatch[1];
    const extractCoords = rawUrl.match(/([-+]?\d{1,2}\.\d{3,})[,\s]+([-+]?\d{1,3}\.\d{3,})/);
    if (extractCoords) {
      return { lat: extractCoords[1], lng: extractCoords[2] };
    }
  }

  return null;
}

export function getYangoRouteUrl(o: any): string {
  const coords = extractOrderCoordinates(o);
  if (coords) {
    return `https://yango.go.link/route?end-lat=${coords.lat}&end-lon=${coords.lng}&lang=en&ref=campusbookstore`;
  }
  return `https://yango.go.link/route?lang=en&ref=campusbookstore`;
}

export function isOtherCityOrder(o: any): boolean {
  if (!o) return false;
  return !isCampusOrder(o) && !isLahoreOrder(o);
}

export function getOrderWhatsAppMessage(o: any): string {
  const studentName = (o?.name || "Student").trim();
  const status = (o?.status || "").toUpperCase();

  const isCampus = isCampusOrder(o);
  const isLahore = isLahoreOrder(o);

  // 1. Confirmed (For all types)
  if (status === "CONFIRMED") {
    if (Number(o?.due_amount || 0) > 0) {
      const advanceStr =
        Number(o?.amount_paid || 0) > 0
          ? ` Advance Paid: ${money(o.amount_paid)}.`
          : "";
      return `Salam ${studentName}, your payment has been verified. Your order is now confirmed and will be processed soon.${advanceStr} Remaining Due: ${money(o.due_amount)} (payable upon delivery / collection).`;
    }
    return `Salam ${studentName}, your payment has been verified. Your order is now confirmed and will be processed soon.`;
  }

  // 2. Processing (For all types)
  if (status === "PROCESSING") {
    const amountStr = money(o?.total ?? null);
    return `Salam ${studentName}, your order worth ${amountStr} is currently in processing. It will be shipped very soon.`;
  }

  // 3. Shipped (Different for each type - Very Important)
  if (status === "SHIPPED") {
    if (isCampus) {
      const campusName = getCampusName(o);
      return `Salam ${studentName}, your books have arrived at ${campusName} campus. You can receive them now.`;
    }
    if (isLahore) {
      return `Salam ${studentName}, your books have reached us and will be delivered to you within 1 day.`;
    }
    // Other Cities Order
    return `Salam ${studentName}, your order has been shipped via courier.`;
  }

  // 4. Delivered (For all types)
  if (status === "DELIVERED") {
    return `Salam ${studentName}, your order has been delivered. Please confirm.`;
  }

  // Fallback for other statuses
  if (status === "PAYMENT_PENDING") {
    return `Salam ${studentName}, we have received your order (${o?.reference || "Book Store"}). We are currently verifying your payment.`;
  }
  if (status === "READY") {
    return `Salam ${studentName}, your order (${o?.reference || "Book Store"}) is ready for dispatch and will be shipped soon.`;
  }

  return `Salam ${studentName}, regarding your order (${o?.reference || "Book Store"}).`;
}

export function formatWhatsAppPhone(phone: string): string {
  // Preserve exact digits as entered by user without altering, adding or removing digits
  return (phone || "").replace(/[^0-9]/g, "");
}

export function getWhatsAppUrl(o: any): string {
  const phone = formatWhatsAppPhone(o?.phone || "");
  const message = getOrderWhatsAppMessage(o);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getVendorWhatsAppMessage(o: any, v?: any): string {
  const vendorName = (v?.name || "Vendor").trim();
  const ref = o?.reference || "Order";
  const isOther = isOtherCityOrder(o);
  const destination = isOther
    ? `Other City (Courier to Student):\nRecipient: ${o?.name || "Student"}\nPhone: ${o?.phone || ""}\nAddress: ${o?.address || ""}, ${o?.city || ""}`
    : `Lahore / Campus (Deliver batch to Bookstore Office)`;

  let itemsStr = "";
  if (Array.isArray(o?.items) && o.items.length > 0) {
    itemsStr =
      "Books to Print:\n" +
      o.items
        .map(
          (it: any, idx: number) =>
            `${idx + 1}. ${it.code || it.course_code || ""} - ${it.title} (Qty: ${it.quantity}${it.pages ? `, ${it.pages} pgs` : ""})`,
        )
        .join("\n") +
      "\n\n";
  }

  const notesStr = o?.vendor_notes ? `Admin Instructions: ${o.vendor_notes}\n\n` : "";

  return `Salam ${vendorName}, new printing order assigned:\n\nOrder Ref: ${ref}\nTotal Books: ${o?.total_books || o?.items?.length || 1}\n\n${itemsStr}${notesStr}${destination}\n\nPlease check your vendor portal to print and update status.\nThank you!`;
}

export function getVendorWhatsAppUrl(o: any, v: any): string {
  const phone = formatWhatsAppPhone(v?.phone || "");
  const message = getVendorWhatsAppMessage(o, v);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
export const permissions = [
  "orders.read",
  "orders.update",
  "students.read",
  "books.read",
  "reports.read",
] as const;
export const transitions: Record<string, string[]> = {
  PAYMENT_PENDING: ["CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "REFUND_REQUESTED"],
  PROCESSING: ["CONFIRMED", "SHIPPED", "CANCELLED", "REFUND_REQUESTED"],
  READY: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUND_REQUESTED"],
  SHIPPED: ["DELIVERED", "PROCESSING", "REFUND_REQUESTED"],
  DELIVERED: ["REFUND_REQUESTED"],
  CANCELLED: [],
  REJECTED: [],
  REFUND_REQUESTED: [],
};
const str = (max = 200) => z.string().trim().min(1).max(max);
export const password = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number");
export const bookInput = z
  .object({
    code: str(40).regex(/^[A-Z0-9-]+$/),
    course_code: str(40),
    course_name: z.string().trim().max(150),
    title: str(200),
    author: z.string().trim().max(150),
    description: z.string().max(4000),
    pages: z.number().int().min(1).max(10000).nullable(),
    category: z.enum(["A", "B", "C", "D"]),
    fixed_price: z.number().int().min(0).max(100000000).nullable(),
    campus_id: z.string().nullable(),
    cover: z
      .string()
      .regex(/^\/api\/covers\/[a-z0-9-]+$/)
      .nullable(),
    active: z.boolean(),
    version: z.number().int().optional(),
  })
  .superRefine((book, ctx) => {
    if (book.active && book.pages === null)
      ctx.addIssue({
        code: "custom",
        path: ["pages"],
        message:
          "Add the page count before making this book available for sale.",
      });
  });
export const clearBooksInput = z.object({
  confirmation: z.literal("CLEAR"),
  count: z.number().int().positive(),
});
export const checkoutInput = z
  .object({
    name: str(100),
    phone: str(20).regex(
      /^\+?[0-9 ()-]{9,20}$/,
      "Enter a valid WhatsApp number",
    ),
    city: str(80),
    address: str(500),
    instructions: z.string().max(500).default(""),
    delivery_type: z.enum(["campus", "lahore", "other"]),
    campus_id: z.string().nullable(),
    items: z
      .array(
        z.object({
          id: z.string().uuid(),
          quantity: z.number().int().safe().min(1),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((v, c) => {
    if (v.delivery_type === "lahore" && v.city.toLowerCase() !== "lahore")
      c.addIssue({
        code: "custom",
        path: ["city"],
        message: "Choose Other City for addresses outside Lahore",
      });
    if (new Set(v.items.map((i) => i.id)).size !== v.items.length)
      c.addIssue({
        code: "custom",
        path: ["items"],
        message: "Duplicate book entries are not allowed",
      });
  });
export const settingsInput = z.object({
  store_name: str(100),
  logo_url: z.string().max(2000).optional().nullable(),
  header_tagline: z.string().max(250).optional().default("Your one-stop shop for educational books"),
  whatsapp: str(20).regex(/^[+0-9 ]+$/),
  support_email: z.string().max(150),
  support_hours: z.string().max(150),
  distribution_center_address: z.string().max(300).optional().default("Qanchi"),
  facebook_link: z.string().max(300).optional().default("https://facebook.com/campusbookstore"),
  twitter_link: z.string().max(300).optional().default("https://twitter.com/campusbookstore"),
  instagram_link: z.string().max(300).optional().default("https://instagram.com/campusbookstore"),
  linkedin_link: z.string().max(300).optional().default("https://linkedin.com/company/campusbookstore"),
  store_open: z.boolean(),
  maintenance_message: z.string().max(500).optional().default("We are currently conducting scheduled system maintenance. Ordering is temporarily closed. Please check back soon!"),
  bank_name: str(100),
  bank_account: str(60),
  bank_iban: z.string().max(60).optional().default("PK29MEZN0011550109645933"),
  account_title: str(150),
  delivery_campus: z.number().int().min(0).max(10000000).optional().default(10000),
  delivery_campus_enabled: z.boolean().optional().default(true),
  delivery_lahore: z.number().int().min(0).max(10000000),
  delivery_lahore_enabled: z.boolean().optional().default(true),
  delivery_other: z.number().int().min(0).max(10000000),
  delivery_other_enabled: z.boolean().optional().default(true),
  currency: z.enum(["PKR"]),
  order_prefix: str(8).regex(/^[A-Z]+$/),
  max_upload_mb: z.number().int().min(1).max(10),
});
export type StoreSettings = z.infer<typeof settingsInput>;
export type Book = {
  id: string;
  code: string;
  course_code: string;
  course_name: string;
  title: string;
  author: string;
  description: string;
  cover: string | null;
  pages: number | null;
  category: string;
  fixed_price: number | null;
  campus_id: string | null;
  campus_name: string | null;
  active: number;
  rate: number;
  binding_rate?: number;
  price: number | null;
  version: number;
};
export type User = {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "CAMPUS_ADMIN" | "STUDENT" | "VENDOR";
  campus_id: string | null;
  campus_category?: string | null;
  must_change: number;
  permissions: string[];
  vendor_id?: string | null;
  vendor_name?: string | null;
  vendor_phone?: string | null;
};
export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  address?: string | null;
  active: boolean;
  created_at: string;
  per_page_rate?: number;
  binding_rate?: number;
  assigned_orders_count?: number;
  printing_orders_count?: number;
  queue_orders_count?: number;
  queue_books?: number;
  queue_pages?: number;
  queue_estimated_cost?: number;
  total_printing_cost?: number;
  total_courier_charges?: number;
  total_earnings?: number;
  total_paid?: number;
  pending_balance?: number;
}

export interface VendorPayment {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

export interface VendorLedgerSummary {
  total_orders: number;
  total_pages: number;
  total_books: number;
  printing_orders?: number;
  printed_orders?: number;
  queue_orders?: number;
  queue_pages?: number;
  queue_books?: number;
  queue_estimated_cost?: number;
  per_page_rate: number;
  binding_rate: number;
  total_printing_cost?: number;
  total_courier_charges?: number;
  courier_orders_count?: number;
  total_earned: number;
  total_paid: number;
  pending_balance: number;
}

export interface VendorLedgerOrder {
  id: string;
  reference: string;
  name: string;
  phone?: string | null;
  city: string;
  delivery_type: string;
  status: string;
  courier_name?: string | null;
  courier_tracking_id?: string | null;
  actual_courier_charges: number;
  total_books: number;
  total_pages: number;
  printing_cost: number;
  total_credit: number;
  is_payable?: boolean;
  estimated_credit?: number;
  created_at: string;
}

export interface VendorLedger {
  vendor: Vendor;
  summary: VendorLedgerSummary;
  total_earnings?: number;
  total_paid?: number;
  pending_balance?: number;
  total_orders?: number;
  payments: VendorPayment[];
  orders?: VendorLedgerOrder[];
}
export type Quote = {
  id: string;
  items: (Book & { quantity: number })[];
  subtotal: number;
  delivery: number;
  total: number;
  customer: z.infer<typeof checkoutInput>;
  settings: StoreSettings;
  expires_at: number;
};

export function formatReceiptBookTitle(
  code?: string | null,
  title?: string | null,
): string {
  const c = (code || "").trim();
  const t = (title || "").trim();
  if (!c || c === "—") return t || "Book";
  if (!t || t === "—") return c;
  const escaped = c.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`^${escaped}\\s*[-:·|]?\\s*`, "i");
  if (regex.test(t)) {
    const rest = t.replace(regex, "").trim();
    return rest ? `${c} - ${rest}` : c;
  }
  return `${c} - ${t}`;
}

export function getStudentRefundWhatsAppMessage(
  o: any,
  refundAmount?: number,
  method = "JazzCash",
  reference = "",
  note = "",
): string {
  const studentName = (o?.name || "Student").trim();
  const ref = o?.reference || o?.id || "Order";
  const amount = refundAmount !== undefined ? refundAmount : Number(o?.refund_amount || o?.refund_due || 0);
  const formattedAmount = money(amount);
  const methodStr = method ? ` via ${method}` : "";
  const refStr = reference ? ` (Ref: ${reference})` : "";
  const noteStr = note ? `\nNote: ${note}` : "";

  return `Assalam-o-Alaikum ${studentName}!

Regarding your Order #${ref} at Campus Bookstore:
An advance refund of ${formattedAmount} has been processed for you${methodStr}${refStr}.${noteStr}

Your remaining order items are being fulfilled as scheduled.
Thank you for your patience!
- Campus Bookstore Operations`;
}

export function getStudentRefundWhatsAppUrl(
  o: any,
  refundAmount?: number,
  method = "JazzCash",
  reference = "",
  note = "",
): string {
  const phone = formatWhatsAppPhone(o?.phone || "");
  const message = getStudentRefundWhatsAppMessage(o, refundAmount, method, reference, note);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function getVendorPendingBooksWhatsAppMessage(
  vendorName: string,
  pendingList: Array<{
    code: string;
    title?: string;
    totalQty: number;
    shortageQty?: number;
    printingQty?: number;
    orders?: string[];
  }>,
): string {
  const name = (vendorName || "Vendor").trim();
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (!pendingList || pendingList.length === 0) {
    return `Assalam-o-Alaikum ${name}!

*Pending Books Checklist — Campus Bookstore (${dateStr}):*

✅ All pending books for Campus have been received at Bookstore Office. Koi pending book baqi nahi hai.

Shukriya — Campus Bookstore Office`;
  }

  const totalCopies = pendingList.reduce((sum, it) => sum + (Number(it.totalQty) || 0), 0);

  const shortageItems = pendingList.filter((it) => (Number(it.shortageQty) || 0) > 0);
  const printingItems = pendingList.filter((it) => (Number(it.printingQty) || 0) > 0);

  let body = "";

  if (shortageItems.length > 0 && printingItems.length > 0) {
    const shortageLines = shortageItems.map((p, idx) => {
      const q = p.shortageQty || p.totalQty;
      return `${idx + 1}.      *${p.code}*     ${p.title || "—"}       *${q}*`;
    }).join("\n");

    const printingLines = printingItems.map((p, idx) => {
      const q = p.printingQty || p.totalQty;
      return `${idx + 1}.      *${p.code}*     ${p.title || "—"}       *${q}*`;
    }).join("\n");

    body = `🔴 *Office Shortage (Missing / Not Received):*\n${shortageLines}\n\n🟡 *In Printing (Not Sent to Campus Yet):*\n${printingLines}`;
  } else if (shortageItems.length > 0) {
    const shortageLines = shortageItems.map((p, idx) => {
      const q = p.shortageQty || p.totalQty;
      return `${idx + 1}.      *${p.code}*     ${p.title || "—"}       *${q}*`;
    }).join("\n");

    body = `🔴 *Office Shortage (Missing / Not Received):*\n${shortageLines}`;
  } else {
    const lines = pendingList.map((p, idx) => {
      return `${idx + 1}.      *${p.code}*     ${p.title || "—"}       *${p.totalQty}*`;
    }).join("\n");

    body = `🟡 *In Printing (Not Sent to Campus Yet):*\n${lines}`;
  }

  return `Assalam-o-Alaikum ${name}!

*Pending Books Checklist — Campus Bookstore (${dateStr}):*

${body}

*Total Pending to Deliver:* ${totalCopies} books
Baraye meharbani yeh books jald print kar ke Campus deliver karwayen.
Shukriya — Campus Bookstore Operations`;
}

export function getVendorPendingBooksWhatsAppUrl(
  vendorPhone: string,
  vendorName: string,
  pendingList: any[],
): string {
  const phone = formatWhatsAppPhone(vendorPhone || "");
  const message = getVendorPendingBooksWhatsAppMessage(vendorName, pendingList);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
