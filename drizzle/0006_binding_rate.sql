ALTER TABLE `pricing_categories` ADD COLUMN `binding_rate` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `price_history` ADD COLUMN `old_binding_rate` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `price_history` ADD COLUMN `new_binding_rate` integer DEFAULT 0 NOT NULL;
