-- Content blocks become a tree, so a container's body is made of blocks rather than a jsonb
-- document. That is what lets an image inside a callout or an accordion panel be an `image` block
-- with a real reference to its asset.
--
-- Structural only: every body moves across as a single `rich_text` child, which is exactly what it
-- was. Pulling the `assetImage` nodes already sitting inside those documents out into their own
-- `image` blocks needs the editor's splitter and an asset lookup, so it is a follow-up
-- (`pnpm run data:backfill:nested-block-images`).

ALTER TABLE "content_blocks"
	ADD COLUMN IF NOT EXISTS "parent_block_id" uuid
	REFERENCES "content_blocks"("id") ON DELETE CASCADE;

--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "content_blocks_parent_block_id_idx"
	ON "content_blocks" ("parent_block_id");

--> statement-breakpoint

ALTER TABLE "content_blocks_types"
	DROP CONSTRAINT IF EXISTS "content_blocks_types_type_enum_check";

--> statement-breakpoint

ALTER TABLE "content_blocks_types"
	ADD CONSTRAINT "content_blocks_types_type_enum_check"
	CHECK ("type" IN ('accordion', 'accordion_item', 'callout', 'data', 'embed', 'gallery', 'hero', 'image', 'media_text', 'rich_text'));

--> statement-breakpoint

INSERT INTO "content_blocks_types" ("type")
VALUES ('accordion_item')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "content_blocks_type_accordion_item" (
	"id" uuid PRIMARY KEY NOT NULL REFERENCES "content_blocks"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint

-- Ids are generated up front rather than left to the column default, so the child rows can be
-- inserted by id in later statements instead of correlated back to what a RETURNING clause emitted.
CREATE TEMPORARY TABLE "nest_content_blocks_callouts" (
	"body_block_id" uuid NOT NULL,
	"callout_block_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"content" jsonb NOT NULL
);

--> statement-breakpoint

-- `dev:services:setup` pushes the current schema before replaying migrations, so the legacy column
-- can already be absent. Dynamic SQL keeps PostgreSQL from resolving the missing column unless the
-- legacy shape is actually present.
DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'content_blocks_type_callout'
			AND column_name = 'content'
	) THEN
		EXECUTE $sql$
			INSERT INTO "nest_content_blocks_callouts"
			SELECT
				UUIDV7(),
				cb."id",
				cb."field_id",
				c."content"
			FROM "content_blocks" cb
			JOIN "content_blocks_type_callout" c ON c."id" = cb."id"
			-- An empty body is not carried over: it would become a block holding one blank paragraph,
			-- which the write path deletes on the next save anyway. jsonb equality ignores key order.
			WHERE jsonb_typeof(c."content") = 'object'
				AND c."content" <> '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
				AND c."content" <> '{"type":"doc","content":[]}'::jsonb
				AND c."content" <> '{"type":"doc"}'::jsonb
		$sql$;
	END IF;
END
$migration$;

--> statement-breakpoint

INSERT INTO "content_blocks" ("id", "field_id", "type_id", "parent_block_id", "position")
SELECT
	m."body_block_id",
	m."field_id",
	(SELECT "id" FROM "content_blocks_types" WHERE "type" = 'rich_text'),
	m."callout_block_id",
	0
FROM "nest_content_blocks_callouts" m;

--> statement-breakpoint

INSERT INTO "content_blocks_type_rich_text" ("id", "content")
SELECT m."body_block_id", m."content"
FROM "nest_content_blocks_callouts" m;

--> statement-breakpoint

DROP TABLE "nest_content_blocks_callouts";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_callout"
	DROP COLUMN IF EXISTS "content";

--> statement-breakpoint

-- One row per stored accordion panel, carrying both the id its `accordion_item` block will get and
-- the id the block holding its body will get.
CREATE TEMPORARY TABLE "nest_content_blocks_accordion_items" (
	"item_block_id" uuid NOT NULL,
	"body_block_id" uuid NOT NULL,
	"accordion_block_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb
);

--> statement-breakpoint

DO $migration$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'content_blocks_type_accordion'
			AND column_name = 'items'
	) THEN
		EXECUTE $sql$
			INSERT INTO "nest_content_blocks_accordion_items"
			SELECT
				UUIDV7(),
				UUIDV7(),
				cb."id",
				cb."field_id",
				(item.ordinality - 1)::integer,
				COALESCE(item.value ->> 'title', ''),
				item.value -> 'content'
			FROM "content_blocks" cb
			JOIN "content_blocks_type_accordion" a ON a."id" = cb."id"
			CROSS JOIN LATERAL jsonb_array_elements(
				CASE WHEN jsonb_typeof(a."items") = 'array' THEN a."items" ELSE '[]'::jsonb END
			) WITH ORDINALITY AS item(value, ordinality)
		$sql$;
	END IF;
END
$migration$;

--> statement-breakpoint

INSERT INTO "content_blocks" ("id", "field_id", "type_id", "parent_block_id", "position")
SELECT
	m."item_block_id",
	m."field_id",
	(SELECT "id" FROM "content_blocks_types" WHERE "type" = 'accordion_item'),
	m."accordion_block_id",
	m."position"
FROM "nest_content_blocks_accordion_items" m;

--> statement-breakpoint

INSERT INTO "content_blocks_type_accordion_item" ("id", "title")
SELECT m."item_block_id", m."title"
FROM "nest_content_blocks_accordion_items" m;

--> statement-breakpoint

INSERT INTO "content_blocks" ("id", "field_id", "type_id", "parent_block_id", "position")
SELECT
	m."body_block_id",
	m."field_id",
	(SELECT "id" FROM "content_blocks_types" WHERE "type" = 'rich_text'),
	m."item_block_id",
	0
FROM "nest_content_blocks_accordion_items" m
WHERE jsonb_typeof(m."content") = 'object'
	AND m."content" <> '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
	AND m."content" <> '{"type":"doc","content":[]}'::jsonb
	AND m."content" <> '{"type":"doc"}'::jsonb;

--> statement-breakpoint

INSERT INTO "content_blocks_type_rich_text" ("id", "content")
SELECT m."body_block_id", m."content"
FROM "nest_content_blocks_accordion_items" m
WHERE jsonb_typeof(m."content") = 'object'
	AND m."content" <> '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
	AND m."content" <> '{"type":"doc","content":[]}'::jsonb
	AND m."content" <> '{"type":"doc"}'::jsonb;

--> statement-breakpoint

DROP TABLE "nest_content_blocks_accordion_items";

--> statement-breakpoint

ALTER TABLE "content_blocks_type_accordion"
	DROP COLUMN IF EXISTS "items";
