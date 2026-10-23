ALTER TABLE `order_items` ADD COLUMN `received_from_vendor` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `refund_due` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `refund_amount` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `refund_status` TEXT NOT NULL DEFAULT 'NONE';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `refund_note` TEXT;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `refund_paid_at` TEXT;
