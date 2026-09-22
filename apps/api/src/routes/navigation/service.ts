/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { type EntityRef, isPublicRelatedEntityType } from "@/lib/schemas";
import {
	getCountrySlugsByOrganisationalUnitDocumentId,
	getWebsiteHref,
} from "@/lib/website-routes";
import type { Database, Transaction } from "@/middlewares/db";
import type { NavigationItem, NavigationLink } from "@/routes/navigation/schemas";
import { and, asc, eq, isNotNull, isNull, or, sql } from "@/services/db/sql";

interface NavigationItemRow {
	id: string;
	label: string;
	href: string | null;
	entity: Omit<EntityRef, "label"> | null;
	isExternal: boolean;
	position: number;
	parentId: string | null;
}

function byPosition(a: NavigationItemRow, b: NavigationItemRow): number {
	return a.position - b.position;
}

/**
 * Resolves a row into a link, or null when it has no destination to offer: an item whose href was
 * never set, or one pointing at an entity that has no page of its own. Neither can be rendered as a
 * navigation link, so both are left out of the response rather than handed to consumers as an item
 * they have to special-case.
 */
function toLink(item: NavigationItemRow): NavigationLink | null {
	const entityHref = item.entity?.href ?? null;
	const href = entityHref ?? item.href;

	if (href == null || href.length === 0) {
		return null;
	}

	const entity =
		item.entity != null && entityHref != null ? { ...item.entity, href: entityHref } : null;

	return {
		id: item.id,
		label: item.label,
		position: item.position,
		kind: "link",
		href,
		isExternal: item.isExternal,
		entity,
	};
}

/**
 * Builds a menu's items: one level of links and dropdowns, no deeper.
 *
 * An item with children is a dropdown trigger, so its own href — which the cms does not allow it to
 * have, but older rows may still carry — is dropped: a trigger cannot both navigate and open a
 * submenu. Grandchildren are ignored for the same reason, since a link inside a dropdown has
 * nowhere to open a further level.
 */
function buildItems(items: Array<NavigationItemRow>): Array<NavigationItem> {
	return items
		.filter((item) => item.parentId == null)
		.toSorted(byPosition)
		.flatMap((item): Array<NavigationItem> => {
			const children = items
				.filter((child) => child.parentId === item.id)
				.toSorted(byPosition)
				.map((child) => toLink(child))
				.filter((child) => child != null);

			if (children.length > 0) {
				return [
					{
						id: item.id,
						label: item.label,
						position: item.position,
						kind: "submenu" as const,
						children,
					},
				];
			}

			const link = toLink(item);

			return link != null ? [link] : [];
		});
}

interface GetNavigationParams {
	menu?: string;
}

export async function getNavigation(db: Database | Transaction, params: GetNavigationParams) {
	const { menu } = params;

	const rows = await db
		.select({
			menuId: schema.navigationMenus.id,
			menuName: schema.navigationMenus.name,
			itemId: schema.navigationItems.id,
			label: schema.navigationItems.label,
			href: schema.navigationItems.href,
			isExternal: schema.navigationItems.isExternal,
			position: schema.navigationItems.position,
			parentId: schema.navigationItems.parentId,
			entityId: schema.entities.id,
			entitySlug: schema.entities.slug,
			entityType: sql<string>`
				CASE
					WHEN ${schema.entityTypes.type} = 'organisational_units'
					THEN ${schema.organisationalUnitTypes.type}
					ELSE ${schema.entityTypes.type}
				END
			`.as("entity_type"),
		})
		.from(schema.navigationMenus)
		.leftJoin(schema.navigationItems, eq(schema.navigationMenus.id, schema.navigationItems.menuId))
		.leftJoin(schema.entities, eq(schema.navigationItems.entityId, schema.entities.id))
		.leftJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
		.leftJoin(schema.documentLifecycle, eq(schema.documentLifecycle.documentId, schema.entities.id))
		.leftJoin(
			schema.organisationalUnits,
			eq(schema.documentLifecycle.publishedId, schema.organisationalUnits.id),
		)
		.leftJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.where(
			and(
				menu != null ? eq(schema.navigationMenus.name, menu) : undefined,
				or(
					isNull(schema.navigationItems.id),
					isNull(schema.navigationItems.entityId),
					isNotNull(schema.documentLifecycle.publishedId),
				),
			),
		)
		.orderBy(asc(schema.navigationMenus.name), asc(schema.navigationItems.position));

	// Institutions and national consortia have no page of their own — they are surfaced on their
	// country's members-and-partners page — so their country is resolved in one extra query.
	const countrySlugs = await getCountrySlugsByOrganisationalUnitDocumentId(
		db,
		rows.flatMap((row) =>
			row.entityId != null &&
			(row.entityType === "institution" || row.entityType === "national_consortium")
				? [row.entityId]
				: [],
		),
	);

	const menus = new Map<string, { id: string; name: string; items: Array<NavigationItemRow> }>();

	for (const row of rows) {
		const item = menus.get(row.menuId) ?? { id: row.menuId, name: row.menuName, items: [] };
		menus.set(row.menuId, item);

		if (row.itemId == null) {
			continue;
		}

		item.items.push({
			id: row.itemId,
			label: row.label!,
			href: row.href ?? null,
			entity:
				row.entityId != null && row.entitySlug != null && isPublicRelatedEntityType(row.entityType)
					? {
							id: row.entityId,
							type: row.entityType,
							slug: row.entitySlug,
							href: getWebsiteHref(row.entityType, {
								slug: row.entitySlug,
								countrySlug: countrySlugs.get(row.entityId),
							}),
						}
					: null,
			isExternal: row.isExternal!,
			position: row.position!,
			parentId: row.parentId ?? null,
		});
	}

	return [...menus.values()].map((m) => {
		return { id: m.id, name: m.name, items: buildItems(m.items) };
	});
}
