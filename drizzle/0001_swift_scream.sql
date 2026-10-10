CREATE TABLE `__new_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`book_id` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`pages` integer NOT NULL,
	`category` text NOT NULL,
	`rate` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "item_quantity" CHECK("__new_order_items"."quantity" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_order_items`("id", "order_id", "book_id", "code", "title", "pages", "category", "rate", "unit_price", "quantity") SELECT "id", "order_id", "book_id", "code", "title", "pages", "category", "rate", "unit_price", "quantity" FROM `order_items`;--> statement-breakpoint
DROP TABLE `order_items`;--> statement-breakpoint
ALTER TABLE `__new_order_items` RENAME TO `order_items`;--> statement-breakpoint
CREATE INDEX `idx_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
