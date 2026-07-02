-- Add the new allowed relations between organisational-unit types.
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
			('institution', 'institution', 'is_part_of'),
			('institution', 'national_consortium', 'is_observer_of')
	) AS "tmp" ("unit_type", "related_unit_type", "relation_type")
	JOIN "organisational_unit_types" "unit_types" ON "unit_types"."type" = "tmp"."unit_type"
	JOIN "organisational_unit_types" "related_unit_types" ON "related_unit_types"."type" = "tmp"."related_unit_type"
	JOIN "organisational_unit_status" "relation_types" ON "relation_types"."status" = "tmp"."relation_type"
ON CONFLICT ("unit_type_id", "related_unit_type_id", "relation_type_id") DO NOTHING;

--> statement-breakpoint
-- Allow people to chair national consortia.
INSERT INTO
	"person_role_types_to_organisational_unit_types" ("role_type_id", "unit_type_id")
SELECT
	"role_types"."id",
	"unit_types"."id"
FROM
	"person_role_types" "role_types"
	CROSS JOIN "organisational_unit_types" "unit_types"
WHERE
	"role_types"."type" = 'is_chair_of'
	AND "unit_types"."type" = 'national_consortium'
ON CONFLICT ("role_type_id", "unit_type_id") DO NOTHING;
