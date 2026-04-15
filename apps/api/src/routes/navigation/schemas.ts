import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

const EntityRefSchema = v.nullable(
	v.object({
		type: v.picklist(schema.entityTypesEnum),
		slug: v.string(),
	}),
);

const NavigationItemBaseSchema = v.object({
	...v.pick(schema.NavigationItemSelectSchema, ["id", "label", "href", "isExternal", "position"])
		.entries,
	entity: EntityRefSchema,
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
	QuerySchema: v.pipe(
		v.object({
			menu: v.optional(v.string()),
		}),
		v.description("Get navigation query params"),
		v.metadata({ ref: "GetNavigationQuery" }),
	),
	ResponseSchema: v.pipe(
		NavigationMenuListSchema,
		v.description("List of navigation menus with items"),
		v.metadata({ ref: "GetNavigationResponse" }),
	),
};
