ALTER TABLE "pages"
	ADD COLUMN IF NOT EXISTS "publication_date" timestamp(3) with time zone;

UPDATE "pages"
SET "publication_date" = "updated_at"
WHERE "publication_date" IS NULL;

ALTER TABLE "pages"
	ALTER COLUMN "publication_date" SET NOT NULL;

ALTER TABLE "spotlight_articles"
	ADD COLUMN IF NOT EXISTS "publication_date" timestamp(3) with time zone;

UPDATE "spotlight_articles"
SET "publication_date" = "updated_at"
WHERE "publication_date" IS NULL;

ALTER TABLE "spotlight_articles"
	ALTER COLUMN "publication_date" SET NOT NULL;

ALTER TABLE "impact_case_studies"
	ADD COLUMN IF NOT EXISTS "publication_date" timestamp(3) with time zone;

UPDATE "impact_case_studies"
SET "publication_date" = "updated_at"
WHERE "publication_date" IS NULL;

ALTER TABLE "impact_case_studies"
	ALTER COLUMN "publication_date" SET NOT NULL;
