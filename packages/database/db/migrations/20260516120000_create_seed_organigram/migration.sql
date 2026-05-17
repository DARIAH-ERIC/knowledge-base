-- Seed-only migration.
-- Schema objects for organigram tables are created via `db:push`, so this file
-- must stay idempotent and avoid DDL that would fail when the tables already exist.

INSERT INTO
	"organigram_nodes" ("slug", "label", "kind", "entity_id", "position")
SELECT
	"tmp"."slug",
	"tmp"."label",
	'governance_body',
	"entities"."id",
	"tmp"."position"
FROM
	(
		VALUES
			('general-assembly', 'General assembly', 0),
			('board-of-directors', 'Board of directors', 1),
			('scientific-advisory-board', 'Scientific advisory board', 2),
			('senior-management-team', 'Senior management team', 3),
			('dariah-coordination-office', 'DARIAH coordination office', 4),
			('joint-research-committee', 'Joint research committee', 5),
			('national-coordinators-committee', 'National coordinators committee', 6)
	) AS "tmp" ("slug", "label", "position")
	JOIN "entities" ON "entities"."slug" = "tmp"."slug"
	JOIN "entity_versions" ON "entity_versions"."entity_id" = "entities"."id"
	JOIN "organisational_units" ON "organisational_units"."id" = "entity_versions"."id"
	JOIN "organisational_unit_types" ON "organisational_unit_types"."id" = "organisational_units"."type_id"
WHERE
	"organisational_unit_types"."type" = 'governance_body'
ON CONFLICT ("slug") DO NOTHING;

--> statement-breakpoint

INSERT INTO
	"organigram_nodes" ("slug", "label", "description", "kind", "position")
VALUES
	('working-groups', 'Working groups', '', 'collective', 7)
ON CONFLICT ("slug") DO NOTHING;

--> statement-breakpoint

INSERT INTO
	"organigram_edges" ("from_node_id", "to_node_id", "relation", "position")
SELECT
	"from_node"."id",
	"to_node"."id",
	'oversees',
	0
FROM
	"organigram_nodes" AS "from_node",
	"organigram_nodes" AS "to_node"
WHERE
	"from_node"."slug" = 'joint-research-committee'
	AND "to_node"."slug" = 'working-groups'
ON CONFLICT ("from_node_id", "to_node_id", "relation") DO NOTHING;
