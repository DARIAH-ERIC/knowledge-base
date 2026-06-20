-- A country report owns an explicit, curated service membership, analogous to its social-media
-- membership. DDL and data changes are deliberately rerunnable: the table is guarded, missing
-- constraints are added by name, and all backfills use ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS "country_report_services" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"country_report_id" uuid NOT NULL,
	"service_id" uuid NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'country_report_services_country_report_id_country_reports_id_fk'
			AND conrelid = 'country_report_services'::regclass
	) THEN
		ALTER TABLE "country_report_services"
			ADD CONSTRAINT "country_report_services_country_report_id_country_reports_id_fk"
			FOREIGN KEY ("country_report_id") REFERENCES "country_reports"("id");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'country_report_services_service_id_services_id_fk'
			AND conrelid = 'country_report_services'::regclass
	) THEN
		ALTER TABLE "country_report_services"
			ADD CONSTRAINT "country_report_services_service_id_services_id_fk"
			FOREIGN KEY ("service_id") REFERENCES "services"("id");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'country_report_services_country_report_id_service_id_unique'
			AND conrelid = 'country_report_services'::regclass
	) THEN
		ALTER TABLE "country_report_services"
			ADD CONSTRAINT "country_report_services_country_report_id_service_id_unique"
			UNIQUE ("country_report_id", "service_id");
	END IF;
END $$;
--> statement-breakpoint
-- Preserve every existing KPI-bearing service, including historical services that are no longer
-- live. This prevents valid report data becoming unreachable after membership becomes explicit.
INSERT INTO "country_report_services" ("country_report_id", "service_id")
SELECT DISTINCT "country_report_id", "service_id"
FROM "country_report_service_kpis"
ON CONFLICT ("country_report_id", "service_id") DO NOTHING;
--> statement-breakpoint
-- Existing editable reports receive the same current-consortium seed as newly created reports.
-- Closed campaigns are not reconstructed from today's mutable relations.
INSERT INTO "country_report_services" ("country_report_id", "service_id")
SELECT DISTINCT cr."id", s."id"
FROM "country_reports" cr
INNER JOIN "reporting_campaigns" campaign
	ON campaign."id" = cr."campaign_id"
INNER JOIN "organisational_units_to_units" unit_relation
	ON unit_relation."related_unit_document_id" = cr."country_document_id"
INNER JOIN "organisational_unit_status" unit_relation_status
	ON unit_relation_status."id" = unit_relation."status"
INNER JOIN "document_lifecycle" consortium_lifecycle
	ON consortium_lifecycle."document_id" = unit_relation."unit_document_id"
INNER JOIN "organisational_units" consortium
	ON consortium."id" = COALESCE(consortium_lifecycle."published_id", consortium_lifecycle."draft_id")
INNER JOIN "organisational_unit_types" consortium_type
	ON consortium_type."id" = consortium."type_id"
INNER JOIN "services_to_organisational_units" service_relation
	ON service_relation."organisational_unit_document_id" = unit_relation."unit_document_id"
INNER JOIN "services" s
	ON s."id" = service_relation."service_id"
INNER JOIN "service_statuses" service_status
	ON service_status."id" = s."status_id"
WHERE campaign."status" = 'open'
	AND unit_relation_status."status" = 'is_national_consortium_of'
	AND consortium_type."type" = 'national_consortium'
	AND service_status."status" = 'live'
	AND unit_relation."duration" && tstzrange(
		MAKE_DATE(campaign."year", 1, 1)::TIMESTAMPTZ,
		MAKE_DATE(campaign."year" + 1, 1, 1)::TIMESTAMPTZ
	)
ON CONFLICT ("country_report_id", "service_id") DO NOTHING;
--> statement-breakpoint
-- Carry live memberships from the immediately previous campaign year into existing editable
-- reports. Before this migration, previous membership consists of the KPI pairs preserved above.
INSERT INTO "country_report_services" ("country_report_id", "service_id")
SELECT DISTINCT current_report."id", previous_membership."service_id"
FROM "country_reports" current_report
INNER JOIN "reporting_campaigns" current_campaign
	ON current_campaign."id" = current_report."campaign_id"
INNER JOIN "reporting_campaigns" previous_campaign
	ON previous_campaign."year" = current_campaign."year" - 1
INNER JOIN "country_reports" previous_report
	ON previous_report."campaign_id" = previous_campaign."id"
	AND previous_report."country_document_id" = current_report."country_document_id"
INNER JOIN "country_report_services" previous_membership
	ON previous_membership."country_report_id" = previous_report."id"
INNER JOIN "services" s
	ON s."id" = previous_membership."service_id"
INNER JOIN "service_statuses" service_status
	ON service_status."id" = s."status_id"
WHERE current_campaign."status" = 'open'
	AND service_status."status" = 'live'
ON CONFLICT ("country_report_id", "service_id") DO NOTHING;
