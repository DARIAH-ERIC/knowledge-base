import type * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { OrganigramForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/organigram/_components/organigram-form";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteOrganigramPageProps extends PageProps<"/[locale]/dashboard/website/organigram"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteOrganigramPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Organigram"),
	});

	return metadata;
}

export default async function DashboardWebsiteOrganigramPage(
	_props: Readonly<DashboardWebsiteOrganigramPageProps>,
): Promise<ReactNode> {
	const t = await getExtracted();

	const rows = await db.query.organigramNodes.findMany({
		columns: {
			id: true,
			slug: true,
			label: true,
			description: true,
			kind: true,
			position: true,
		},
		with: {
			entity: {
				columns: {
					id: true,
					slug: true,
				},
			},
		},
		orderBy(t, { asc, sql }) {
			return [asc(sql`COALESCE(${t.position}, 2147483647)`), asc(t.slug)];
		},
	});

	const nodes = await Promise.all(
		rows.map(async (row) => {
			let entity: {
				id: string;
				slug: string;
				name: string;
				type: string;
			} | null = null;

			if (row.entity != null) {
				const unit = await db.query.organisationalUnits.findFirst({
					where: {
						entityVersion: {
							entity: { id: row.entity.id },
							status: { type: "published" },
						},
					},
					columns: {
						name: true,
					},
					with: {
						type: { columns: { type: true } },
					},
				});

				if (unit != null) {
					entity = {
						id: row.entity.id,
						slug: row.entity.slug,
						name: unit.name,
						type: unit.type.type,
					};
				}
			}

			return {
				...row,
				entity,
			};
		}),
	);

	return (
		<div className="flex flex-col gap-y-6">
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Organigram")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage organigram node labels, descriptions, and ordering.")}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="p-(--layout-padding)">
				<OrganigramForm
					nodes={
						nodes as Array<
							Pick<
								schema.OrganigramNode,
								"description" | "id" | "kind" | "label" | "position" | "slug"
							> & {
								entity: {
									id: string;
									slug: string;
									name: string;
									type: string;
								} | null;
							}
						>
					}
				/>
			</div>
		</div>
	);
}
