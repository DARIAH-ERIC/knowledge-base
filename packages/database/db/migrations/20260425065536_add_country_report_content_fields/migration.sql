ALTER TABLE "country_reports"
	ADD COLUMN "total_contributors" integer,
	ADD COLUMN "small_events" integer,
	ADD COLUMN "medium_events" integer,
	ADD COLUMN "large_events" integer,
	ADD COLUMN "dariah_commissioned_event" text,
	ADD COLUMN "reusable_outcomes" text;

--> statement-breakpoint

CREATE TABLE "country_report_contributions" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7(),
	"country_report_id" uuid NOT NULL,
	"person_to_org_unit_id" uuid NOT NULL,
	CONSTRAINT "country_report_contributions_country_report_id_person_to_org_unit_id_unique" UNIQUE("country_report_id","person_to_org_unit_id")
);

--> statement-breakpoint

ALTER TABLE "country_report_contributions"
	ADD CONSTRAINT "country_report_contributions_country_report_id_country_reports_id_fk"
		FOREIGN KEY ("country_report_id") REFERENCES "country_reports"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "country_report_contributions"
	ADD CONSTRAINT "country_report_contributions_person_to_org_unit_id_persons_to_organisational_units_id_fk"
		FOREIGN KEY ("person_to_org_unit_id") REFERENCES "persons_to_organisational_units"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

CREATE TABLE "country_report_social_media_kpis" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7(),
	"country_report_id" uuid NOT NULL,
	"social_media_id" uuid NOT NULL,
	"kpi" text NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "country_report_social_media_kpis_country_report_id_social_media_id_kpi_unique" UNIQUE("country_report_id","social_media_id","kpi"),
	CONSTRAINT "country_report_social_media_kpis_kpi_enum_check" CHECK ("kpi" in ('engagement', 'followers', 'impressions', 'mentions', 'new_content', 'page_views', 'posts', 'reach', 'subscribers', 'unique_visitors', 'views', 'watch_time'))
);

--> statement-breakpoint

ALTER TABLE "country_report_social_media_kpis"
	ADD CONSTRAINT "country_report_social_media_kpis_country_report_id_country_reports_id_fk"
		FOREIGN KEY ("country_report_id") REFERENCES "country_reports"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "country_report_social_media_kpis"
	ADD CONSTRAINT "country_report_social_media_kpis_social_media_id_social_media_id_fk"
		FOREIGN KEY ("social_media_id") REFERENCES "social_media"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

CREATE TABLE "country_report_service_kpis" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7(),
	"country_report_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"kpi" text NOT NULL,
	"value" integer NOT NULL,
	CONSTRAINT "country_report_service_kpis_country_report_id_service_id_kpi_unique" UNIQUE("country_report_id","service_id","kpi"),
	CONSTRAINT "country_report_service_kpis_kpi_enum_check" CHECK ("kpi" in ('downloads', 'hits', 'items', 'jobs_processed', 'page_views', 'registered_users', 'searches', 'sessions', 'unique_users', 'visits', 'websites_hosted'))
);

--> statement-breakpoint

ALTER TABLE "country_report_service_kpis"
	ADD CONSTRAINT "country_report_service_kpis_country_report_id_country_reports_id_fk"
		FOREIGN KEY ("country_report_id") REFERENCES "country_reports"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "country_report_service_kpis"
	ADD CONSTRAINT "country_report_service_kpis_service_id_services_id_fk"
		FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

CREATE TABLE "country_report_project_contributions" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7(),
	"country_report_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"amount_euros" numeric(12,2) NOT NULL,
	CONSTRAINT "country_report_project_contributions_country_report_id_project_id_unique" UNIQUE("country_report_id","project_id")
);

--> statement-breakpoint

ALTER TABLE "country_report_project_contributions"
	ADD CONSTRAINT "country_report_project_contributions_country_report_id_country_reports_id_fk"
		FOREIGN KEY ("country_report_id") REFERENCES "country_reports"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint

ALTER TABLE "country_report_project_contributions"
	ADD CONSTRAINT "country_report_project_contributions_project_id_projects_id_fk"
		FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;
