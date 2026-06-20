-- Freeze the chair relations and chair/vice-chair role captured by each working-group report.
-- Rerunnable: DDL is guarded and the backfill is conflict-safe.

CREATE TABLE IF NOT EXISTS "working_group_report_chairs" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"working_group_report_id" uuid NOT NULL,
	"person_to_org_unit_id" uuid NOT NULL,
	"chair_role" text NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'working_group_report_chairs_working_group_report_id_working_group_reports_id_fk'
			AND conrelid = 'working_group_report_chairs'::regclass
	) THEN
		ALTER TABLE "working_group_report_chairs"
			ADD CONSTRAINT "working_group_report_chairs_working_group_report_id_working_group_reports_id_fk"
			FOREIGN KEY ("working_group_report_id") REFERENCES "working_group_reports"("id");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'working_group_report_chairs_person_to_org_unit_id_persons_to_organisational_units_id_fk'
			AND conrelid = 'working_group_report_chairs'::regclass
	) THEN
		ALTER TABLE "working_group_report_chairs"
			ADD CONSTRAINT "working_group_report_chairs_person_to_org_unit_id_persons_to_organisational_units_id_fk"
			FOREIGN KEY ("person_to_org_unit_id") REFERENCES "persons_to_organisational_units"("id");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'working_group_report_chairs_working_group_report_id_person_to_org_unit_id_unique'
			AND conrelid = 'working_group_report_chairs'::regclass
	) THEN
		ALTER TABLE "working_group_report_chairs"
			ADD CONSTRAINT "working_group_report_chairs_working_group_report_id_person_to_org_unit_id_unique"
			UNIQUE ("working_group_report_id", "person_to_org_unit_id");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'working_group_report_chairs_role_enum_check'
			AND conrelid = 'working_group_report_chairs'::regclass
	) THEN
		ALTER TABLE "working_group_report_chairs"
			ADD CONSTRAINT "working_group_report_chairs_role_enum_check"
			CHECK ("chair_role" IN ('is_chair_of', 'is_vice_chair_of'));
	END IF;
END $$;
--> statement-breakpoint
-- Existing reports did not persist chairs. Capture the chair relations currently active during
-- each report's campaign year; exact historical relation state cannot be reconstructed.
INSERT INTO "working_group_report_chairs" (
	"working_group_report_id",
	"person_to_org_unit_id",
	"chair_role"
)
SELECT DISTINCT
	report."id",
	relation."id",
	role_type."type"
FROM "working_group_reports" report
INNER JOIN "reporting_campaigns" campaign
	ON campaign."id" = report."campaign_id"
INNER JOIN "persons_to_organisational_units" relation
	ON relation."organisational_unit_document_id" = report."working_group_document_id"
INNER JOIN "person_role_types" role_type
	ON role_type."id" = relation."role_type_id"
WHERE role_type."type" IN ('is_chair_of', 'is_vice_chair_of')
	AND relation."duration" && tstzrange(
		MAKE_DATE(campaign."year", 1, 1)::TIMESTAMPTZ,
		MAKE_DATE(campaign."year" + 1, 1, 1)::TIMESTAMPTZ
	)
ON CONFLICT ("working_group_report_id", "person_to_org_unit_id") DO NOTHING;
