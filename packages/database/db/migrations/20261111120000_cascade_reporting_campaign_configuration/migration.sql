-- A reporting campaign's configuration (amounts, thresholds, working group report questions) belongs
-- to the campaign, so deleting a campaign deletes it too. Country and working group reports still
-- reference the campaign without a cascade, so a campaign with reports cannot be deleted.
--
-- The existing foreign keys may carry drizzle's old `_fk` names or its current hashed `_fkey` names,
-- so each one is looked up in the catalog, dropped, and re-added under the name `db:push` generates.
-- Safe to run again.
DO $$
DECLARE
	target record;
	existing record;
BEGIN
	FOR target IN
		SELECT *
		FROM (
			VALUES
				('working_group_report_questions', 'working_group_report_questions_tk2oUQamvzJk_fkey'),
				('reporting_campaign_event_amounts', 'reporting_campaign_event_amounts_byz19OQ5p7cA_fkey'),
				('reporting_campaign_social_media_amounts', 'reporting_campaign_social_media_amounts_zeHcsUOkdLDW_fkey'),
				('reporting_campaign_contribution_amounts', 'reporting_campaign_contribution_amounts_9NAMXZnsMjDE_fkey'),
				('reporting_campaign_service_sizes', 'reporting_campaign_service_sizes_SF6Y7uUkO7Km_fkey'),
				('reporting_campaign_country_thresholds', 'reporting_campaign_country_thresholds_rKFwM4dtItJF_fkey')
		) AS targets (table_name, constraint_name)
	LOOP
		FOR existing IN
			SELECT c.conname
			FROM pg_constraint c
			JOIN pg_class t ON t.oid = c.conrelid
			JOIN pg_namespace n ON n.oid = t.relnamespace
			JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
			WHERE c.contype = 'f'
				AND n.nspname = current_schema()
				AND t.relname = target.table_name
				AND c.confrelid = to_regclass('reporting_campaigns')
				AND a.attname = 'campaign_id'
		LOOP
			EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', target.table_name, existing.conname);
		END LOOP;

		EXECUTE format(
			'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("campaign_id") REFERENCES "reporting_campaigns"("id") ON DELETE CASCADE',
			target.table_name,
			target.constraint_name
		);
	END LOOP;
END $$;
