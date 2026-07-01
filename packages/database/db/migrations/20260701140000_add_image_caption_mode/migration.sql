-- Image captions can inherit the asset caption, override it for one placement, or be hidden.
-- Existing block captions are explicit overrides; blocks without one start inheriting.

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'content_blocks_type_image'
			AND column_name = 'caption_mode'
	) THEN
		ALTER TABLE "content_blocks_type_image"
			ADD COLUMN "caption_mode" text NOT NULL DEFAULT 'inherit';

		UPDATE "content_blocks_type_image"
		SET "caption_mode" = 'override'
		WHERE "caption" IS NOT NULL;
	END IF;
END $$;

--> statement-breakpoint

ALTER TABLE "content_blocks_type_image"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_image_caption_mode_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_image"
	ADD CONSTRAINT "content_blocks_type_image_caption_mode_enum_check"
	CHECK ("caption_mode" IN ('hidden', 'inherit', 'override'));
