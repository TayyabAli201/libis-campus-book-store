ALTER TABLE `order_items` ADD COLUMN `return_status` TEXT NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `return_held_at` TEXT;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `return_refund_amount` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `return_notes` TEXT;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `return_resold_at` TEXT;
