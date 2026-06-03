INSERT INTO
	"person_role_types" ("type")
VALUES
	('national_coordination_staff')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"person_role_types_to_organisational_unit_types" ("role_type_id", "unit_type_id")
SELECT
	"role_types"."id",
	"unit_types"."id"
FROM
	(
		VALUES
			('national_coordination_staff', 'country')
	) AS "tmp" ("role_type", "unit_type")
	JOIN "person_role_types" "role_types" ON "role_types"."type" = "tmp"."role_type"
	JOIN "organisational_unit_types" "unit_types" ON "unit_types"."type" = "tmp"."unit_type"
ON CONFLICT ("role_type_id", "unit_type_id") DO NOTHING;
