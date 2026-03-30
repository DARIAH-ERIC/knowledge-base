CREATE VIEW dariah_projects AS
SELECT DISTINCT
	"projects"."id",
	"projects"."metadata",
	"projects"."name",
	"projects"."summary",
	"projects"."duration",
	"projects"."call",
	"projects"."topic",
	"projects"."funding",
	"projects"."image_id",
	"projects"."scope_id",
	"projects"."created_at",
	"projects"."updated_at"
FROM
	"projects"
	JOIN "projects_to_organisational_units" ON "projects_to_organisational_units"."project_id" = "projects"."id"
	JOIN "organisational_units" ON "organisational_units"."id" = "projects_to_organisational_units"."unit_id"
	JOIN "organisational_unit_types" ON "organisational_unit_types"."id" = "organisational_units"."type_id"
	AND "organisational_unit_types"."type" = 'umbrella_consortium';
