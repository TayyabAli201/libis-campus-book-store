ALTER TABLE `order_items` ADD COLUMN `delivered_to_student` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `order_items` ADD COLUMN `delivered_to_student_at` TEXT;
