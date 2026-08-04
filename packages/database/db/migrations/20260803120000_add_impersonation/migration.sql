-- Lets an admin act as another user for a bounded period, so they can see (and fill in) the
-- dashboard exactly as a national coordinator sees it.
--
-- Impersonation is recorded on the session rather than issued as a second credential: `user_id`
-- stays the account that actually authenticated, and `impersonated_user_id` says whom that session
-- is currently acting as. Nothing new is handed to the browser, and ending an impersonation is a
-- single UPDATE.
--
-- Re-running is a no-op.

ALTER TABLE "sessions"
	ADD COLUMN IF NOT EXISTS "impersonated_user_id" uuid,
	ADD COLUMN IF NOT EXISTS "impersonation_expires_at" timestamp(3) with time zone;

-- `SET NULL` rather than `CASCADE`: deleting the impersonated user must end the impersonation, not
-- destroy the impersonating admin's own session.
ALTER TABLE "sessions"
	DROP CONSTRAINT IF EXISTS "sessions_impersonated_user_id_users_id_fk";

ALTER TABLE "sessions"
	ADD CONSTRAINT "sessions_impersonated_user_id_users_id_fk"
	FOREIGN KEY ("impersonated_user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- One-directional so the `SET NULL` above stays legal: it leaves the expiry behind, but every read
-- path keys off `impersonated_user_id`.
ALTER TABLE "sessions"
	DROP CONSTRAINT IF EXISTS "sessions_impersonation_expiry_check";

ALTER TABLE "sessions"
	ADD CONSTRAINT "sessions_impersonation_expiry_check"
	CHECK (
		"impersonated_user_id" IS NULL
		OR "impersonation_expires_at" IS NOT NULL
	);

ALTER TABLE "sessions"
	DROP CONSTRAINT IF EXISTS "sessions_impersonation_not_self_check";

ALTER TABLE "sessions"
	ADD CONSTRAINT "sessions_impersonation_not_self_check"
	CHECK ("impersonated_user_id" IS DISTINCT FROM "user_id");

CREATE INDEX IF NOT EXISTS "sessions_impersonated_user_id_idx"
	ON "sessions" ("impersonated_user_id");

--> statement-breakpoint

-- Events made while impersonating stay attributed to the account they were made under -- which is
-- what the impersonated user expects when reading their own history -- with the admin recorded
-- alongside in `impersonated_by_user_id`.
ALTER TABLE "audit_logs"
	ADD COLUMN IF NOT EXISTS "impersonated_by_user_id" uuid;

ALTER TABLE "audit_logs"
	DROP CONSTRAINT IF EXISTS "audit_logs_impersonated_by_user_id_users_id_fk";

ALTER TABLE "audit_logs"
	ADD CONSTRAINT "audit_logs_impersonated_by_user_id_users_id_fk"
	FOREIGN KEY ("impersonated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Starting and ending an impersonation are themselves auditable events.
ALTER TABLE "audit_logs"
	DROP CONSTRAINT IF EXISTS "audit_logs_action_enum_check";

ALTER TABLE "audit_logs"
	ADD CONSTRAINT "audit_logs_action_enum_check"
	CHECK ("action" IN (
		'create',
		'update',
		'delete',
		'publish',
		'discard_draft',
		'launch',
		'close',
		'sync',
		'ingest',
		'relation_create',
		'relation_end',
		'impersonation_start',
		'impersonation_end'
	));
