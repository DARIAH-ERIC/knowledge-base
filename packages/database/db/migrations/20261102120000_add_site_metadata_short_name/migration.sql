-- Split the site title into a full `name` and a `short_name`, like a web app manifest's `name` and
-- `short_name`. The title has been used as the short name, so it moves to `short_name`; `name`
-- starts out as the same value until editors enter the full name.
ALTER TABLE "site_metadata" RENAME COLUMN "title" TO "name";
--> statement-breakpoint
ALTER TABLE "site_metadata" ADD COLUMN "short_name" text;
--> statement-breakpoint
UPDATE "site_metadata" SET "short_name" = "name";
--> statement-breakpoint
ALTER TABLE "site_metadata" ALTER COLUMN "short_name" SET NOT NULL;
