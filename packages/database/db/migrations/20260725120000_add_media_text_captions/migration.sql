-- Give `media_text` content blocks the same caption model as `image` blocks: `inherit` the asset's
-- caption, `override` it for this one placement, or `hidden`. The text bound to the image is prose
-- (a speaker's biography), not a caption — the photo credit still belongs to the image.
--
-- Existing rows get `inherit`, matching `image` blocks and surfacing asset captions (typically the
-- credit) that this block type previously dropped. Set a block to `hidden` to suppress it again.
ALTER TABLE "content_blocks_type_media_text"
	ADD COLUMN IF NOT EXISTS "caption" jsonb;

--> statement-breakpoint

ALTER TABLE "content_blocks_type_media_text"
	ADD COLUMN IF NOT EXISTS "caption_mode" text DEFAULT 'inherit' NOT NULL;

--> statement-breakpoint

ALTER TABLE "content_blocks_type_media_text"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_media_text_caption_mode_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_media_text"
	ADD CONSTRAINT "content_blocks_type_media_text_caption_mode_enum_check"
	CHECK ("caption_mode" IN ('hidden', 'inherit', 'override'));
