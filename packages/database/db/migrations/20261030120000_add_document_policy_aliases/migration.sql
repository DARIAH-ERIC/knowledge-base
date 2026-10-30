-- Stable names for documents-policies entries whose current version changes over time. The website
-- serves the current statutes and internal rules of procedure at stable urls, and each version is
-- its own entry, so editors pick which entry an alias points to. A key without a row is not set.
-- The alias references the entity, not an entity version, so republishing the entry keeps it, and
-- deleting the entry removes it.
--
-- Written to run more than once, and on a database that `db:push` has already brought in line with
-- the drizzle schema.

CREATE TABLE IF NOT EXISTS "document_policy_aliases" (
	"key" text PRIMARY KEY NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "document_policy_aliases"
	DROP CONSTRAINT IF EXISTS "document_policy_aliases_entity_id_entities_id_fkey";

--> statement-breakpoint
ALTER TABLE "document_policy_aliases"
	ADD CONSTRAINT "document_policy_aliases_entity_id_entities_id_fkey"
	FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "document_policy_aliases"
	DROP CONSTRAINT IF EXISTS "document_policy_aliases_key_enum_check";

--> statement-breakpoint
ALTER TABLE "document_policy_aliases"
	ADD CONSTRAINT "document_policy_aliases_key_enum_check"
	CHECK ("key" IN ('internal-rules-of-procedure', 'statutes'));
