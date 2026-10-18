PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_users` (
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
	CONSTRAINT "user_role" CHECK("__new_users"."role" IN ('SUPER_ADMIN','CAMPUS_ADMIN','STUDENT','VENDOR')),
	CONSTRAINT "user_campus" CHECK("__new_users"."role" != 'CAMPUS_ADMIN' OR "__new_users"."campus_id" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_users` SELECT * FROM `users`;
--> statement-breakpoint
DROP TABLE `users`;
--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `phone` text NOT NULL,
  `email` text NOT NULL,
  `address` text,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `vendors_email_unique` ON `vendors` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `vendors_user_id_unique` ON `vendors` (`user_id`);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `vendor_id` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `vendor_assigned_at` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `vendor_notes` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `vendor_printed_at` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `vendor_dispatched_at` text;
