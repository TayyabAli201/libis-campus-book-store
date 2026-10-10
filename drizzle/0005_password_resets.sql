CREATE TABLE IF NOT EXISTS `password_resets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`code` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_password_resets_token` ON `password_resets` (`token`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_password_resets_email_code` ON `password_resets` (`email`, `code`);
