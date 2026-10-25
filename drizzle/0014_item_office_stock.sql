ALTER TABLE `order_items` ADD COLUMN `in_office_stock` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `office_stock_at` TEXT;
