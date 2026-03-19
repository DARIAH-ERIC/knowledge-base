--> statement-breakpoint
WITH
	"entity" AS (
		INSERT INTO
			"entities" ("type_id", "status_id", "slug")
		SELECT
			"entity_types"."id",
			"entity_status"."id",
			'dariah-eu'
		FROM
			"entity_types",
			"entity_status"
		WHERE
			"entity_types"."type" = 'organisational_units'
			AND "entity_status"."type" = 'published'
		RETURNING
			"id"
	)
INSERT INTO
	"organisational_units" ("id", "name", "summary", "type_id")
SELECT
	"entity"."id",
	'DARIAH-EU',
	'',
	"organisational_unit_types"."id"
FROM
	"entity",
	"organisational_unit_types"
WHERE
	"organisational_unit_types"."type" = 'umbrella_consortium'
ON CONFLICT ("id") DO NOTHING;

--> statement-breakpoint
WITH
	"body_entities" AS (
		INSERT INTO
			"entities" ("type_id", "status_id", "slug")
		SELECT
			"entity_types"."id",
			"entity_status"."id",
			"tmp"."slug"
		FROM
			(
				VALUES
					('board-of-directors'),
					('dariah-coordination-office'),
					('general-assembly'),
					('joint-research-committee'),
					('national-coordinators-committee'),
					('scientific-board'),
					('senior-management-team')
			) AS "tmp" ("slug"),
			"entity_types",
			"entity_status"
		WHERE
			"entity_types"."type" = 'organisational_units'
			AND "entity_status"."type" = 'published'
		RETURNING
			"id",
			"slug"
	),
	"body_units" AS (
		INSERT INTO
			"organisational_units" ("id", "name", "acronym", "summary", "type_id")
		SELECT
			"body_entities"."id",
			"tmp"."name",
			"tmp"."acronym",
			'',
			"organisational_unit_types"."id"
		FROM
			(
				VALUES
					('board-of-directors', 'Board of directors', 'bod'),
					(
						'dariah-coordination-office',
						'DARIAH coordination office',
						'dco'
					),
					('general-assembly', 'General assembly', 'ga'),
					(
						'joint-research-committee',
						'Joint research committee',
						'jrc'
					),
					(
						'national-coordinators-committee',
						'National coordinators committee',
						'ncc'
					),
					('scientific-board', 'Scientific board', 'sb'),
					(
						'senior-management-team',
						'Senior management team',
						'smt'
					)
			) AS "tmp" ("slug", "name", "acronym")
			JOIN "body_entities" ON "body_entities"."slug" = "tmp"."slug"
			CROSS JOIN "organisational_unit_types"
		WHERE
			"organisational_unit_types"."type" = 'body'
		ON CONFLICT ("id") DO NOTHING
		RETURNING
			"id"
	)
INSERT INTO
	"organisational_units_to_units" (
		"unit_id",
		"related_unit_id",
		"status",
		"duration"
	)
SELECT
	"body_units"."id",
	"dariah_eu"."id",
	"organisational_unit_status"."id",
	'[2014-08-19,)'::tstzrange
FROM
	"body_units"
	CROSS JOIN "organisational_unit_status"
	CROSS JOIN (
		SELECT
			"organisational_units"."id"
		FROM
			"organisational_units"
			JOIN "entities" ON "entities"."id" = "organisational_units"."id"
		WHERE
			"entities"."slug" = 'dariah-eu'
	) AS "dariah_eu"
WHERE
	"organisational_unit_status"."status" = 'is_part'
ON CONFLICT DO NOTHING;
