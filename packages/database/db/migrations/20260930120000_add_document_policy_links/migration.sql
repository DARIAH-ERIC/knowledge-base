-- A document or policy either points to an uploaded file or to an external page. Both keep the
-- entity shape (title, summary, group, position, lifecycle), so a group can mix them and order them
-- in one list. The existing `url` column stays what it was: a supplementary link such as a doi.

ALTER TABLE "documents_policies" ADD COLUMN IF NOT EXISTS "link_url" text;

--> statement-breakpoint
ALTER TABLE "documents_policies" ALTER COLUMN "document_id" DROP NOT NULL;

--> statement-breakpoint
-- Dropped first so this migration also applies to a database that `db:push` has already brought in
-- line with the drizzle schema. Every existing row has a `document_id` and no `link_url`, so the
-- constraint holds for them.
ALTER TABLE "documents_policies" DROP CONSTRAINT IF EXISTS "documents_policies_target";

--> statement-breakpoint
ALTER TABLE "documents_policies"
	ADD CONSTRAINT "documents_policies_target"
	CHECK (
		("document_id" IS NOT NULL AND "link_url" IS NULL)
		OR ("document_id" IS NULL AND "link_url" IS NOT NULL)
	);
