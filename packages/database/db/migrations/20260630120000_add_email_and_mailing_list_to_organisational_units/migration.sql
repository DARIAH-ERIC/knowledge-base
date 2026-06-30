ALTER TABLE "organisational_units"
	ADD COLUMN IF NOT EXISTS "email" text;

--> statement-breakpoint

ALTER TABLE "organisational_units"
	ADD COLUMN IF NOT EXISTS "mailing_list" text;

--> statement-breakpoint

-- Promote the legacy working-group contact fields out of the `metadata` jsonb blob
-- into dedicated columns (mirrors `persons.email`).
UPDATE "organisational_units"
SET
	"email" = NULLIF("metadata" ->> 'contactEmail', ''),
	"mailing_list" = NULLIF("metadata" ->> 'mailingList', '')
WHERE
	"metadata" ? 'contactEmail'
	OR "metadata" ? 'mailingList';

--> statement-breakpoint

UPDATE "organisational_units"
SET "metadata" = "metadata" - 'contactEmail' - 'mailingList'
WHERE
	"metadata" ? 'contactEmail'
	OR "metadata" ? 'mailingList';

--> statement-breakpoint

DROP VIEW IF EXISTS working_groups;

--> statement-breakpoint

CREATE VIEW working_groups AS
SELECT
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."acronym",
	"units"."summary",
	"units"."email",
	"units"."mailing_list",
	"units"."updated_at",
	"units"."image_id",
	"units"."sshoc_marketplace_actor_id",
	"unit_types"."type",
	"unit_status"."status"
FROM
	"organisational_units" "units"
	JOIN "entity_versions" "units_v" ON "units_v"."id" = "units"."id"
	JOIN "entity_status" "units_s" ON "units_s"."id" = "units_v"."status_id"
	AND "units_s"."type" = 'published'
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id"
	AND "unit_types"."type" = 'working_group'
	JOIN "organisational_units_to_units" "units_to_units" ON "units_to_units"."unit_document_id" = "units_v"."entity_id"
	JOIN "organisational_unit_status" "unit_status" ON "unit_status"."id" = "units_to_units"."status"
GROUP BY
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."acronym",
	"units"."summary",
	"units"."email",
	"units"."mailing_list",
	"units"."updated_at",
	"unit_types"."type",
	"units"."image_id",
	"units"."sshoc_marketplace_actor_id",
	"unit_status"."status";
