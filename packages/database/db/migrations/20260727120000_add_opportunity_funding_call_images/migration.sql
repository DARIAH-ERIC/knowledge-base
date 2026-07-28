-- `opportunities` and `funding_calls` gain a required `image_id` and a required `summary` so they
-- can appear alongside news in the combined `/api/v1/announcements` feed, where every item needs a
-- title, a summary and an image to render an overview card.
--
-- Neither table had an image column at all, and every existing row had a NULL summary (2 versions of
-- 1 opportunity, 2 versions each of 2 funding calls — all published), so nothing is being
-- overwritten here: the values below are new content, not a repair. Both documents' versions (draft
-- and published) are backfilled together, matching how the entity is edited.
--
-- Columns are added nullable, backfilled, and only then set NOT NULL, so the migration is correct
-- whether or not the target database has rows. Re-running is a no-op.

ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "image_id" uuid REFERENCES "assets"("id");
ALTER TABLE "funding_calls" ADD COLUMN IF NOT EXISTS "image_id" uuid REFERENCES "assets"("id");

-- The generic DARIAH placeholder (key `images/019e45eb-044e-769c-bd32-f08e37339771`), already the
-- fallback image for 79 news items and 77 events, so the feed stays visually consistent with them.
-- Editors can swap in a specific image per entity from the dashboard afterwards.
--
-- Locally seeded and test databases have their own assets and no placeholder, where pinning its id
-- would fail the foreign key; there any asset satisfies the new constraint equally well.
UPDATE "opportunities"
SET "image_id" = COALESCE(
	(SELECT "id" FROM "assets" WHERE "key" = 'images/019e45eb-044e-769c-bd32-f08e37339771'),
	(SELECT "id" FROM "assets" ORDER BY "created_at", "id" LIMIT 1)
)
WHERE "image_id" IS NULL;

UPDATE "funding_calls"
SET "image_id" = COALESCE(
	(SELECT "id" FROM "assets" WHERE "key" = 'images/019e45eb-044e-769c-bd32-f08e37339771'),
	(SELECT "id" FROM "assets" ORDER BY "created_at", "id" LIMIT 1)
)
WHERE "image_id" IS NULL;

-- Summaries condensed from each entity's own opening rich-text paragraph, so the card text matches
-- the page it links to.
UPDATE "opportunities" AS x
SET "summary" = 'DARIAH is seeking a data steward and community manager for STARDAST, an EU-funded project led by EMBL designing a pan-European training ecosystem for data experts across the full data lifecycle.'
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."slug" = 'job-opportunity-dariah-eric-seeks-a-data-steward'
	AND x."summary" IS NULL;

UPDATE "funding_calls" AS x
SET "summary" = 'DARIAH announces the first call for a Signature Project, to develop an innovative and sustainable core service that strengthens and expands DARIAH''s infrastructure, delivers clear value to the arts and humanities, and stimulates collaboration across DARIAH member states.'
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."slug" = 'call-for-proposals-for-dariah-signature-project-2026'
	AND x."summary" IS NULL;

UPDATE "funding_calls" AS x
SET "summary" = 'The DARIAH Theme is a bi-annual thematic funding call chosen by the DARIAH Board of Directors. For 2024 the topic is Mistakes, inviting applicants to critically consider the role, impact and potential of mistakes in Digital Arts and Humanities research.'
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."slug" = 'dariah-theme-2024-mistakes'
	AND x."summary" IS NULL;

-- Anything not covered above — seeded dev and test rows — falls back to its title, which is a
-- visible placeholder an editor can spot rather than an invented sentence. Against the production
-- data this matches no rows: the three documents above are the only ones that exist.
UPDATE "opportunities" SET "summary" = "title" WHERE "summary" IS NULL;
UPDATE "funding_calls" SET "summary" = "title" WHERE "summary" IS NULL;

-- The Signature Project call was migrated with a leading space in its title, which shows up wherever
-- the title is rendered next to others.
UPDATE "funding_calls"
SET "title" = btrim("title")
WHERE "title" <> btrim("title");
ALTER TABLE "opportunities" ALTER COLUMN "image_id" SET NOT NULL;
ALTER TABLE "opportunities" ALTER COLUMN "summary" SET NOT NULL;
ALTER TABLE "funding_calls" ALTER COLUMN "image_id" SET NOT NULL;
ALTER TABLE "funding_calls" ALTER COLUMN "summary" SET NOT NULL;
