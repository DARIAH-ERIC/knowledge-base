import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentsPoliciesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/documents-policies-page";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { currentEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { asc, eq } from "@/lib/db/sql";
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

export default async function DashboardWebsiteDocumentsPoliciesPage(
	_props: Readonly<DashboardWebsiteDocumentsPoliciesPageProps>,
): Promise<ReactNode> {
	const [groups, documents, { items: initialAssets }] = await Promise.all([
		db.query.documentPolicyGroups.findMany({
			orderBy: { position: "asc" },
		}),
		db
			.select({
				id: schema.documentsPolicies.id,
				title: schema.documentsPolicies.title,
				summary: schema.documentsPolicies.summary,
				url: schema.documentsPolicies.url,
				groupId: schema.documentsPolicies.groupId,
				position: schema.documentsPolicies.position,
				entityId: schema.entities.id,
				slug: schema.entities.slug,
				document: { key: schema.assets.key, label: schema.assets.label },
			})
			.from(schema.documentsPolicies)
			.innerJoin(schema.entityVersions, eq(schema.documentsPolicies.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.assets, eq(schema.documentsPolicies.documentId, schema.assets.id))
			.where(currentEntityVersionWhere())
			.orderBy(asc(schema.documentsPolicies.position)),
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "documents" }),
	]);

	const documentsShaped = documents.map(({ slug, entityId, ...rest }) => {
		return { ...rest, entityVersion: { entity: { id: entityId, slug } } };
	});
	const groupsWithDocuments = groups.map((group) => {
		return {
			...group,
			documentsPolicies: documentsShaped.filter((document) => document.groupId === group.id),
		};
	});
	const ungrouped = documentsShaped.filter((document) => document.groupId == null);

	return (
		<DocumentsPoliciesPage
			groups={groupsWithDocuments}
			initialAssets={initialAssets}
			ungrouped={ungrouped}
		/>
	);
}
