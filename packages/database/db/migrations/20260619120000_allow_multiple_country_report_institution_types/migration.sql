ALTER TABLE "country_report_institutions" DROP CONSTRAINT IF EXISTS "country_report_institutions_report_unit_document_unique";
--> statement-breakpoint
ALTER TABLE "country_report_institutions" DROP CONSTRAINT IF EXISTS "country_report_institutions_report_unit_document_type_unique";
--> statement-breakpoint
ALTER TABLE "country_report_institutions" ADD CONSTRAINT "country_report_institutions_report_unit_document_type_unique" UNIQUE ("country_report_id", "organisational_unit_document_id", "representation_type");
--> statement-breakpoint

-- Existing reports were captured while only one representation type could be stored per
-- institution. Reconstruct any missing types from the relations valid during the report year.
INSERT INTO "country_report_institutions" (
	"country_report_id",
	"organisational_unit_document_id",
	"representation_type"
)
SELECT DISTINCT
	"snapshot"."country_report_id",
	"snapshot"."organisational_unit_document_id",
	"eric_status"."status"
FROM "country_report_institutions" "snapshot"
INNER JOIN "country_reports" "report"
	ON "report"."id" = "snapshot"."country_report_id"
INNER JOIN "reporting_campaigns" "campaign"
	ON "campaign"."id" = "report"."campaign_id"
INNER JOIN "organisational_units_to_units" "eric_relation"
	ON "eric_relation"."unit_document_id" = "snapshot"."organisational_unit_document_id"
INNER JOIN "organisational_unit_status" "eric_status"
	ON "eric_status"."id" = "eric_relation"."status"
INNER JOIN "entities" "eric_entity"
	ON "eric_entity"."id" = "eric_relation"."related_unit_document_id"
INNER JOIN "document_lifecycle" "eric_lifecycle"
	ON "eric_lifecycle"."document_id" = "eric_entity"."id"
INNER JOIN "organisational_units" "eric_unit"
	ON "eric_unit"."id" = COALESCE("eric_lifecycle"."draft_id", "eric_lifecycle"."published_id")
INNER JOIN "organisational_unit_types" "eric_type"
	ON "eric_type"."id" = "eric_unit"."type_id"
INNER JOIN "organisational_units_to_units" "located_relation"
	ON "located_relation"."unit_document_id" = "snapshot"."organisational_unit_document_id"
	AND "located_relation"."related_unit_document_id" = "report"."country_document_id"
INNER JOIN "organisational_unit_status" "located_status"
	ON "located_status"."id" = "located_relation"."status"
WHERE "eric_entity"."slug" = 'dariah-eu'
	AND "eric_type"."type" = 'eric'
	AND "eric_status"."status" IN (
		'is_national_coordinating_institution_in',
		'is_national_representative_institution_in',
		'is_partner_institution_of'
	)
	AND "located_status"."status" = 'is_located_in'
	AND "eric_relation"."duration" && tstzrange(
		MAKE_DATE("campaign"."year", 1, 1)::TIMESTAMPTZ,
		MAKE_DATE("campaign"."year" + 1, 1, 1)::TIMESTAMPTZ
	)
ON CONFLICT ON CONSTRAINT "country_report_institutions_report_unit_document_type_unique"
DO NOTHING;
