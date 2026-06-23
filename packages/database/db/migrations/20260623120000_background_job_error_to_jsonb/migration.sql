-- Store the structured `BackgroundJobError` shape in `background_jobs.error` instead of a raw
-- stack-trace string, so the admin dashboard can render a localized message. Existing rows hold
-- legacy plain-text errors which are not valid JSON, so wrap them in the `unknown` variant rather
-- than casting directly (which would fail on non-JSON text).
--
-- Guarded so the migration is idempotent: re-running it once `error` is already jsonb would
-- otherwise double-wrap existing values.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'background_jobs'
			AND column_name = 'error'
			AND data_type <> 'jsonb'
	) THEN
		ALTER TABLE "background_jobs"
			ALTER COLUMN "error" TYPE jsonb
			USING (
				CASE
					WHEN "error" IS NULL THEN NULL
					ELSE jsonb_build_object('kind', 'unknown', 'message', "error")
				END
			);
	END IF;
END $$;
