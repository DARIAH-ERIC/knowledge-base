-- Retire the `external_links` entity type. It was added alongside `documents_policies` on the
-- shared "content card" shape (title + summary + image, all NOT NULL), but authoring for it was
-- never built: no dashboard detail page, no lifecycle adapter, no write path anywhere, and it was
-- excluded from related-entity listings and website search. Menus link out via
-- `navigation_items.href` + `is_external` rather than through an entity, so nothing referenced it.
-- Production holds zero rows, so this drops an empty table. Idempotent: re-runs find nothing.

-- Content, not scaffolding: if any environment does hold rows, fail loudly instead of discarding
-- them silently. Nothing points at `external_links`, so an FK violation would not catch this.
DO $$
DECLARE
	"existing" bigint;
BEGIN
	SELECT count(*) INTO "existing"
	FROM "entities"
		JOIN "entity_types" ON "entity_types"."id" = "entities"."type_id"
	WHERE "entity_types"."type" = 'external_links';

	IF "existing" > 0 THEN
		RAISE EXCEPTION
			'Refusing to drop external_links: % entity/entities exist. Migrate or delete them first.',
			"existing";
	END IF;
END $$;

--> statement-breakpoint
DROP TABLE IF EXISTS "external_links";

--> statement-breakpoint
-- Field-name tuples are seeded per entity type and outlive the subtype table, so they have to go
-- before the `entity_types` row they reference. The guard above proves no `fields` rows hang off
-- these, since a `fields` row requires an entity version, and no entities of this type exist.
DELETE FROM "entity_types_fields_names"
WHERE "entity_type_id" IN (
	SELECT "id" FROM "entity_types" WHERE "type" = 'external_links'
);

--> statement-breakpoint
DELETE FROM "entity_types" WHERE "type" = 'external_links';

--> statement-breakpoint
-- Narrow the enum CHECK to match the schema. `db:push` keeps this in sync in development, but
-- deployment only runs `db:migrations:apply`, so it has to happen here.
ALTER TABLE "entity_types" DROP CONSTRAINT IF EXISTS "entity_types_type_enum_check";

--> statement-breakpoint
ALTER TABLE "entity_types"
ADD CONSTRAINT "entity_types_type_enum_check" CHECK (
	"type" IN (
		'documentation_pages',
		'documents_policies',
		'events',
		'funding_calls',
		'impact_case_studies',
		'internal_pages',
		'news',
		'opportunities',
		'organisational_units',
		'pages',
		'persons',
		'projects',
		'spotlight_articles'
	)
);
