CREATE VIEW dariah_projects AS
SELECT DISTINCT
	"projects"."id",
	"projects"."metadata",
	"projects"."name",
	"projects"."summary",
	"projects"."duration",
	"projects"."call",
	"projects"."funders",
	"projects"."topic",
	"projects"."funding",
	"projects"."image_id",
	"projects"."scope_id",
	"projects"."created_at",
	"projects"."updated_at"
FROM
	"projects"
	JOIN "project_partners" ON "project_partners"."project_id" = "projects"."id"
	JOIN "organisational_units" ON "organisational_units"."id" = "project_partners"."unit_id"
	JOIN "organisational_unit_types" ON "organisational_unit_types"."id" = "organisational_units"."type_id"
	AND "organisational_unit_types"."type" = 'umbrella_consortium';
