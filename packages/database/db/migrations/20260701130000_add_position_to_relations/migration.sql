-- Add an ordering column to the user-orderable relation join tables (related entities,
-- related resources, and social media on projects / organisational units). Existing rows
-- default to 0; order becomes well-defined the next time a record is saved. No backfill.

ALTER TABLE "entities_to_entities"
	ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE "entities_to_resources"
	ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE "projects_to_social_media"
	ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;

--> statement-breakpoint

ALTER TABLE "organisational_units_to_social_media"
	ADD COLUMN IF NOT EXISTS "position" integer NOT NULL DEFAULT 0;
