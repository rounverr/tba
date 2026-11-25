ALTER TABLE `session` ADD `authorization_snapshot` text;--> statement-breakpoint
ALTER TABLE `session` ADD `authorization_version` integer;--> statement-breakpoint
ALTER TABLE `settings` ADD `authorization_version` integer DEFAULT 1 NOT NULL;