ALTER TABLE "content_blocks_types" DROP CONSTRAINT "content_blocks_types_type_enum_check";

--> statement-breakpoint
ALTER TABLE "content_blocks_types" ADD CONSTRAINT "content_blocks_types_type_enum_check" CHECK ("type" IN ('accordion', 'data', 'embed', 'hero', 'image', 'rich_text'));

--> statement-breakpoint
CREATE TABLE "content_blocks_type_hero" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"eyebrow" text,
	"image_id" uuid,
	"ctas" jsonb,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_type_hero_id_content_blocks_id_fk" FOREIGN KEY ("id") REFERENCES "content_blocks"("id") ON DELETE CASCADE,
	CONSTRAINT "content_blocks_type_hero_image_id_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "assets"("id")
);

--> statement-breakpoint
CREATE TABLE "content_blocks_type_accordion" (
	"id" uuid PRIMARY KEY NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_blocks_type_accordion_id_content_blocks_id_fk" FOREIGN KEY ("id") REFERENCES "content_blocks"("id") ON DELETE CASCADE
);

--> statement-breakpoint
INSERT INTO
	"content_blocks_types" ("type")
VALUES
	('accordion'),
	('hero')
ON CONFLICT ("type") DO NOTHING;
