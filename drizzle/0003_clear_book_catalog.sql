DROP INDEX `books_code_unique`;--> statement-breakpoint
ALTER TABLE `books` ADD `deleted_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `books_code_unique` ON `books` (`code`) WHERE "books"."deleted_at" IS NULL;