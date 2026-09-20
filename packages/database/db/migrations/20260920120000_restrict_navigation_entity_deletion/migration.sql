-- A navigation item is an intentional public link. Deleting its target must not silently turn the
-- item into a label without a destination; an administrator must remove or replace the navigation
-- item first.

ALTER TABLE "navigation_items"
	DROP CONSTRAINT IF EXISTS "navigation_items_entity_id_entities_id_fk";

--> statement-breakpoint

ALTER TABLE "navigation_items"
	ADD CONSTRAINT "navigation_items_entity_id_entities_id_fk"
	FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT;
