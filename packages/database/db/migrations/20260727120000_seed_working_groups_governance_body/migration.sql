-- The "Working groups" governance body used to be synthesised in the api (name, summary and
-- description hardcoded in TypeScript) because it has no persons of its own — its people are the
-- chairs of all working groups, derived at read time. Everything else about it is an ordinary
-- governance body, so seed a real published document that editors can maintain in the dashboard.
-- The api keeps deriving the persons; the copy now lives in the database.
--
-- This migration is idempotent: re-running it inserts nothing.
--
-- Inserting the document here bypasses the publish path that keeps the website search index in
-- sync, so run the entity ingest (`data:ingest:search:entities`) after applying this.

WITH
	"document" AS (
		INSERT INTO
			"entities" ("type_id", "slug")
		SELECT
			"entity_types"."id",
			'working-groups'
		FROM
			"entity_types"
		WHERE
			"entity_types"."type" = 'organisational_units'
		ON CONFLICT ("type_id", "slug") DO NOTHING
		RETURNING
			"id"
	),
	"version" AS (
		INSERT INTO
			"entity_versions" ("entity_id", "status_id", "created_at", "updated_at")
		SELECT
			"document"."id",
			"entity_status"."id",
			-- The `publishedAt` the api used to report for this body, kept so it neither claims to be
			-- newly published nor jumps to the top of the governance bodies list (ordered by update
			-- time) it used to sit at the bottom of.
			'2026-01-01T00:00:00.000Z'::timestamptz,
			'2026-01-01T00:00:00.000Z'::timestamptz
		FROM
			"document",
			"entity_status"
		WHERE
			"entity_status"."type" = 'published'
		RETURNING
			"id"
	)
INSERT INTO
	"organisational_units" ("id", "name", "summary", "type_id")
SELECT
	"version"."id",
	'Working groups',
	'Self-organised communities of practice within DARIAH which contribute to bringing together state-of-art digital arts and humanities activities and scaling their results to a European level.',
	"organisational_unit_types"."id"
FROM
	"version",
	"organisational_unit_types"
WHERE
	"organisational_unit_types"."type" = 'governance_body'
ON CONFLICT ("id") DO NOTHING;

--> statement-breakpoint
-- The description is a rich-text content block on the version's `description` field, the same shape
-- the dashboard's description editor writes.
WITH
	"version" AS (
		SELECT
			"entity_versions"."id"
		FROM
			"entity_versions"
			JOIN "entities" ON "entities"."id" = "entity_versions"."entity_id"
			JOIN "entity_types" ON "entity_types"."id" = "entities"."type_id"
			JOIN "entity_status" ON "entity_status"."id" = "entity_versions"."status_id"
		WHERE
			"entities"."slug" = 'working-groups'
			AND "entity_types"."type" = 'organisational_units'
			AND "entity_status"."type" = 'published'
	),
	"field" AS (
		INSERT INTO
			"fields" ("entity_version_id", "field_name_id")
		SELECT
			"version"."id",
			"entity_types_fields_names"."id"
		FROM
			"version"
			CROSS JOIN "entity_types_fields_names"
			JOIN "entity_types" ON "entity_types"."id" = "entity_types_fields_names"."entity_type_id"
		WHERE
			"entity_types"."type" = 'organisational_units'
			AND "entity_types_fields_names"."field_name" = 'description'
		ON CONFLICT ("entity_version_id", "field_name_id") DO NOTHING
		RETURNING
			"id"
	),
	"block" AS (
		INSERT INTO
			"content_blocks" ("field_id", "type_id", "position")
		SELECT
			"field"."id",
			"content_blocks_types"."id",
			0
		FROM
			"field",
			"content_blocks_types"
		WHERE
			"content_blocks_types"."type" = 'rich_text'
		RETURNING
			"id"
	)
INSERT INTO
	"content_blocks_type_rich_text" ("id", "content")
SELECT
	"block"."id",
	'{
		"type": "doc",
		"content": [
			{
				"type": "paragraph",
				"content": [
					{
						"type": "text",
						"text": "Self-organised communities of practice within DARIAH which contribute to bringing together state-of-art digital arts and humanities activities and scaling their results to a European level."
					}
				]
			}
		]
	}'::jsonb
FROM
	"block"
ON CONFLICT ("id") DO NOTHING;
