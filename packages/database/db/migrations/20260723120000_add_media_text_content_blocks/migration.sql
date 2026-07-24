ALTER TABLE "content_blocks_types"
	DROP CONSTRAINT IF EXISTS "content_blocks_types_type_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_types"
	ADD CONSTRAINT "content_blocks_types_type_enum_check"
	CHECK ("type" IN ('accordion', 'callout', 'data', 'embed', 'gallery', 'hero', 'image', 'media_text', 'rich_text'));

--> statement-breakpoint

INSERT INTO "content_blocks_types" ("type")
VALUES ('media_text')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "content_blocks_type_media_text" (
	"id" uuid PRIMARY KEY NOT NULL REFERENCES "content_blocks"("id") ON DELETE CASCADE,
	"image_id" uuid NOT NULL REFERENCES "assets"("id"),
	"side" text DEFAULT 'left' NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_type_media_text_side_enum_check"
		CHECK ("side" IN ('left', 'right'))
);
