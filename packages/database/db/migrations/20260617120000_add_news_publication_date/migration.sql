ALTER TABLE "news"
	ADD COLUMN IF NOT EXISTS "publication_date" timestamp(3) with time zone;

UPDATE "news"
SET "publication_date" = "updated_at"
WHERE "publication_date" IS NULL;

ALTER TABLE "news"
	ALTER COLUMN "publication_date" SET NOT NULL;
