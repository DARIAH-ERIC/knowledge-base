import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { publicRelatedEntityTypesEnum } from "@/lib/schemas";

const NavigationEntityRefSchema = v.pipe(
	v.object({
		id: v.pipe(v.string(), v.uuid()),
		type: v.picklist(publicRelatedEntityTypesEnum),
		slug: v.string(),
		href: v.nullable(v.string()),
	}),
	v.description("Reference to an entity linked from a navigation item"),
	v.metadata({ ref: "NavigationEntityRef" }),
);

const NavigationItemBaseSchema = v.object({
	...v.pick(schema.NavigationItemSelectSchema, ["id", "label", "href", "isExternal", "position"])
		.entries,
	/** Null for external links and for items whose href is typed in by hand. */
	entity: v.nullable(NavigationEntityRefSchema),
});

const NavigationItemSchema = v.pipe(
	v.object({
		...NavigationItemBaseSchema.entries,
		children: v.array(NavigationItemBaseSchema),
	}),
	v.description("Navigation item"),
	v.metadata({ ref: "NavigationItem" }),
);

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
