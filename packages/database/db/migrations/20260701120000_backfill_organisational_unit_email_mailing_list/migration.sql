-- Recover organisational-unit `email` + `mailing_list` values that were dropped from PUBLISHED
-- versions by a bug in the lifecycle adapter: `replaceSubtype` (on publish) and `cloneSubtype`
-- (on draft creation) copied a hardcoded column list between versions that omitted `email` and
-- `mailing_list`. The admin/chair edit still wrote the values onto the DRAFT version row, and
-- publishing does not delete the draft, so the values survive there and can be copied across.
--
-- Conservative + idempotent: only fills NULLs on the published row, and only from a draft that
-- actually holds a value. Never overwrites a published value that is already set. Units whose
-- draft was discarded after the buggy publish (value lost on both rows) cannot be recovered.
UPDATE "organisational_units" AS "pub"
SET
	"email" = COALESCE("pub"."email", "dft"."email"),
	"mailing_list" = COALESCE("pub"."mailing_list", "dft"."mailing_list")
FROM
	"entity_versions" AS "pub_v"
	JOIN "entity_status" AS "pub_s" ON "pub_s"."id" = "pub_v"."status_id"
	AND "pub_s"."type" = 'published'
	JOIN "entity_versions" AS "dft_v" ON "dft_v"."entity_id" = "pub_v"."entity_id"
	JOIN "entity_status" AS "dft_s" ON "dft_s"."id" = "dft_v"."status_id"
	AND "dft_s"."type" = 'draft'
	JOIN "organisational_units" AS "dft" ON "dft"."id" = "dft_v"."id"
WHERE
	"pub"."id" = "pub_v"."id"
	AND (
		"pub"."email" IS NULL
		OR "pub"."mailing_list" IS NULL
	)
	AND (
		"dft"."email" IS NOT NULL
		OR "dft"."mailing_list" IS NOT NULL
	);
