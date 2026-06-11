INSERT INTO "user_totp_credentials" (
	"user_id",
	"label",
	"encrypted_key",
	"created_at",
	"updated_at"
)
SELECT
	"users"."id",
	'Migrated authenticator',
	"users"."two_factor_totp_key",
	"users"."created_at",
	"users"."created_at"
FROM "users"
WHERE "users"."two_factor_totp_key" IS NOT NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "user_totp_credentials"
		WHERE "user_totp_credentials"."user_id" = "users"."id"
	);
