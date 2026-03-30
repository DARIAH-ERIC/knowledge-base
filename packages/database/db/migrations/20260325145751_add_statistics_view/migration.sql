CREATE VIEW statistics AS
SELECT
	"unit_types"."type",
	"unit_status"."status",
	COUNT(*) AS "total"
FROM
	"organisational_units" "units"
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id"
	AND "unit_types"."type" IN ('consortium', 'institution', 'working_group')
	JOIN "organisational_units_to_units" "units_to_units" ON "units"."id" = "units_to_units"."unit_id"
	AND "units_to_units"."duration" @> NOW()
	JOIN "organisational_unit_status" "unit_status" ON "unit_status"."id" = "units_to_units"."status"
GROUP BY
	"unit_types"."type",
	"unit_status"."status";
