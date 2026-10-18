-- Admins invite users instead of choosing a password for them: an invited account has no password
-- until its owner follows the emailed link and sets one. Existing accounts all have a password, so
-- nothing changes for them.
ALTER TABLE "users"
	ALTER COLUMN "password_hash" DROP NOT NULL;

--> statement-breakpoint

-- The id is the hash of the emailed token, never the token itself.
CREATE TABLE IF NOT EXISTS "user_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp(3) with time zone NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_user_id_users_id_fk"
		FOREIGN KEY ("user_id")
		REFERENCES "users"("id")
		ON DELETE cascade
		ON UPDATE no action
);

--> statement-breakpoint

-- At most one invitation per user, so that only the most recently sent link works. Sending a new
-- one upserts on this index, which also serialises concurrent resends for the same user.
CREATE UNIQUE INDEX IF NOT EXISTS "user_invitations_user_id_unique"
	ON "user_invitations" ("user_id");
