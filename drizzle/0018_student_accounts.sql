ALTER TABLE `users` ADD COLUMN `google_id` TEXT;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `avatar_url` TEXT;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `student_carts` (
	`user_id` TEXT PRIMARY KEY NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
	`items_json` TEXT NOT NULL,
	`updated_at` INTEGER NOT NULL
);
