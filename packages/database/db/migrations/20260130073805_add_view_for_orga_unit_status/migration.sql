CREATE VIEW members_and_partners AS
SELECT
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
	"units"."image_id",
	"unit_types"."type",
	"unit_status"."status"
FROM
	"organisational_units" "units"
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id"
	AND "unit_types"."type" IN ('consortium')
	JOIN "organisational_units_to_units" "units_to_units" ON "units"."id" = "units_to_units"."unit_id"
	AND "units_to_units"."duration" @> NOW()
	JOIN "organisational_unit_status" "unit_status" ON "unit_status"."id" = "units_to_units"."status"
GROUP BY
	"units"."id",
	"units"."metadata",
	"units"."name",
	"unit_types"."type",
	"units"."image_id",
	"unit_status"."status"
