-- Add a closed `layout` vocabulary to `embed` content blocks — `default` (column width, the
-- historical rendering) and `wide`/`full` (broken out), as on `image` blocks but without the floats
-- — and an `aspect_ratio` for the frame, since an iframe has no intrinsic size the page could read.
-- Existing rows default to `default` and `16:9`, preserving their current rendering exactly.
ALTER TABLE "content_blocks_type_embed"
	ADD COLUMN IF NOT EXISTS "layout" text DEFAULT 'default' NOT NULL;

--> statement-breakpoint

ALTER TABLE "content_blocks_type_embed"
	ADD COLUMN IF NOT EXISTS "aspect_ratio" text DEFAULT '16:9' NOT NULL;

--> statement-breakpoint

ALTER TABLE "content_blocks_type_embed"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_embed_layout_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_embed"
	ADD CONSTRAINT "content_blocks_type_embed_layout_enum_check"
	CHECK ("layout" IN ('default', 'wide', 'full'));

--> statement-breakpoint

ALTER TABLE "content_blocks_type_embed"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_embed_aspect_ratio_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_embed"
	ADD CONSTRAINT "content_blocks_type_embed_aspect_ratio_enum_check"
	CHECK ("aspect_ratio" IN ('16:9', '4:3', '1:1', '3:4'));
