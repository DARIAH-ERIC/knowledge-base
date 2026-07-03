ALTER TABLE "content_blocks_types"
	DROP CONSTRAINT IF EXISTS "content_blocks_types_type_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_types"
	ADD CONSTRAINT "content_blocks_types_type_enum_check"
	CHECK ("type" IN ('accordion', 'callout', 'data', 'embed', 'gallery', 'hero', 'image', 'rich_text'));

--> statement-breakpoint

INSERT INTO "content_blocks_types" ("type")
VALUES ('callout')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "content_blocks_type_callout" (
	"id" uuid PRIMARY KEY NOT NULL REFERENCES "content_blocks"("id") ON DELETE CASCADE,
	"intent" text DEFAULT 'info' NOT NULL,
	"title" text,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_type_callout_intent_enum_check"
		CHECK ("intent" IN ('default', 'info', 'warning', 'danger', 'success'))
);
