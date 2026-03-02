INSERT INTO
	"organisational_unit_types" ("type")
VALUES
	('body'),
	('consortium'),
	('institution'),
	('regional_hub'),
	('umbrella_consortium'),
	('working_group');

--> statement-breakpoint
INSERT INTO
	"organisational_unit_status" ("status")
VALUES
	('is_cooperating_partner'),
	('is_member'),
	('is_national_coordinating_institution'),
	('is_national_representative_institution'),
	('is_partner_institution');

--> statement-breakpoint
INSERT INTO
	"organisational_units_allowed_relations" (
		"unit_type_id",
		"related_unit_type_id",
		"relation_type_id"
	)
SELECT
	"unit_types"."id",
	"related_unit_types"."id",
	"relation_types"."id"
FROM
	(
		VALUES
			('consortium', 'umbrella_consortium', 'is_member'),
			(
				'consortium',
				'umbrella_consortium',
				'is_cooperating_partner'
			),
			(
				'institution',
				'consortium',
				'is_national_coordinating_institution'
			),
			(
				'institution',
				'consortium',
				'is_national_representative_institution'
			),
			(
				'institution',
				'consortium',
				'is_partner_institution'
			),
			('consortium', 'regional_hub', 'is_member')
	) AS "tmp" ("unit_type", "related_unit_type", "relation_type")
	JOIN "organisational_unit_types" "unit_types" ON "unit_types"."type" = "tmp"."unit_type"
	JOIN "organisational_unit_types" "related_unit_types" ON "related_unit_types"."type" = "tmp"."related_unit_type"
	JOIN "organisational_unit_status" "relation_types" ON "relation_types"."status" = "tmp"."relation_type"
ON CONFLICT (
	"unit_type_id",
	"related_unit_type_id",
	"relation_type_id"
) DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"entity_types_fields_names" ("entity_type_id", "field_name")
SELECT
	"entity_types"."id",
	"tmp"."field_name"
FROM
	(
		VALUES
			('events', 'content'),
			('impact_case_studies', 'content'),
			('news', 'content'),
			('organisational_units', 'description'),
			('pages', 'content'),
			('persons', 'biography'),
			('spotlight_articles', 'content')
	) AS "tmp" ("entity_type_name", "field_name")
	JOIN "entity_types" ON "tmp"."entity_type_name" = "entity_types"."type"
ON CONFLICT ("entity_type_id", "field_name") DO NOTHING;
