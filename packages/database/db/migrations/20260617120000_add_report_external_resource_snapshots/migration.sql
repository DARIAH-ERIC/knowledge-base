CREATE TABLE IF NOT EXISTS "report_external_resource_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"country_report_id" uuid,
	"working_group_report_id" uuid,
	"section" text NOT NULL,
	"filter_by" text NOT NULL,
	"actor_slugs" jsonb NOT NULL,
	"captured_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"captured_by_user_id" uuid,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_external_resource_snapshot_items" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"search_document_id" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"source_updated_at" bigint,
	"imported_at" bigint NOT NULL,
	"type" text NOT NULL,
	"sshoc_category" text,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"keywords" jsonb NOT NULL,
	"kind" text,
	"links" jsonb NOT NULL,
	"authors" jsonb,
	"year" integer,
	"pid" text
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_country_report_id_country_reports_id_fk'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_country_report_id_country_reports_id_fk"
			FOREIGN KEY ("country_report_id")
			REFERENCES "country_reports"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_working_group_report_id_working_group_reports_id_fk'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_working_group_report_id_working_group_reports_id_fk"
			FOREIGN KEY ("working_group_report_id")
			REFERENCES "working_group_reports"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_captured_by_user_id_users_id_fk'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_captured_by_user_id_users_id_fk"
			FOREIGN KEY ("captured_by_user_id")
			REFERENCES "users"("id")
			ON DELETE no action
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_section_enum_check'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_section_enum_check"
			CHECK (
				"section" IN (
					'country_sshoc_resources',
					'country_zotero_publications',
					'working_group_sshoc_resources',
					'working_group_zotero_publications'
				)
			);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_report_owner_xor_check'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_report_owner_xor_check"
			CHECK (
				(
					CASE WHEN "country_report_id" IS NULL THEN 0 ELSE 1 END
					+ CASE WHEN "working_group_report_id" IS NULL THEN 0 ELSE 1 END
				) = 1
			);
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_country_report_section_unique'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_country_report_section_unique"
			UNIQUE ("country_report_id", "section");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshots"'::regclass
			AND conname = 'report_external_resource_snapshots_working_group_report_section_unique'
	) THEN
		ALTER TABLE "report_external_resource_snapshots"
			ADD CONSTRAINT "report_external_resource_snapshots_working_group_report_section_unique"
			UNIQUE ("working_group_report_id", "section");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshot_items"'::regclass
			AND conname = 'report_external_resource_snapshot_items_snapshot_id_report_external_resource_snapshots_id_fk'
	) THEN
		ALTER TABLE "report_external_resource_snapshot_items"
			ADD CONSTRAINT "report_external_resource_snapshot_items_snapshot_id_report_external_resource_snapshots_id_fk"
			FOREIGN KEY ("snapshot_id")
			REFERENCES "report_external_resource_snapshots"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshot_items"'::regclass
			AND conname = 'report_external_resource_snapshot_items_snapshot_document_unique'
	) THEN
		ALTER TABLE "report_external_resource_snapshot_items"
			ADD CONSTRAINT "report_external_resource_snapshot_items_snapshot_document_unique"
			UNIQUE ("snapshot_id", "search_document_id");
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conrelid = '"report_external_resource_snapshot_items"'::regclass
			AND conname = 'report_external_resource_snapshot_items_snapshot_position_unique'
	) THEN
		ALTER TABLE "report_external_resource_snapshot_items"
			ADD CONSTRAINT "report_external_resource_snapshot_items_snapshot_position_unique"
			UNIQUE ("snapshot_id", "position");
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_external_resource_snapshots_country_report_id_idx"
	ON "report_external_resource_snapshots" ("country_report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_external_resource_snapshots_working_group_report_id_idx"
	ON "report_external_resource_snapshots" ("working_group_report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_external_resource_snapshot_items_snapshot_id_idx"
	ON "report_external_resource_snapshot_items" ("snapshot_id");
