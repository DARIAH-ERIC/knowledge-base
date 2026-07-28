-- Bring the last two image-bearing content blocks onto the caption model `image` and `media_text`
-- already use: `inherit` shows the asset's own caption, `override` shows the block's, `hidden` shows
-- none. After this every placement of an image — featured image, image block, media_text, hero,
-- gallery item — decides its caption the same way.
--
-- Re-running is a no-op.

-- Hero blocks had no caption of their own at all, and the API served the asset's caption verbatim,
-- so `inherit` reproduces today's output exactly. The new `caption` column is what an editor fills
-- in after switching a hero to `override`.
ALTER TABLE "content_blocks_type_hero"
	ADD COLUMN IF NOT EXISTS "caption" jsonb,
	ADD COLUMN IF NOT EXISTS "caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "content_blocks_type_hero"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_hero_caption_mode_enum_check";

ALTER TABLE "content_blocks_type_hero"
	ADD CONSTRAINT "content_blocks_type_hero_caption_mode_enum_check"
	CHECK ("caption_mode" IN ('hidden', 'inherit', 'override'));

--> statement-breakpoint

-- Gallery items are the other way round: they already had a caption that was always shown as-is,
-- with no way to inherit the asset's. Existing items are therefore backfilled to `override` where a
-- caption was authored — anything else would replace an editor's text with the asset's — and to
-- `inherit` where none was, which is what lets a photo credit surface for the first time.
-- Added nullable and backfilled before the default is attached, so the backfill can tell "never set"
-- from "set to inherit by an editor" and re-running cannot overwrite a later editorial choice.
ALTER TABLE "content_blocks_type_gallery_items"
	ADD COLUMN IF NOT EXISTS "caption_mode" text;

UPDATE "content_blocks_type_gallery_items"
SET "caption_mode" = CASE WHEN "caption" IS NOT NULL THEN 'override' ELSE 'inherit' END
WHERE "caption_mode" IS NULL;

ALTER TABLE "content_blocks_type_gallery_items"
	ALTER COLUMN "caption_mode" SET DEFAULT 'inherit';

ALTER TABLE "content_blocks_type_gallery_items"
	ALTER COLUMN "caption_mode" SET NOT NULL;

ALTER TABLE "content_blocks_type_gallery_items"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_gallery_items_caption_mode_enum_check";

ALTER TABLE "content_blocks_type_gallery_items"
	ADD CONSTRAINT "content_blocks_type_gallery_items_caption_mode_enum_check"
	CHECK ("caption_mode" IN ('hidden', 'inherit', 'override'));
