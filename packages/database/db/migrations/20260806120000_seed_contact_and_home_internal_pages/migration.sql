WITH "internal_type" AS (
	SELECT
		"id"
	FROM
		"entity_types"
	WHERE
		"type" = 'internal_pages'
),
"draft_status" AS (
	SELECT
		"id"
	FROM
		"entity_status"
	WHERE
		"type" = 'draft'
),
"published_status" AS (
	SELECT
		"id"
	FROM
		"entity_status"
	WHERE
		"type" = 'published'
),
"source" ("slug", "title") AS (
	VALUES
		('contact', 'Contact'),
		('home', 'DARIAH Knowledge Base')
),
"inserted_entities" AS (
	INSERT INTO
		"entities" ("type_id", "slug")
	SELECT
		"internal_type"."id",
		"source"."slug"
	FROM
		"source",
		"internal_type"
	ON CONFLICT ("type_id", "slug") DO UPDATE
	SET
		"slug" = EXCLUDED."slug"
	RETURNING
		"id",
		"slug"
),
"inserted_versions" AS (
	INSERT INTO
		"entity_versions" ("entity_id", "status_id")
	SELECT
		"inserted_entities"."id",
		"published_status"."id"
	FROM
		"inserted_entities",
		"published_status"
	UNION ALL
	SELECT
		"inserted_entities"."id",
		"draft_status"."id"
	FROM
		"inserted_entities",
		"draft_status"
	ON CONFLICT ("entity_id", "status_id") DO UPDATE
	SET
		"entity_id" = EXCLUDED."entity_id"
	RETURNING
		"id",
		"entity_id"
),
"inserted_internal_pages" AS (
	INSERT INTO
		"internal_pages" ("id", "title")
	SELECT
		"inserted_versions"."id",
		"source"."title"
	FROM
		"inserted_versions"
		JOIN "inserted_entities" ON "inserted_entities"."id" = "inserted_versions"."entity_id"
		JOIN "source" ON "source"."slug" = "inserted_entities"."slug"
	ON CONFLICT ("id") DO NOTHING
	RETURNING
		"id"
)
-- The entity type is looked up directly rather than joined back through "entities" and
-- "entity_versions": those base tables are read from the pre-statement snapshot, so the rows the
-- CTEs above just inserted are not visible there and such a join matches nothing.
INSERT INTO
	"fields" ("entity_version_id", "field_name_id")
SELECT
	"inserted_versions"."id",
	"entity_types_fields_names"."id"
FROM
	"inserted_versions"
	CROSS JOIN "entity_types_fields_names"
	JOIN "entity_types" ON "entity_types"."id" = "entity_types_fields_names"."entity_type_id"
WHERE
	"entity_types"."type" = 'internal_pages'
	AND "entity_types_fields_names"."field_name" = 'content'
ON CONFLICT ("entity_version_id", "field_name_id") DO NOTHING;

--> statement-breakpoint
-- The home page's landing screen — title, tagline and the documentation link — used to be
-- hard-coded in the app. It moves into a hero block so that what the site shows and what the editor
-- shows are the same thing. The sign-in button stays in the app: its label and target depend on the
-- visitor's session, which no stored CTA can express. Only seeded into content fields that are
-- still empty, so re-running never duplicates it or overwrites edited content.
WITH "empty_home_content_fields" AS (
	SELECT
		"fields"."id"
	FROM
		"fields"
		JOIN "entity_types_fields_names" ON "entity_types_fields_names"."id" = "fields"."field_name_id"
		AND "entity_types_fields_names"."field_name" = 'content'
		JOIN "entity_versions" ON "entity_versions"."id" = "fields"."entity_version_id"
		JOIN "entities" ON "entities"."id" = "entity_versions"."entity_id"
		AND "entities"."slug" = 'home'
		JOIN "entity_types" ON "entity_types"."id" = "entities"."type_id"
		AND "entity_types"."type" = 'internal_pages'
	WHERE
		NOT EXISTS (
			SELECT
				1
			FROM
				"content_blocks"
			WHERE
				"content_blocks"."field_id" = "fields"."id"
		)
),
"inserted_content_blocks" AS (
	INSERT INTO
		"content_blocks" ("field_id", "type_id", "position")
	SELECT
		"empty_home_content_fields"."id",
		"content_blocks_types"."id",
		0
	FROM
		"empty_home_content_fields",
		"content_blocks_types"
	WHERE
		"content_blocks_types"."type" = 'hero'
	RETURNING
		"id"
)
INSERT INTO
	"content_blocks_type_hero" ("id", "title", "subtitle", "ctas")
SELECT
	"inserted_content_blocks"."id",
	'DARIAH Knowledge Base',
	'Your central hub for everything DARIAH-related.',
	'[{"label":"Read documentation","url":"/documentation"}]'::jsonb
FROM
	"inserted_content_blocks"
ON CONFLICT ("id") DO NOTHING;
