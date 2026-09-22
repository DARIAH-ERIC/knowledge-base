-- A navigation item is either a link or a dropdown trigger, never both: an item that navigates
-- somewhere and also opens a submenu has no unambiguous behaviour. Only a top-level item can be a
-- trigger, which is also what caps menus at one level of children.
--
-- The "trigger with children must not link" half of that rule spans two rows, so it is enforced by
-- the cms actions; what a row can check on its own is that a nested item always links somewhere.

-- Dropped first so this migration also applies to a database that `db:push` has already brought in
-- line with the drizzle schema.
ALTER TABLE "navigation_items"
	DROP CONSTRAINT IF EXISTS "navigation_items_child_link";

--> statement-breakpoint

DO $$
DECLARE
	offending text;
BEGIN
	SELECT string_agg(id::text, ', ')
	INTO offending
	FROM "navigation_items"
	WHERE "parent_id" IS NOT NULL
		AND "href" IS NULL
		AND "entity_id" IS NULL;

	IF offending IS NOT NULL THEN
		RAISE EXCEPTION 'Navigation items nested under another item must link to a url or an entity. Fix or remove these items first: %', offending;
	END IF;
END
$$;

--> statement-breakpoint

ALTER TABLE "navigation_items"
	ADD CONSTRAINT "navigation_items_child_link"
	CHECK (
		NOT (
			"parent_id" IS NOT NULL
			AND "href" IS NULL
			AND "entity_id" IS NULL
		)
	);
