/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { Database, Transaction } from "@/middlewares/db";

interface NavigationItem {
	id: string;
	label: string;
	href: string | null;
	entity: { type: string; slug: string } | null;
	isExternal: boolean;
	position: number;
	parentId: string | null;
}

interface NavigationItemWithChildren extends NavigationItem {
	children: Array<NavigationItemWithChildren>;
}

function buildTree(
	items: Array<NavigationItem>,
	parentId: string | null,
): Array<NavigationItemWithChildren> {
	return (
		items
			.filter((item) => {
				return item.parentId === parentId;
			})
			// eslint-disable-next-line unicorn/no-array-sort
			.sort((a, b) => {
				return a.position - b.position;
			})
			.map((item) => {
				return {
					...item,
					children: buildTree(items, item.id),
				};
			})
	);
}

interface GetNavigationParams {
	menu?: string;
}

export async function getNavigation(db: Database | Transaction, params: GetNavigationParams) {
	const { menu } = params;

	const menus = await db.query.navigationMenus.findMany({
		where: menu != null ? { name: menu } : undefined,
		columns: {
			id: true,
			name: true,
		},
		with: {
			items: {
				columns: {
					id: true,
					label: true,
					href: true,
					isExternal: true,
					position: true,
					parentId: true,
				},
				with: {
					entity: {
						columns: {
							slug: true,
						},
						with: {
							type: {
								columns: {
									type: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			name: "asc",
		},
	});

	return menus.map((m) => {
		const items: Array<NavigationItem> = m.items.map((item) => {
			return {
				id: item.id,
				label: item.label,
				href: item.href ?? null,
				entity:
					item.entity != null ? { type: item.entity.type.type, slug: item.entity.slug } : null,
				isExternal: item.isExternal,
				position: item.position,
				parentId: item.parentId ?? null,
			};
		});
		const tree = buildTree(items, null);
		return { id: m.id, name: m.name, items: tree };
	});
}
