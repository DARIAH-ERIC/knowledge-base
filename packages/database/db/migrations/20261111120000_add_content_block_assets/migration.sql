-- Foreign keys for the assets a `rich_text` or `media_text` body refers to by key: an image in a list
-- item or a blockquote, a typed-in quote author's picture, a link to a document. Each lives in the
-- json as an `imageKey` or `assetKey` string, which no constraint can see; `content_block_assets`
-- holds one row per asset a body refers to, so deleting an asset that is still used fails.
--
-- The rows are derived, never written by the application: a trigger on both body tables rebuilds a
-- block's rows from its json on every insert, update of `content` and delete, so every write path
-- keeps them in step. A key that names no asset gets no row.
--
-- Written to run more than once, and on a database that `db:push` has already brought in line with
-- the drizzle schema.

CREATE TABLE IF NOT EXISTS "content_block_assets" (
	"content_block_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	CONSTRAINT "content_block_assets_pkey" PRIMARY KEY ("content_block_id", "asset_id")
);

--> statement-breakpoint
ALTER TABLE "content_block_assets"
	DROP CONSTRAINT IF EXISTS "content_block_assets_content_block_id_content_blocks_id_fkey";

--> statement-breakpoint
ALTER TABLE "content_block_assets"
	ADD CONSTRAINT "content_block_assets_content_block_id_content_blocks_id_fkey"
	FOREIGN KEY ("content_block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "content_block_assets"
	DROP CONSTRAINT IF EXISTS "content_block_assets_asset_id_assets_id_fkey";

--> statement-breakpoint
ALTER TABLE "content_block_assets"
	ADD CONSTRAINT "content_block_assets_asset_id_assets_id_fkey"
	FOREIGN KEY ("asset_id") REFERENCES "assets"("id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_block_assets_asset_id_idx"
	ON "content_block_assets" ("asset_id");

--> statement-breakpoint

-- Every asset key a body holds, wherever it sits. `imageKey` is an image node's or a quote author's
-- picture, `assetKey` a document link's target. Matching any property of that name anywhere errs
-- towards protecting an asset, never towards missing one.
CREATE OR REPLACE FUNCTION "content_block_asset_keys"("content" jsonb)
	RETURNS SETOF text
	LANGUAGE sql
	IMMUTABLE
AS $$
	SELECT "value" #>> '{}'
	FROM jsonb_path_query("content", 'lax $.**.imageKey ? (@.type() == "string")') AS "value"
	UNION
	SELECT "value" #>> '{}'
	FROM jsonb_path_query("content", 'lax $.**.assetKey ? (@.type() == "string")') AS "value"
$$;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sync_content_block_assets"()
	RETURNS trigger AS $$
BEGIN
	IF TG_OP IN ('UPDATE', 'DELETE') THEN
		DELETE FROM "content_block_assets" WHERE "content_block_id" = OLD."id";
	END IF;

	IF TG_OP IN ('INSERT', 'UPDATE') THEN
		INSERT INTO "content_block_assets" ("content_block_id", "asset_id")
		SELECT NEW."id", a."id"
		FROM "content_block_asset_keys"(NEW."content") AS k("key")
		JOIN "assets" AS a ON a."key" = k."key"
		ON CONFLICT DO NOTHING;
	END IF;

	RETURN NULL;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
DROP TRIGGER IF EXISTS "content_blocks_type_rich_text_sync_assets" ON "content_blocks_type_rich_text";
--> statement-breakpoint
CREATE TRIGGER "content_blocks_type_rich_text_sync_assets"
	AFTER INSERT OR UPDATE OF "content" OR DELETE ON "content_blocks_type_rich_text"
	FOR EACH ROW EXECUTE FUNCTION "sync_content_block_assets"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "content_blocks_type_media_text_sync_assets" ON "content_blocks_type_media_text";
--> statement-breakpoint
CREATE TRIGGER "content_blocks_type_media_text_sync_assets"
	AFTER INSERT OR UPDATE OF "content" OR DELETE ON "content_blocks_type_media_text"
	FOR EACH ROW EXECUTE FUNCTION "sync_content_block_assets"();

--> statement-breakpoint

-- Backfill from the bodies already stored.
INSERT INTO "content_block_assets" ("content_block_id", "asset_id")
SELECT b."id", a."id"
FROM "content_blocks_type_rich_text" AS b
CROSS JOIN LATERAL "content_block_asset_keys"(b."content") AS k("key")
JOIN "assets" AS a ON a."key" = k."key"
ON CONFLICT DO NOTHING;

--> statement-breakpoint
INSERT INTO "content_block_assets" ("content_block_id", "asset_id")
SELECT b."id", a."id"
FROM "content_blocks_type_media_text" AS b
CROSS JOIN LATERAL "content_block_asset_keys"(b."content") AS k("key")
JOIN "assets" AS a ON a."key" = k."key"
ON CONFLICT DO NOTHING;
