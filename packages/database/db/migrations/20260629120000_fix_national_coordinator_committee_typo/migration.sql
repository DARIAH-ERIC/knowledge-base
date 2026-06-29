-- Fix the typo'd name/slug of the "National coordinators committee" governance body: it should be
-- "National coordinator committee" (singular). `20260410190318_seed_bodies` seeded the wrong value,
-- so existing databases need it corrected here while the seed itself is fixed for fresh installs.
--
-- Idempotent: matches only the old values, so re-runs (or fresh databases already seeded correctly)
-- find no rows to update. The `name` change is picked up by the `organisational_units_sync_entity_label`
-- trigger, which keeps `entities.label` in sync for the published version.

-- Name lives on every version's `organisational_units` row; scope by the body's entity (matched on
-- either the old or the corrected slug so this is independent of the slug update below).
UPDATE "organisational_units" AS "ou"
SET
	"name" = 'National coordinator committee'
FROM
	"entity_versions" AS "ev",
	"entities" AS "e"
WHERE
	"ou"."id" = "ev"."id"
	AND "ev"."entity_id" = "e"."id"
	AND "e"."slug" IN ('national-coordinators-committee', 'national-coordinator-committee')
	AND "ou"."name" = 'National coordinators committee';

--> statement-breakpoint

-- Slug lives on the `entities` document row.
UPDATE "entities"
SET
	"slug" = 'national-coordinator-committee'
WHERE
	"slug" = 'national-coordinators-committee';
