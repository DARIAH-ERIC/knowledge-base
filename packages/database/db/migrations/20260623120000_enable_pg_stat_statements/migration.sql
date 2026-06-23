-- Enable pg_stat_statements so the internal admin dashboard can list the most expensive queries.
--
-- `CREATE EXTENSION` raises an error (it does not silently skip) when the module is not in
-- `shared_preload_libraries`, which would break migrations on databases where it has not been
-- preloaded (e.g. local dev / CI). We therefore attempt it inside an exception-trapping block: the
-- extension is created wherever the library is available and skipped (with a notice) elsewhere. The
-- dashboard degrades gracefully when the view is unavailable.
--
-- NOTE: enabling it in production still requires `shared_preload_libraries=pg_stat_statements` in
-- the Postgres configuration plus a server restart — this migration only creates the extension.

DO $$
BEGIN
	CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EXCEPTION
	WHEN OTHERS THEN
		RAISE NOTICE 'Skipping pg_stat_statements extension: %', SQLERRM;
END
$$;
