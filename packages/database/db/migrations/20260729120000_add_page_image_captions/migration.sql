-- Pages were the last entity with a featured image that could not say how it is captioned. They now
-- follow the same model as news, events and the rest: `inherit` shows the asset's own caption,
-- `override` shows the page's own, `hidden` shows none.
--
-- `inherit` is the default and matches what the API already returned for pages (the asset's caption
-- verbatim), so existing pages render exactly as before.
--
-- Re-running is a no-op.

ALTER TABLE "pages"
	ADD COLUMN IF NOT EXISTS "image_caption" jsonb,
	ADD COLUMN IF NOT EXISTS "image_caption_mode" text DEFAULT 'inherit' NOT NULL;

ALTER TABLE "pages"
	DROP CONSTRAINT IF EXISTS "pages_image_caption_mode_enum_check";

ALTER TABLE "pages"
	ADD CONSTRAINT "pages_image_caption_mode_enum_check"
	CHECK ("image_caption_mode" IN ('hidden', 'inherit', 'override'));
