-- Give the featured image of an entity the same caption model that `image` and `media_text` content
-- blocks already use: `inherit` shows the asset's own caption, `override` shows the per-entity
-- `image_caption`, `hidden` shows none. A caption belongs to the asset and is shared by every
-- placement, so an entity can now say what its own placement should read without editing the asset
-- and changing every other page that uses the same image.
--
-- `inherit` is the default and matches what the API already returned for these entities (the
-- asset's caption verbatim), so existing content renders exactly as before this migration.
--
-- Re-running is a no-op.

ALTER TABLE "news"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "news"
	DROP CONSTRAINT IF EXISTS "news_image_caption_mode_enum_check";

ALTER TABLE "news"
	ADD CONSTRAINT "news_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

ALTER TABLE "events"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "events"
	DROP CONSTRAINT IF EXISTS "events_image_caption_mode_enum_check";

ALTER TABLE "events"
	ADD CONSTRAINT "events_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

ALTER TABLE "funding_calls"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "funding_calls"
	DROP CONSTRAINT IF EXISTS "funding_calls_image_caption_mode_enum_check";

ALTER TABLE "funding_calls"
	ADD CONSTRAINT "funding_calls_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

ALTER TABLE "impact_case_studies"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "impact_case_studies"
	DROP CONSTRAINT IF EXISTS "impact_case_studies_image_caption_mode_enum_check";

ALTER TABLE "impact_case_studies"
	ADD CONSTRAINT "impact_case_studies_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

ALTER TABLE "opportunities"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "opportunities"
	DROP CONSTRAINT IF EXISTS "opportunities_image_caption_mode_enum_check";

ALTER TABLE "opportunities"
	ADD CONSTRAINT "opportunities_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

ALTER TABLE "spotlight_articles"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "spotlight_articles"
	DROP CONSTRAINT IF EXISTS "spotlight_articles_image_caption_mode_enum_check";

ALTER TABLE "spotlight_articles"
	ADD CONSTRAINT "spotlight_articles_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

-- A portrait carries a caption too: typically the photo credit.
ALTER TABLE "persons"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "persons"
	DROP CONSTRAINT IF EXISTS "persons_image_caption_mode_enum_check";

ALTER TABLE "persons"
	ADD CONSTRAINT "persons_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));
