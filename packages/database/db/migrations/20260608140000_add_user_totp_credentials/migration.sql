CREATE TABLE IF NOT EXISTS "user_totp_credentials" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"encrypted_key" bytea NOT NULL,
	"last_used_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'user_totp_credentials_user_id_users_id_fk'
			AND conrelid = 'user_totp_credentials'::regclass
	) THEN
		ALTER TABLE "user_totp_credentials"
			ADD CONSTRAINT "user_totp_credentials_user_id_users_id_fk"
			FOREIGN KEY ("user_id")
			REFERENCES "users"("id")
			ON DELETE cascade
			ON UPDATE no action;
	END IF;
END
$$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_totp_credentials_user_id_idx"
	ON "user_totp_credentials" USING btree ("user_id");

--> statement-breakpoint
ALTER TABLE "sessions"
	ADD COLUMN IF NOT EXISTS "two_factor_credential_id" uuid;

--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'sessions_two_factor_credential_id_user_totp_credentials_id_fk'
			AND conrelid = 'sessions'::regclass
	) THEN
		ALTER TABLE "sessions"
			ADD CONSTRAINT "sessions_two_factor_credential_id_user_totp_credentials_id_fk"
			FOREIGN KEY ("two_factor_credential_id")
			REFERENCES "user_totp_credentials"("id")
			ON DELETE set null
			ON UPDATE no action;
	END IF;
END
$$;

--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'sessions_unverified_credential_null_check'
			AND conrelid = 'sessions'::regclass
	) THEN
		ALTER TABLE "sessions"
			ADD CONSTRAINT "sessions_unverified_credential_null_check"
			CHECK ("is_two_factor_verified" OR "two_factor_credential_id" IS NULL);
	END IF;
END
$$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_two_factor_credential_id_idx"
	ON "sessions" USING btree ("two_factor_credential_id");
