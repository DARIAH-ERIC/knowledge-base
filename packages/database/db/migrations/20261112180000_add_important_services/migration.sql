-- "Very large" services become "important" services. They are no longer matched by a visits
-- threshold: the country reporter marks them by hand on each report, because some services that
-- matter (in terms of investment) do not track visits or do not reach the large threshold.
--
-- Existing reports keep their totals: a service whose visits reached its campaign's very large
-- threshold is marked important. The "very_large" value stays allowed for now, so code from before
-- this change still works against the new schema. Safe to run again: once no "very_large" rows are
-- left, the backfill and the rename do nothing.
ALTER TABLE "country_report_services" ADD COLUMN IF NOT EXISTS "is_important" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "reporting_campaign_service_sizes" DROP CONSTRAINT IF EXISTS "reporting_campaign_service_sizes_service_size_enum_check";
--> statement-breakpoint
ALTER TABLE "reporting_campaign_service_sizes" ADD CONSTRAINT "reporting_campaign_service_sizes_service_size_enum_check" CHECK ("service_size" IN ('small', 'medium', 'large', 'very_large', 'important', 'core'));
--> statement-breakpoint
UPDATE "country_report_services" AS "crs"
SET "is_important" = true
FROM
	"country_reports" AS "cr",
	"reporting_campaign_service_sizes" AS "size",
	"country_report_service_kpis" AS "kpi",
	"services" AS "s",
	"service_types" AS "st"
WHERE "cr"."id" = "crs"."country_report_id"
	AND "size"."campaign_id" = "cr"."campaign_id"
	AND "size"."service_size" = 'very_large'
	AND "size"."visits_threshold" IS NOT NULL
	AND "kpi"."country_report_id" = "crs"."country_report_id"
	AND "kpi"."service_id" = "crs"."service_id"
	AND "kpi"."kpi" = 'visits'
	AND "kpi"."value" >= "size"."visits_threshold"
	AND "s"."id" = "crs"."service_id"
	AND "st"."id" = "s"."type_id"
	AND "st"."type" <> 'core';
--> statement-breakpoint
UPDATE "reporting_campaign_service_sizes" AS "size"
SET "service_size" = 'important', "visits_threshold" = NULL
WHERE "size"."service_size" = 'very_large'
	AND NOT EXISTS (
		SELECT 1
		FROM "reporting_campaign_service_sizes" AS "other"
		WHERE "other"."campaign_id" = "size"."campaign_id"
			AND "other"."service_size" = 'important'
	);
