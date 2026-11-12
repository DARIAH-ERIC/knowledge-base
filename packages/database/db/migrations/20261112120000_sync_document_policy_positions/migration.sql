-- Each version of a document or policy (draft and published) is its own row with its own `position`,
-- and reordering used to swap positions between rows of any version, including ones the dashboard
-- does not show, and never carried the change to an entry's other version. The website therefore
-- listed entries in a different order than the dashboard. Renumber each group's entries 0..n-1 in
-- the order the dashboard lists them - by their latest editable version (the draft, else the
-- published one), then title - and write that position to every version of the entry in the group.
-- Safe to run again: it only rewrites positions to the same order.
WITH "latest" AS (
	SELECT DISTINCT ON ("ev"."entity_id")
		"ev"."entity_id",
		"dp"."group_id",
		"dp"."position",
		"dp"."title"
	FROM "documents_policies" AS "dp"
	INNER JOIN "entity_versions" AS "ev" ON "ev"."id" = "dp"."id"
	INNER JOIN "entity_status" AS "es" ON "es"."id" = "ev"."status_id"
	ORDER BY "ev"."entity_id", ("es"."type" = 'draft') DESC
),
"ranked" AS (
	SELECT
		"entity_id",
		"group_id",
		(row_number() OVER (
			PARTITION BY "group_id"
			ORDER BY "position", "title", "entity_id"
		) - 1)::integer AS "position"
	FROM "latest"
)
UPDATE "documents_policies" AS "dp"
SET "position" = "ranked"."position"
FROM "entity_versions" AS "ev", "ranked"
WHERE "ev"."id" = "dp"."id"
	AND "ranked"."entity_id" = "ev"."entity_id"
	AND "dp"."group_id" IS NOT DISTINCT FROM "ranked"."group_id";
