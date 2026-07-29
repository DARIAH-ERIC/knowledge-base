-- Projects and organisational units can have an acronym in addition to their name. Include it in
-- the denormalized entity label so relation pickers can display and search it without joining the
-- subtype tables. Persons also use `sync_entity_label_from_name`, so acronym-bearing types get a
-- dedicated trigger function.

CREATE OR REPLACE FUNCTION "sync_entity_label_from_name_and_acronym"()
	RETURNS trigger AS $$
BEGIN
	UPDATE "entities" AS e
	SET "label" = NEW."name" || CASE
		WHEN NULLIF(btrim(NEW."acronym"), '') IS NOT NULL
			THEN ' (' || btrim(NEW."acronym") || ')'
		ELSE ''
	END
	FROM "entity_versions" AS ev
	JOIN "entity_status" AS es ON ev."status_id" = es."id"
	WHERE ev."id" = NEW."id"
		AND e."id" = ev."entity_id"
		AND es."type" = 'published';
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

DROP TRIGGER IF EXISTS "organisational_units_sync_entity_label" ON "organisational_units";
--> statement-breakpoint
CREATE TRIGGER "organisational_units_sync_entity_label"
	AFTER INSERT OR UPDATE OF "name", "acronym" ON "organisational_units"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_name_and_acronym"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "projects_sync_entity_label" ON "projects";
--> statement-breakpoint
CREATE TRIGGER "projects_sync_entity_label"
	AFTER INSERT OR UPDATE OF "name", "acronym" ON "projects"
	FOR EACH ROW EXECUTE FUNCTION "sync_entity_label_from_name_and_acronym"();

--> statement-breakpoint

-- Backfill existing published projects and organisational units.
UPDATE "entities" AS e
SET "label" = s."name" || CASE
	WHEN NULLIF(btrim(s."acronym"), '') IS NOT NULL
		THEN ' (' || btrim(s."acronym") || ')'
	ELSE ''
END
FROM "entity_versions" AS ev
JOIN "entity_status" AS es ON ev."status_id" = es."id"
JOIN "organisational_units" AS s ON s."id" = ev."id"
WHERE e."id" = ev."entity_id"
	AND es."type" = 'published';

--> statement-breakpoint

UPDATE "entities" AS e
SET "label" = s."name" || CASE
	WHEN NULLIF(btrim(s."acronym"), '') IS NOT NULL
		THEN ' (' || btrim(s."acronym") || ')'
	ELSE ''
END
FROM "entity_versions" AS ev
JOIN "entity_status" AS es ON ev."status_id" = es."id"
JOIN "projects" AS s ON s."id" = ev."id"
WHERE e."id" = ev."entity_id"
	AND es."type" = 'published';
