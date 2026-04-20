import { asc, eq, isNull } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentsPoliciesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/documents-policies-page";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteDocumentsPoliciesPageProps extends PageProps<"/[locale]/dashboard/website/documents-policies"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteDocumentsPoliciesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Documents and policies"),
	});

	return metadata;
}

const documentColumns = {
	id: true,
	title: true,
	summary: true,
	url: true,
	groupId: true,
	position: true,
} as const;

const documentWith = {
	entity: { columns: { slug: true } },
	document: { columns: { key: true, label: true } },
} as const;

export default async function DashboardWebsiteDocumentsPoliciesPage(
	_props: Readonly<DashboardWebsiteDocumentsPoliciesPageProps>,
): Promise<ReactNode> {
	const [groups, ungrouped, { items: initialAssets }] = await Promise.all([
		db.query.documentPolicyGroups.findMany({
			orderBy: { position: "asc" },
			with: {
				documentsPolicies: {
					columns: documentColumns,
					with: documentWith,
					orderBy: { position: "asc" },
				},
			},
		}),
		db
			.select({
				id: schema.documentsPolicies.id,
				title: schema.documentsPolicies.title,
				summary: schema.documentsPolicies.summary,
				url: schema.documentsPolicies.url,
				groupId: schema.documentsPolicies.groupId,
				position: schema.documentsPolicies.position,
				entity: { slug: schema.entities.slug },
				document: { key: schema.assets.key, label: schema.assets.label },
			})
			.from(schema.documentsPolicies)
			.innerJoin(schema.entities, eq(schema.documentsPolicies.id, schema.entities.id))
			.innerJoin(schema.assets, eq(schema.documentsPolicies.documentId, schema.assets.id))
			.where(isNull(schema.documentsPolicies.groupId))
			.orderBy(asc(schema.documentsPolicies.position)),
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "documents" }),
	]);

	return (
		<DocumentsPoliciesPage groups={groups} initialAssets={initialAssets} ungrouped={ungrouped} />
	);
}
