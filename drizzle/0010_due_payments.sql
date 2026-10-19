ALTER TABLE `orders` ADD COLUMN `amount_paid` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `due_amount` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `due_status` TEXT NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `due_note` TEXT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `order_payment_logs` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `amount` integer NOT NULL,
  `type` text NOT NULL DEFAULT 'PARTIAL_PAYMENT',
  `note` text,
  `actor` text NOT NULL,
  `payment_date` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_order_payment_logs_order` ON `order_payment_logs` (`order_id`);
