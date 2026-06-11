CREATE TABLE IF NOT EXISTS "country_report_social_media" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"country_report_id" uuid NOT NULL,
	"social_media_id" uuid NOT NULL,
	CONSTRAINT "country_report_social_media_country_report_id_country_reports_id_fk"
		FOREIGN KEY ("country_report_id")
		REFERENCES "country_reports"("id")
		ON DELETE no action
		ON UPDATE no action,
	CONSTRAINT "country_report_social_media_social_media_id_social_media_id_fk"
		FOREIGN KEY ("social_media_id")
		REFERENCES "social_media"("id")
		ON DELETE no action
		ON UPDATE no action,
	CONSTRAINT "country_report_social_media_country_report_id_social_media_id_unique"
		UNIQUE ("country_report_id", "social_media_id")
);
--> statement-breakpoint
-- Backfill membership for existing reports from the (report, account) pairs that already have KPIs,
-- so reports created before this table keep showing their accounts. Idempotent.
INSERT INTO "country_report_social_media" ("country_report_id", "social_media_id")
SELECT DISTINCT "country_report_id", "social_media_id"
FROM "country_report_social_media_kpis"
ON CONFLICT ("country_report_id", "social_media_id") DO NOTHING;
