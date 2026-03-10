CREATE VIEW working_groups AS
SELECT
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
	"units"."image_id"
FROM
	"organisational_units" "units"
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id"
	AND "unit_types"."type" = 'working_group';
