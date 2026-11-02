-- Split the site title into a full `name` and a `short_name`, like a web app manifest's `name` and
-- `short_name`. The title has been used as the short name, so it moves to `short_name`; `name`
-- starts out as the same value until editors enter the full name. Safe to run again: the rename
-- only happens while `title` exists, and only an empty `short_name` is filled in.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'site_metadata'
			AND column_name = 'title'
	) THEN
		ALTER TABLE "site_metadata" RENAME COLUMN "title" TO "name";
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "site_metadata" ADD COLUMN IF NOT EXISTS "short_name" text;
--> statement-breakpoint
UPDATE "site_metadata" SET "short_name" = "name" WHERE "short_name" IS NULL;
--> statement-breakpoint
ALTER TABLE "site_metadata" ALTER COLUMN "short_name" SET NOT NULL;
