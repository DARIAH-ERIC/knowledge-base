-- DARIAH-EU: insert one document row, one version row, then the org-unit row
WITH
	"document" AS (
		INSERT INTO
			"entities" ("type_id", "slug")
		SELECT
			"entity_types"."id",
			'dariah-eu'
		FROM
			"entity_types"
		WHERE
			"entity_types"."type" = 'organisational_units'
		RETURNING
			"id"
	),
	"version" AS (
		INSERT INTO
			"entity_versions" ("entity_id", "status_id")
		SELECT
			"document"."id",
			"entity_status"."id"
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
	'DARIAH-EU',
	'',
	"organisational_unit_types"."id"
FROM
	"version",
	"organisational_unit_types"
WHERE
	"organisational_unit_types"."type" = 'eric'
ON CONFLICT ("id") DO NOTHING;

--> statement-breakpoint
-- Governance bodies: bulk-insert documents, then their versions (joined by slug),
-- then the org-unit rows keyed to those versions.
-- Relations are seeded from a typed VALUES list so governance-body-to-governance-body
-- edges can be added alongside the default governance-body-to-ERIC membership rows.
WITH
	"body_documents" AS (
		INSERT INTO
			"entities" ("type_id", "slug")
		SELECT
			"entity_types"."id",
			"tmp"."slug"
		FROM
			(
				VALUES
					('board-of-directors'),
					('dariah-coordination-office'),
					('general-assembly'),
					('joint-research-committee'),
					('national-coordinators-committee'),
					('scientific-advisory-board'),
					('senior-management-team')
			) AS "tmp" ("slug"),
			"entity_types"
		WHERE
			"entity_types"."type" = 'organisational_units'
		RETURNING
			"id",
			"slug"
	),
	"body_versions" AS (
		INSERT INTO
			"entity_versions" ("entity_id", "status_id")
		SELECT
			"body_documents"."id",
			"entity_status"."id"
		FROM
			"body_documents",
			"entity_status"
		WHERE
			"entity_status"."type" = 'published'
		RETURNING
			"id",
			"entity_id"
	),
	"body_units" AS (
		INSERT INTO
			"organisational_units" ("id", "name", "acronym", "summary", "metadata", "type_id")
		SELECT
			"body_versions"."id",
			"tmp"."name",
			"tmp"."acronym",
			'',
			"tmp"."metadata",
			"organisational_unit_types"."id"
		FROM
			(
				VALUES
					('board-of-directors', 'Board of directors', 'bod', '{"type":"executive_body"}'::jsonb),
					('dariah-coordination-office', 'DARIAH coordination office', 'dco', '{"type":"operational_body"}'::jsonb),
					('general-assembly', 'General assembly', 'ga', '{"type":"governing_body"}'::jsonb),
					('joint-research-committee', 'Joint research committee', 'jrc', '{"type":"operational_body"}'::jsonb),
					('national-coordinators-committee', 'National coordinators committee', 'ncc', '{"type":"operational_body"}'::jsonb),
					('scientific-advisory-board', 'Scientific advisory board', 'sab', '{"type":"advisory_body"}'::jsonb),
					('senior-management-team', 'Senior management team', 'smt', '{"type":"advisory_body"}'::jsonb)
			) AS "tmp" ("slug", "name", "acronym", "metadata")
			JOIN "body_documents" ON "body_documents"."slug" = "tmp"."slug"
			JOIN "body_versions" ON "body_versions"."entity_id" = "body_documents"."id"
			CROSS JOIN "organisational_unit_types"
		WHERE
			"organisational_unit_types"."type" = 'governance_body'
		ON CONFLICT ("id") DO NOTHING
		RETURNING
			"id"
	),
	"seeded_relations" AS (
		SELECT
			"unit_versions"."id" AS "unit_id",
			"related_unit_versions"."id" AS "related_unit_id",
			"organisational_unit_status"."id" AS "status",
			"tmp"."duration"
		FROM
			(
				VALUES
					-- @see {@link https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32014D0526}
					('board-of-directors', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('dariah-coordination-office', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('general-assembly', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('joint-research-committee', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('national-coordinators-committee', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('scientific-advisory-board', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('senior-management-team', 'dariah-eu', 'is_part_of', '[2014-08-06,)'::tstzrange),
					('general-assembly', 'board-of-directors', 'appoints', '[2014-08-06,)'::tstzrange),
					('general-assembly', 'scientific-advisory-board', 'appoints', '[2014-08-06,)'::tstzrange),
					('scientific-advisory-board', 'board-of-directors', 'advises', '[2014-08-06,)'::tstzrange),
					('senior-management-team', 'board-of-directors', 'advises', '[2014-08-06,)'::tstzrange),
					('board-of-directors', 'dariah-coordination-office', 'appoints', '[2014-08-06,)'::tstzrange),
					('board-of-directors', 'joint-research-committee', 'appoints', '[2014-08-06,)'::tstzrange),
					('dariah-coordination-office', 'joint-research-committee', 'supports', '[2014-08-06,)'::tstzrange),
					('dariah-coordination-office', 'national-coordinators-committee', 'supports', '[2014-08-06,)'::tstzrange),
					('national-coordinators-committee', 'senior-management-team', 'is_represented_in', '[2014-08-06,)'::tstzrange),
					('joint-research-committee', 'senior-management-team', 'is_represented_in', '[2014-08-06,)'::tstzrange),
					('scientific-advisory-board', 'senior-management-team', 'is_represented_in', '[2014-08-06,)'::tstzrange)
			) AS "tmp" ("unit_slug", "related_unit_slug", "relation_type", "duration")
			JOIN "entities" AS "unit_entities" ON "unit_entities"."slug" = "tmp"."unit_slug"
			JOIN "entity_versions" AS "unit_versions" ON "unit_versions"."entity_id" = "unit_entities"."id"
			JOIN "entities" AS "related_unit_entities" ON "related_unit_entities"."slug" = "tmp"."related_unit_slug"
			JOIN "entity_versions" AS "related_unit_versions" ON "related_unit_versions"."entity_id" = "related_unit_entities"."id"
			JOIN "organisational_unit_status" ON "organisational_unit_status"."status" = "tmp"."relation_type"
	)
INSERT INTO
	"organisational_units_to_units" (
		"unit_id",
		"related_unit_id",
		"status",
		"duration"
	)
SELECT
	"seeded_relations"."unit_id",
	"seeded_relations"."related_unit_id",
	"seeded_relations"."status",
	"seeded_relations"."duration"
FROM
	"seeded_relations"
ON CONFLICT DO NOTHING;
