-- The `publication_date` columns added in 20260617120000 (news) and 20260617130000 (pages,
-- spotlight_articles, impact_case_studies) were backfilled with `SET publication_date = updated_at`,
-- and the WordPress migration set `updated_at` from each post's `modified_gmt` (last-edited time)
-- rather than `date_gmt` (published time — what dariah.eu displays). So any item edited after
-- publication got a publication date on the wrong day (e.g. the OER-showcase news item, published
-- 2026-05-11 and edited 2026-05-12; the Arkeogis spotlight, published 2025-04-29 and edited
-- 2025-04-30), and items re-touched in later WordPress batches drifted by months.
--
-- The published `date_gmt` was migrated faithfully into `entities.created_at`, which survives even
-- where a later re-migration reset the per-version table `created_at` (impact/spotlight) or a draft
-- version was cloned on top (news). Only genuinely migrated entities carry a whole-second WordPress
-- `created_at`; entities created through the app get a sub-second `defaultNow()` insert timestamp
-- that is NOT a published date (internal pages, dashboard content) and are left untouched. All
-- versions (draft and published) of a document are set from that one authoritative value. Re-running
-- is a no-op once the dates already match.

UPDATE "news" AS x
SET "publication_date" = e."created_at"
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."created_at" = date_trunc('second', e."created_at")
	AND x."publication_date" <> e."created_at"
	-- pinned to the exact WordPress `date_gmt` below; its own `created_at` is offset-shifted.
	AND e."slug" <> 'dariah-is-seeking-two-new-members-for-the-dariah-joint-research-committee-2';

UPDATE "pages" AS x
SET "publication_date" = e."created_at"
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."created_at" = date_trunc('second', e."created_at")
	AND x."publication_date" <> e."created_at";

UPDATE "impact_case_studies" AS x
SET "publication_date" = e."created_at"
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."created_at" = date_trunc('second', e."created_at")
	AND x."publication_date" <> e."created_at";

UPDATE "spotlight_articles" AS x
SET "publication_date" = e."created_at"
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."created_at" = date_trunc('second', e."created_at")
	AND x."publication_date" <> e."created_at";

-- One news item ("…joint-research-committee-2") was migrated individually via
-- `data:migrate:wordpress-news-item` running on a non-UTC machine, so its `entities.created_at` is
-- the published date shifted by the local offset (stored 10:38 for a 12:38 UTC publish). Pin all its
-- versions to the exact `date_gmt` reported by the WordPress REST API (parsed as UTC).
UPDATE "news" AS x
SET "publication_date" = TIMESTAMPTZ '2026-05-20 12:38:00+00'
FROM "entity_versions" ev
JOIN "entities" e ON e."id" = ev."entity_id"
WHERE x."id" = ev."id"
	AND e."slug" = 'dariah-is-seeking-two-new-members-for-the-dariah-joint-research-committee-2'
	AND x."publication_date" <> TIMESTAMPTZ '2026-05-20 12:38:00+00';
