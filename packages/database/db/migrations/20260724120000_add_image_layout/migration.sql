-- Add a closed `layout` vocabulary to `image` content blocks: `default` (centred, column width —
-- the historical rendering), `wide`/`full` (centred, broken out), and `float-start`/`float-end`
-- (pulled inline-start/-end with text wrapping around it, as WordPress `alignleft`/`alignright`
-- expressed). Existing rows default to `default`, preserving their current layout exactly.
ALTER TABLE "content_blocks_type_image"
	ADD COLUMN IF NOT EXISTS "layout" text DEFAULT 'default' NOT NULL;

--> statement-breakpoint

ALTER TABLE "content_blocks_type_image"
	DROP CONSTRAINT IF EXISTS "content_blocks_type_image_layout_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_image"
	ADD CONSTRAINT "content_blocks_type_image_layout_enum_check"
	CHECK ("layout" IN ('default', 'wide', 'full', 'float-start', 'float-end'));
