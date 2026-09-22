import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { publicRelatedEntityTypesEnum } from "@/lib/schemas";

const NavigationEntityRefSchema = v.pipe(
	v.object({
		id: v.pipe(v.string(), v.uuid()),
		type: v.picklist(publicRelatedEntityTypesEnum),
		slug: v.string(),
		href: v.string(),
	}),
	v.description("Reference to an entity linked from a navigation item"),
	v.metadata({ ref: "NavigationEntityRef" }),
);

const navigationItemBaseEntries = v.pick(schema.NavigationItemSelectSchema, [
	"id",
	"label",
	"position",
]).entries;

/**
 * An item that links somewhere. `href` is always the resolved destination — for items pointing at
 * an entity it is that entity's website href, and `entity` carries the entity it was resolved
 * from.
 */
export const NavigationLinkSchema = v.pipe(
	v.object({
		...navigationItemBaseEntries,
		kind: v.literal("link"),
		href: v.pipe(v.string(), v.nonEmpty()),
		isExternal: schema.NavigationItemSelectSchema.entries.isExternal,
		/** Null for external links and for items whose href is typed in by hand. */
		entity: v.nullable(NavigationEntityRefSchema),
	}),
	v.description("Navigation item linking to a page or an external url"),
	v.metadata({ ref: "NavigationLink" }),
);

/**
 * An item that only opens a dropdown. It has no destination of its own: a trigger that both links
 * somewhere and opens a submenu has no unambiguous behaviour, so the cms does not allow it.
 */
export const NavigationSubmenuSchema = v.pipe(
	v.object({
		...navigationItemBaseEntries,
		kind: v.literal("submenu"),
		children: v.pipe(v.array(NavigationLinkSchema), v.nonEmpty()),
	}),
	v.description("Navigation item opening a dropdown of links"),
	v.metadata({ ref: "NavigationSubmenu" }),
);

export type NavigationLink = v.InferOutput<typeof NavigationLinkSchema>;

const NavigationItemSchema = v.pipe(
	v.variant("kind", [NavigationLinkSchema, NavigationSubmenuSchema]),
	v.description("Navigation item: either a link or a dropdown of links"),
	v.metadata({ ref: "NavigationItem" }),
);

export type NavigationItem = v.InferOutput<typeof NavigationItemSchema>;

export const NavigationMenuSchema = v.pipe(
	v.object({
		...v.pick(schema.NavigationMenuSelectSchema, ["id", "name"]).entries,
		items: v.array(NavigationItemSchema),
	}),
	v.description("Navigation menu"),
	v.metadata({ ref: "NavigationMenu" }),
);

export type NavigationMenu = v.InferOutput<typeof NavigationMenuSchema>;

export const NavigationMenuListSchema = v.pipe(
	v.array(NavigationMenuSchema),
	v.description("List of navigation menus"),
	v.metadata({ ref: "NavigationMenuList" }),
);

export type NavigationMenuList = v.InferOutput<typeof NavigationMenuListSchema>;

export const GetNavigation = {
	QuerySchema: v.object({
		menu: v.pipe(v.optional(v.string()), v.description("Filter navigation menus by name")),
	}),
	ResponseSchema: v.pipe(
		NavigationMenuListSchema,
		v.description("List of navigation menus with items"),
		v.metadata({ ref: "GetNavigationResponse" }),
	),
};
