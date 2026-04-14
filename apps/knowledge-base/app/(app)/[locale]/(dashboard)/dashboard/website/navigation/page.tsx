import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import type { EntityOption } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_components/navigation-item-form-dialog";
import { NavigationPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_components/navigation-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteNavigationPageProps extends PageProps<"/[locale]/dashboard/website/navigation"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNavigationPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Navigation"),
	});

	return metadata;
}

export default async function DashboardWebsiteNavigationPage(
	_props: Readonly<DashboardWebsiteNavigationPageProps>,
): Promise<ReactNode> {
	const [menus, pages, spotlightArticles, impactCaseStudies] = await Promise.all([
		db.query.navigationMenus.findMany({
			orderBy: { name: "asc" },
			with: {
				items: true,
			},
		}),
		db.query.pages.findMany({ columns: { id: true, title: true }, orderBy: { title: "asc" } }),
		db.query.spotlightArticles.findMany({
			columns: { id: true, title: true },
			orderBy: { title: "asc" },
		}),
		db.query.impactCaseStudies.findMany({
			columns: { id: true, title: true },
			orderBy: { title: "asc" },
		}),
	]);

	const entityTitleMap = new Map<string, { title: string; type: EntityOption["type"] }>([
		...pages.map((e): [string, { title: string; type: EntityOption["type"] }] => {
			return [e.id, { title: e.title, type: "page" }];
		}),
		...spotlightArticles.map((e): [string, { title: string; type: EntityOption["type"] }] => {
			return [e.id, { title: e.title, type: "spotlight" }];
		}),
		...impactCaseStudies.map((e): [string, { title: string; type: EntityOption["type"] }] => {
			return [e.id, { title: e.title, type: "impact-case-study" }];
		}),
	]);

	const menusWithItems = menus.map((menu) => {
		return {
			id: menu.id,
			name: menu.name,
			items: menu.items.map((item) => {
				const entityMeta = item.entityId != null ? entityTitleMap.get(item.entityId) : null;
				return {
					id: item.id,
					menuId: item.menuId,
					parentId: item.parentId,
					label: item.label,
					href: item.href,
					entityId: item.entityId,
					isExternal: item.isExternal,
					position: item.position,
					entityTitle: entityMeta?.title ?? null,
				};
			}),
		};
	});

	const entities: Array<EntityOption> = [
		...pages.map((e) => {
			return { id: e.id, title: e.title, type: "page" as const };
		}),
		...spotlightArticles.map((e) => {
			return { id: e.id, title: e.title, type: "spotlight" as const };
		}),
		...impactCaseStudies.map((e) => {
			return { id: e.id, title: e.title, type: "impact-case-study" as const };
		}),
	];

	return <NavigationPage entities={entities} menus={menusWithItems} />;
}
