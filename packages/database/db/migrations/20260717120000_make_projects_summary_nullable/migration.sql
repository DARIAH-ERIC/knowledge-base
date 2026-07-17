DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'projects'
			AND column_name = 'summary'
			AND is_nullable = 'NO'
	) THEN
		ALTER TABLE "projects" ALTER COLUMN "summary" DROP NOT NULL;
	END IF;
END $$;
