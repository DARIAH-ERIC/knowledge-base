-- Denormalized, searchable `label` (published title/name) on the `entities` document table.
--
-- The human title/name lives on the per-type version subtables (events.title, organisational_units.name,
-- ...), so searching/displaying a document by name previously meant joining ~14 tables. Instead we
-- mirror the *published* version's title/name onto entities.label, maintained by triggers so no
-- application code has to keep it in sync. Null until the document has a published version.
--
-- This migration is idempotent: re-running it is a no-op.

ALTER TABLE "entities"
	ADD COLUMN IF NOT EXISTS "label" text;

--> statement-breakpoint

-- Trigger functions: copy the changed subtype row's title/name onto its document, but only when that
-- row belongs to the document's *published* version (draft edits must not change the published label).
CREATE OR REPLACE FUNCTION "sync_entity_label_from_title"()
	RETURNS trigger AS $$
BEGIN
	UPDATE "entities" AS e
	SET "label" = NEW."title"
	FROM "entity_versions" AS ev
	JOIN "entity_status" AS es ON ev."status_id" = es."id"
	WHERE ev."id" = NEW."id"
		AND e."id" = ev."entity_id"
		AND es."type" = 'published';
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sync_entity_label_from_name"()
	RETURNS trigger AS $$
BEGIN
	UPDATE "entities" AS e
	SET "label" = NEW."name"
	FROM "entity_versions" AS ev
	JOIN "entity_status" AS es ON ev."status_id" = es."id"
	WHERE ev."id" = NEW."id"
		AND e."id" = ev."entity_id"
		AND es."type" = 'published';
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

-- title-sourced subtype tables (DROP IF EXISTS + CREATE keeps the triggers idempotent on any PG version)
DROP TRIGGER IF EXISTS "documentation_pages_sync_entity_label" ON "documentation_pages";
--> statement-breakpoint
CREATE TRIGGER "documentation_pages_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "documentation_pages"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "documents_policies_sync_entity_label" ON "documents_policies";
--> statement-breakpoint
CREATE TRIGGER "documents_policies_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "documents_policies"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "events_sync_entity_label" ON "events";
--> statement-breakpoint
CREATE TRIGGER "events_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "events"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "funding_calls_sync_entity_label" ON "funding_calls";
--> statement-breakpoint
CREATE TRIGGER "funding_calls_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "funding_calls"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "impact_case_studies_sync_entity_label" ON "impact_case_studies";
--> statement-breakpoint
CREATE TRIGGER "impact_case_studies_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "impact_case_studies"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "internal_pages_sync_entity_label" ON "internal_pages";
--> statement-breakpoint
CREATE TRIGGER "internal_pages_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "internal_pages"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "news_sync_entity_label" ON "news";
--> statement-breakpoint
CREATE TRIGGER "news_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "news"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "opportunities_sync_entity_label" ON "opportunities";
--> statement-breakpoint
CREATE TRIGGER "opportunities_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "opportunities"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "pages_sync_entity_label" ON "pages";
--> statement-breakpoint
CREATE TRIGGER "pages_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "pages"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "spotlight_articles_sync_entity_label" ON "spotlight_articles";
--> statement-breakpoint
CREATE TRIGGER "spotlight_articles_sync_entity_label"
	AFTER INSERT OR UPDATE OF "title" ON "spotlight_articles"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_title"();

--> statement-breakpoint

-- name-sourced subtype tables
DROP TRIGGER IF EXISTS "organisational_units_sync_entity_label" ON "organisational_units";
--> statement-breakpoint
CREATE TRIGGER "organisational_units_sync_entity_label"
	AFTER INSERT OR UPDATE OF "name" ON "organisational_units"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_name"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "persons_sync_entity_label" ON "persons";
--> statement-breakpoint
CREATE TRIGGER "persons_sync_entity_label"
	AFTER INSERT OR UPDATE OF "name" ON "persons"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_name"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "projects_sync_entity_label" ON "projects";
--> statement-breakpoint
CREATE TRIGGER "projects_sync_entity_label"
	AFTER INSERT OR UPDATE OF "name" ON "projects"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_name"();

--> statement-breakpoint

-- Backfill existing published documents (re-runnable: recomputes the same values).
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "documentation_pages" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "documents_policies" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "events" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "funding_calls" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "impact_case_studies" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "internal_pages" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "news" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "opportunities" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "pages" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."title"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "spotlight_articles" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."name"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "organisational_units" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."name"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "persons" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
--> statement-breakpoint
UPDATE "entities" AS e SET "label" = s."name"
	FROM "entity_versions" AS ev JOIN "entity_status" AS es ON ev."status_id" = es."id"
	JOIN "projects" AS s ON s."id" = ev."id"
	WHERE e."id" = ev."entity_id" AND es."type" = 'published';
