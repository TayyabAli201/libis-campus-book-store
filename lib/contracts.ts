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
  PROCESSING: ["READY", "CANCELLED", "REFUND_REQUESTED"],
  READY: ["SHIPPED", "CANCELLED", "REFUND_REQUESTED"],
  SHIPPED: ["DELIVERED", "REFUND_REQUESTED"],
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
  delivery_lahore: z.number().int().min(0).max(10000000),
  delivery_other: z.number().int().min(0).max(10000000),
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
  role: "SUPER_ADMIN" | "CAMPUS_ADMIN" | "STUDENT";
  campus_id: string | null;
  campus_category?: string | null;
  must_change: number;
  permissions: string[];
};
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
