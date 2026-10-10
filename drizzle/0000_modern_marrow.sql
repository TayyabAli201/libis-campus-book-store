CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`before` text,
	`after` text,
	`device` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_date` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`course_code` text NOT NULL,
	`course_name` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`description` text NOT NULL,
	`cover` text,
	`pages` integer NOT NULL,
	`category` text NOT NULL,
	`fixed_price` integer,
	`campus_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`category`) REFERENCES `pricing_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "book_pages" CHECK("books"."pages" BETWEEN 1 AND 10000),
	CONSTRAINT "book_fixed_price" CHECK("books"."fixed_price" IS NULL OR "books"."fixed_price" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_code_unique` ON `books` (`code`);--> statement-breakpoint
CREATE INDEX `idx_books_course` ON `books` (`course_code`);--> statement-breakpoint
CREATE INDEX `idx_books_campus` ON `books` (`campus_id`);--> statement-breakpoint
CREATE TABLE `campuses` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`permissions` text NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campuses_code_unique` ON `campuses` (`code`);--> statement-breakpoint
CREATE TABLE `transaction_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "transaction_guard_ok" CHECK("transaction_guards"."ok" = 1)
);
--> statement-breakpoint
CREATE TABLE `order_history` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`actor` text NOT NULL,
	`internal` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_history_order` ON `order_history` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`book_id` text PRIMARY KEY NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`reserved` integer DEFAULT 0 NOT NULL,
	`threshold` integer DEFAULT 5 NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "inventory_nonnegative" CHECK("inventory"."stock" >= 0 AND "inventory"."reserved" >= 0 AND "inventory"."stock" >= "inventory"."reserved" AND "inventory"."threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`book_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`pages` integer NOT NULL,
	`category` text NOT NULL,
	`rate` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_quantity" CHECK("order_items"."quantity" BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE INDEX `idx_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`order_id` text,
	`kind` text NOT NULL,
	`quantity` integer NOT NULL,
	`actor` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_movement_book` ON `inventory_transactions` (`book_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`owner` text NOT NULL,
	`tracking_hash` text NOT NULL,
	`quote_id` text NOT NULL,
	`campus_id` text,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`instructions` text NOT NULL,
	`delivery_type` text NOT NULL,
	`subtotal` integer NOT NULL,
	`delivery` integer NOT NULL,
	`total` integer NOT NULL,
	`currency` text NOT NULL,
	`store_snapshot` text NOT NULL,
	`status` text NOT NULL,
	`inventory_state` text DEFAULT 'RESERVED' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "order_total" CHECK("orders"."subtotal" >= 0 AND "orders"."delivery" >= 0 AND "orders"."total" = "orders"."subtotal" + "orders"."delivery"),
	CONSTRAINT "order_status" CHECK("orders"."status" IN ('PAYMENT_PENDING','CONFIRMED','PROCESSING','READY','SHIPPED','DELIVERED','CANCELLED','REJECTED','REFUND_REQUESTED')),
	CONSTRAINT "inventory_state" CHECK("orders"."inventory_state" IN ('RESERVED','DEDUCTED','RELEASED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_reference_unique` ON `orders` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_tracking_hash_unique` ON `orders` (`tracking_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_quote_id_unique` ON `orders` (`quote_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_campus_date` ON `orders` (`campus_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_status_date` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_orders_owner` ON `orders` (`owner`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`slip_id` text NOT NULL,
	`status` text NOT NULL,
	`reviewer` text,
	`note` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slip_id`) REFERENCES `payment_slips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payment_status" CHECK("payments"."status" IN ('PENDING','VERIFIED','REJECTED','NEW_SLIP_REQUESTED','MANUAL_REVIEW'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_order_id_unique` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`old_rate` integer NOT NULL,
	`new_rate` integer NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category`) REFERENCES `pricing_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pricing_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`rate` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "four_categories" CHECK("pricing_categories"."id" IN ('A','B','C','D')),
	CONSTRAINT "positive_rate" CHECK("pricing_categories"."rate" > 0 AND "pricing_categories"."rate" <= 100000)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quotes_expiry` ON `quotes` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_slips` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`order_id` text,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`digest` text NOT NULL,
	`ocr_status` text NOT NULL,
	`detected_amount` integer,
	`ocr_message` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_slips_object_key_unique` ON `payment_slips` (`object_key`);--> statement-breakpoint
CREATE INDEX `idx_slips_order` ON `payment_slips` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_slips_owner` ON `payment_slips` (`owner`);--> statement-breakpoint
CREATE INDEX `idx_slips_digest` ON `payment_slips` (`digest`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`campus_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "user_role" CHECK("users"."role" IN ('SUPER_ADMIN','CAMPUS_ADMIN','STUDENT')),
	CONSTRAINT "user_campus" CHECK("users"."role" != 'CAMPUS_ADMIN' OR "users"."campus_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);