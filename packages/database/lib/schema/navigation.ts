import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { entities } from "./entities";

export const navigationMenus = p.snakeCase.table("navigation_menus", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	name: p.text("name").notNull().unique(),
	...f.timestamps(),
});

export type NavigationMenu = typeof navigationMenus.$inferSelect;
export type NavigationMenuInput = typeof navigationMenus.$inferInsert;

export const NavigationMenuSelectSchema = createSelectSchema(navigationMenus);
export const NavigationMenuInsertSchema = createInsertSchema(navigationMenus);
export const NavigationMenuUpdateSchema = createUpdateSchema(navigationMenus);

export const navigationItems = p.snakeCase.table(
	"navigation_items",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		menuId: p
			.uuid("menu_id")
			.notNull()
			.references(() => navigationMenus.id, { onDelete: "cascade" }),
		parentId: p
			.uuid("parent_id")
			.references((): AnyPgColumn => navigationItems.id, { onDelete: "cascade" }),
		label: p.text("label").notNull(),
		href: p.text("href"),
		entityId: p.uuid("entity_id").references(() => entities.id, { onDelete: "restrict" }),
		isExternal: p.boolean("is_external").notNull().default(false),
		position: p.integer("position").notNull().default(0),
		...f.timestamps(),
	},
	(t) => [
		/** An item links to a url or to an entity, never to both. */
		p.check(
			"navigation_items_link",
			sql`
					NOT (
						${t.href} IS NOT NULL
						AND ${t.entityId} IS NOT NULL
					)
				`,
		),
		/**
		 * Only a top-level item may be a bare label: such an item exists to open a dropdown, which a
		 * nested item has no room to do. Keeping children linkable is also what caps menus at one level
		 * — a grandchild would have to hang off a child that is a dropdown trigger.
		 */
		p.check(
			"navigation_items_child_link",
			sql`
					NOT (
						${t.parentId} IS NOT NULL
						AND ${t.href} IS NULL
						AND ${t.entityId} IS NULL
					)
				`,
		),
	],
);

export type NavigationItem = typeof navigationItems.$inferSelect;
export type NavigationItemInput = typeof navigationItems.$inferInsert;

export const NavigationItemSelectSchema = createSelectSchema(navigationItems);
export const NavigationItemInsertSchema = createInsertSchema(navigationItems);
export const NavigationItemUpdateSchema = createUpdateSchema(navigationItems);
