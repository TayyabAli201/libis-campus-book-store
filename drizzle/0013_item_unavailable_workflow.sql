ALTER TABLE `order_items` ADD COLUMN `is_unavailable` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `unavailable_reason` TEXT;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `unavailable_at` TEXT;
