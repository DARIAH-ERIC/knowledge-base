-- Add an optional, document-level website pathname to entities. Only `pages` use it: a page's URL
-- is author-defined and cannot be derived from its single-segment slug. Lives on `entities` (like
-- slug) so it survives republishes and is globally unique across pages; null for every other type
-- and for pages without a curated path (those are not linkable). Backfilled from issue #703.

ALTER TABLE "entities"
	ADD COLUMN IF NOT EXISTS "path" text;

--> statement-breakpoint

-- Global uniqueness among real paths; nulls (non-pages / un-curated pages) are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS "entities_path_unique"
	ON "entities" USING btree ("path")
	WHERE "path" IS NOT NULL;

--> statement-breakpoint

-- Backfill page paths from issue #703. Only fills null paths, so re-applying never clobbers a path
-- that has since been curated in the CMS; the mapped paths are distinct, so no unique collision.
UPDATE "entities" AS e
SET "path" = v.path
FROM (VALUES
	('dariah-in-nutshell',              '/about/dariah-in-a-nutshell'),
	('strategy',                        '/about/strategy'),
	('organisation-and-governance',     '/about/organisation-and-governance'),
	('impact-case-studies',             '/about/impact-case-studies'),
	('members-and-partners',            '/network/members-and-partners'),
	('regional-hubs',                   '/network/regional-hubs'),
	('working-groups-list',             '/network/working-groups'),
	('resource-catalogue',              '/resources/dariah-resource-catalogue'),
	('dariah-campus',                   '/resources/dariah-campus'),
	('transformation-a-dariah-journal', '/resources/transformations'),
	('ssh-open-marketplace',            '/resources/ssh-open-marketplace'),
	('projects-list',                   '/projects'),
	('spotlights',                      '/spotlights'),
	('newsletters',                     '/newsletters'),
	('join-dariah',                     '/get-involved/join-dariah'),
	('legal-notice',                    '/privacy-and-legal/legal-notice'),
	('privacy-notice',                  '/privacy-and-legal/practice'),
	('accessibility-declaration',       '/privacy-and-legal/accessibility-declaration')
) AS v(slug, path)
WHERE e."slug" = v.slug
	AND e."path" IS NULL
	AND e."type_id" = (SELECT id FROM "entity_types" WHERE "type" = 'pages');
