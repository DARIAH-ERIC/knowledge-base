-- Merge the duplicate `94rj5a` (Persistent Identifier Service) service rows and enforce one
-- service row per sshoc marketplace id going forward.
--
-- `migrate-unr` copied two service rows carrying the same `sshoc_marketplace_id` ('94rj5a'):
--   * the ingest-managed row (`metadata` has an `sshoc` snapshot): the row `ingestSshocServices`
--     updates, holding the curated unit relations;
--   * a sparse duplicate (no `sshoc` snapshot): holding the country-report references.
-- Re-point the country-report references onto the ingest-managed row, drop the duplicate, then add
-- the unique constraint. The ingest-managed row is the correct survivor because it is the row the
-- ingest keys on. The survivor has no country-report references of its own, so re-pointing cannot
-- collide with the `(country_report_id, service_id[, kpi])` unique constraints on those tables.
--
-- '94rj5a' is the only duplicated marketplace id (verified against the post-ingest snapshot); every
-- statement is scoped to it and is idempotent (once the duplicate is gone the subqueries return no
-- row and match nothing). `jsonb_exists(...)` is used instead of the `?` operator to avoid any
-- placeholder-parsing ambiguity.
UPDATE "country_report_services"
SET "service_id" = (
	SELECT "id" FROM "services"
	WHERE "sshoc_marketplace_id" = '94rj5a' AND jsonb_exists("metadata", 'sshoc')
)
WHERE "service_id" = (
	SELECT "id" FROM "services"
	WHERE "sshoc_marketplace_id" = '94rj5a' AND NOT jsonb_exists("metadata", 'sshoc')
);
--> statement-breakpoint
UPDATE "country_report_service_kpis"
SET "service_id" = (
	SELECT "id" FROM "services"
	WHERE "sshoc_marketplace_id" = '94rj5a' AND jsonb_exists("metadata", 'sshoc')
)
WHERE "service_id" = (
	SELECT "id" FROM "services"
	WHERE "sshoc_marketplace_id" = '94rj5a' AND NOT jsonb_exists("metadata", 'sshoc')
);
--> statement-breakpoint
DELETE FROM "services"
WHERE "sshoc_marketplace_id" = '94rj5a' AND NOT jsonb_exists("metadata", 'sshoc');
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'services_sshoc_marketplace_id_unique'
			AND conrelid = 'services'::regclass
	) THEN
		ALTER TABLE "services"
			ADD CONSTRAINT "services_sshoc_marketplace_id_unique"
			UNIQUE ("sshoc_marketplace_id");
	END IF;
END $$;
