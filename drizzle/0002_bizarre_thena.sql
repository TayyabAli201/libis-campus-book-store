PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_books` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`course_code` text NOT NULL,
	`course_name` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`description` text NOT NULL,
	`cover` text,
	`pages` integer,
	`category` text NOT NULL,
	`fixed_price` integer,
	`campus_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`category`) REFERENCES `pricing_categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "book_pages" CHECK("__new_books"."pages" BETWEEN 1 AND 10000),
	CONSTRAINT "active_book_pages" CHECK("__new_books"."active" = 0 OR "__new_books"."pages" IS NOT NULL),
	CONSTRAINT "book_fixed_price" CHECK("__new_books"."fixed_price" IS NULL OR "__new_books"."fixed_price" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_books`("id", "code", "course_code", "course_name", "title", "author", "description", "cover", "pages", "category", "fixed_price", "campus_id", "active", "created_at", "version") SELECT "id", "code", "course_code", "course_name", "title", "author", "description", "cover", "pages", "category", "fixed_price", "campus_id", "active", "created_at", "version" FROM `books`;--> statement-breakpoint
DROP TABLE `books`;--> statement-breakpoint
ALTER TABLE `__new_books` RENAME TO `books`;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;--> statement-breakpoint
CREATE UNIQUE INDEX `books_code_unique` ON `books` (`code`);--> statement-breakpoint
CREATE INDEX `idx_books_course` ON `books` (`course_code`);--> statement-breakpoint
CREATE INDEX `idx_books_campus` ON `books` (`campus_id`);