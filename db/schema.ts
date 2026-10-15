import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
const id = () => text("id").primaryKey();
const stamp = () => text("created_at").notNull();
export const campuses = sqliteTable("campuses", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  active: integer("active").notNull().default(1),
  permissions: text("permissions").notNull(),
  createdAt: stamp(),
  version: integer("version").notNull().default(1),
});
export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(),
    campusId: text("campus_id").references(() => campuses.id),
    active: integer("active").notNull().default(1),
    mustChange: integer("must_change").notNull().default(1),
    createdAt: stamp(),
  },
  (t) => [
    check(
      "user_role",
      sql`${t.role} IN ('SUPER_ADMIN','CAMPUS_ADMIN','STUDENT')`,
    ),
    check(
      "user_campus",
      sql`${t.role} != 'CAMPUS_ADMIN' OR ${t.campusId} IS NOT NULL`,
    ),
  ],
);
export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: stamp(),
  },
  (t) => [
    index("idx_sessions_user").on(t.userId),
    index("idx_sessions_expiry").on(t.expiresAt),
  ],
);
export const pricing = sqliteTable(
  "pricing_categories",
  {
    id: id(),
    rate: integer("rate").notNull(),
    bindingRate: integer("binding_rate").notNull().default(0),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    check("four_categories", sql`${t.id} IN ('A','B','C','D')`),
    check("positive_rate", sql`${t.rate} > 0 AND ${t.rate} <= 100000`),
    check(
      "nonnegative_binding_rate",
      sql`${t.bindingRate} >= 0 AND ${t.bindingRate} <= 1000000`,
    ),
  ],
);
export const books = sqliteTable(
  "books",
  {
    id: id(),
    code: text("code").notNull(),
    courseCode: text("course_code").notNull(),
    courseName: text("course_name").notNull(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    description: text("description").notNull(),
    cover: text("cover"),
    pages: integer("pages"),
    category: text("category")
      .notNull()
      .references(() => pricing.id),
    fixedPrice: integer("fixed_price"),
    campusId: text("campus_id").references(() => campuses.id),
    active: integer("active").notNull().default(1),
    createdAt: stamp(),
    version: integer("version").notNull().default(1),
    deletedAt: text("deleted_at"),
  },
  (t) => [
    uniqueIndex("books_code_unique")
      .on(t.code)
      .where(sql`${t.deletedAt} IS NULL`),
    index("idx_books_course").on(t.courseCode),
    index("idx_books_campus").on(t.campusId),
    check("book_pages", sql`${t.pages} BETWEEN 1 AND 10000`),
    check("active_book_pages", sql`${t.active} = 0 OR ${t.pages} IS NOT NULL`),
    check(
      "book_fixed_price",
      sql`${t.fixedPrice} IS NULL OR ${t.fixedPrice} >= 0`,
    ),
  ],
);
export const inventory = sqliteTable(
  "inventory",
  {
    bookId: text("book_id")
      .primaryKey()
      .references(() => books.id),
    stock: integer("stock").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    threshold: integer("threshold").notNull().default(5),
  },
  (t) => [
    check(
      "inventory_nonnegative",
      sql`${t.stock} >= 0 AND ${t.reserved} >= 0 AND ${t.stock} >= ${t.reserved} AND ${t.threshold} >= 0`,
    ),
  ],
);
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  value: text("value").notNull(),
  version: integer("version").notNull().default(1),
});
export const quotes = sqliteTable(
  "quotes",
  {
    id: id(),
    owner: text("owner").notNull(),
    data: text("data").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: stamp(),
  },
  (t) => [index("idx_quotes_expiry").on(t.expiresAt)],
);
export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    owner: text("owner").notNull(),
    trackingHash: text("tracking_hash").notNull().unique(),
    quoteId: text("quote_id")
      .notNull()
      .unique()
      .references(() => quotes.id),
    campusId: text("campus_id").references(() => campuses.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    address: text("address").notNull(),
    instructions: text("instructions").notNull(),
    deliveryType: text("delivery_type").notNull(),
    subtotal: integer("subtotal").notNull(),
    delivery: integer("delivery").notNull(),
    total: integer("total").notNull(),
    currency: text("currency").notNull(),
    storeSnapshot: text("store_snapshot").notNull(),
    status: text("status").notNull(),
    courierName: text("courier_name"),
    courierTrackingId: text("courier_tracking_id"),
    // RELEASED means no stock commitment; legacy rows retain their recorded state.
    inventoryState: text("inventory_state").notNull().default("RESERVED"),
    createdAt: stamp(),
    updatedAt: text("updated_at").notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_orders_campus_date").on(t.campusId, t.createdAt),
    index("idx_orders_status_date").on(t.status, t.createdAt),
    index("idx_orders_owner").on(t.owner),
    check(
      "order_total",
      sql`${t.subtotal} >= 0 AND ${t.delivery} >= 0 AND ${t.total} = ${t.subtotal} + ${t.delivery}`,
    ),
    check(
      "order_status",
      sql`${t.status} IN ('PAYMENT_PENDING','CONFIRMED','PROCESSING','READY','SHIPPED','DELIVERED','CANCELLED','REJECTED','REFUND_REQUESTED')`,
    ),
    check(
      "inventory_state",
      sql`${t.inventoryState} IN ('RESERVED','DEDUCTED','RELEASED')`,
    ),
  ],
);
export const items = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    code: text("code").notNull(),
    title: text("title").notNull(),
    pages: integer("pages").notNull(),
    category: text("category").notNull(),
    rate: integer("rate").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    index("idx_items_order").on(t.orderId),
    check("item_quantity", sql`${t.quantity} >= 1`),
  ],
);
export const slips = sqliteTable(
  "payment_slips",
  {
    id: id(),
    owner: text("owner").notNull(),
    orderId: text("order_id").references(() => orders.id),
    objectKey: text("object_key").notNull().unique(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    digest: text("digest").notNull(),
    ocrStatus: text("ocr_status").notNull(),
    detectedAmount: integer("detected_amount"),
    ocrMessage: text("ocr_message").notNull(),
    createdAt: stamp(),
  },
  (t) => [
    index("idx_slips_order").on(t.orderId),
    index("idx_slips_owner").on(t.owner),
    index("idx_slips_digest").on(t.digest),
  ],
);
export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .unique()
      .references(() => orders.id),
    slipId: text("slip_id")
      .notNull()
      .references(() => slips.id),
    status: text("status").notNull(),
    reviewer: text("reviewer").references(() => users.id),
    note: text("note").notNull().default(""),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    check(
      "payment_status",
      sql`${t.status} IN ('PENDING','VERIFIED','REJECTED','NEW_SLIP_REQUESTED','MANUAL_REVIEW')`,
    ),
  ],
);
export const history = sqliteTable(
  "order_history",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    status: text("status").notNull(),
    note: text("note").notNull(),
    actor: text("actor").notNull(),
    internal: integer("internal").notNull().default(0),
    createdAt: stamp(),
  },
  (t) => [index("idx_history_order").on(t.orderId, t.createdAt)],
);
export const movements = sqliteTable(
  "inventory_transactions",
  {
    id: id(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    orderId: text("order_id").references(() => orders.id),
    kind: text("kind").notNull(),
    quantity: integer("quantity").notNull(),
    actor: text("actor").notNull(),
    note: text("note").notNull(),
    createdAt: stamp(),
  },
  (t) => [index("idx_movement_book").on(t.bookId, t.createdAt)],
);
export const priceHistory = sqliteTable("price_history", {
  id: id(),
  category: text("category")
    .notNull()
    .references(() => pricing.id),
  oldRate: integer("old_rate").notNull(),
  newRate: integer("new_rate").notNull(),
  oldBindingRate: integer("old_binding_rate").notNull().default(0),
  newBindingRate: integer("new_binding_rate").notNull().default(0),
  actor: text("actor").notNull(),
  createdAt: stamp(),
});
export const audit = sqliteTable(
  "audit_logs",
  {
    id: id(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    before: text("before"),
    after: text("after"),
    device: text("device").notNull(),
    createdAt: stamp(),
  },
  (t) => [index("idx_audit_date").on(t.createdAt)],
);
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    id: id(),
    count: integer("count").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("idx_rate_expiry").on(t.expiresAt)],
);
// A failing guard aborts the entire D1 batch, including prior stock writes.
export const guards = sqliteTable(
  "transaction_guards",
  { id: id(), ok: integer("ok").notNull() },
  (t) => [check("transaction_guard_ok", sql`${t.ok} = 1`)],
);
