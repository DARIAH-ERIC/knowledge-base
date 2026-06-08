DELETE FROM "sessions"
USING "users"
WHERE "sessions"."user_id" = "users"."id"
	AND "sessions"."is_two_factor_verified" = true
	AND "sessions"."two_factor_credential_id" IS NULL
	AND (
		"users"."two_factor_totp_key" IS NOT NULL
		OR EXISTS (
			SELECT 1
			FROM "user_totp_credentials"
			WHERE "user_totp_credentials"."user_id" = "users"."id"
		)
	);
