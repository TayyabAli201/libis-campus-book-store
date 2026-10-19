ALTER TABLE `vendors` ADD COLUMN `per_page_rate` REAL NOT NULL DEFAULT 1.60;
--> statement-breakpoint
ALTER TABLE `vendors` ADD COLUMN `binding_rate` REAL NOT NULL DEFAULT 30.00;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vendor_payments` (
  `id` text PRIMARY KEY NOT NULL,
  `vendor_id` text NOT NULL,
  `amount` integer NOT NULL,
  `payment_date` text NOT NULL,
  `payment_method` text NOT NULL DEFAULT 'Bank Transfer',
  `reference` text,
  `notes` text,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_vendor_payments_vendor` ON `vendor_payments` (`vendor_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_vendor_payments_date` ON `vendor_payments` (`payment_date`);
