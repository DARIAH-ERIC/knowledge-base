CREATE TABLE "organigram_nodes" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"entity_id" uuid,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "organigram_nodes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organigram_nodes_entity_id_unique" UNIQUE("entity_id"),
	CONSTRAINT "organigram_nodes_kind_enum_check" CHECK ("organigram_nodes"."kind" IN ('governance_body', 'collective'))
);

--> statement-breakpoint

ALTER TABLE "organigram_nodes"
ADD CONSTRAINT "organigram_nodes_entity_id_entities_id_fk"
FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

--> statement-breakpoint

CREATE TABLE "organigram_edges" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"from_node_id" uuid NOT NULL,
	"to_node_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "organigram_edges_relation_enum_check" CHECK ("organigram_edges"."relation" IN ('appoints', 'advises', 'oversees', 'supports', 'is_represented_in')),
	CONSTRAINT "organigram_edges_from_node_id_to_node_id_relation_unique" UNIQUE("from_node_id", "to_node_id", "relation")
);

--> statement-breakpoint

ALTER TABLE "organigram_edges"
ADD CONSTRAINT "organigram_edges_from_node_id_organigram_nodes_id_fk"
FOREIGN KEY ("from_node_id") REFERENCES "public"."organigram_nodes"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

--> statement-breakpoint

ALTER TABLE "organigram_edges"
ADD CONSTRAINT "organigram_edges_to_node_id_organigram_nodes_id_fk"
FOREIGN KEY ("to_node_id") REFERENCES "public"."organigram_nodes"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

--> statement-breakpoint

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
