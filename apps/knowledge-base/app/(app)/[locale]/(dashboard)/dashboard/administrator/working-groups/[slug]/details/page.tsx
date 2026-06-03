import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { WorkingGroupDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-details";
import { publishWorkingGroupAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/publish-working-group.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { getWorkingGroupChairs } from "@/lib/data/working-group-chairs";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorWorkingGroupDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - View working group"),
	});

	return metadata;
}

export default async function DashboardAdministratorWorkingGroupDetailsPage(
	props: Readonly<DashboardAdministratorWorkingGroupDetailsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams: searchParamsPromise } = props;

	const { slug } = await params;
	const { user } = await assertAuthenticated();

	const anyVersion = await db.query.organisationalUnits.findFirst({
		where: { entityVersion: { entity: { slug } } },
		columns: {},
		with: {
			entityVersion: {
				columns: {},
				with: { entity: { columns: { id: true } } },
			},
		},
	});

	if (anyVersion == null) {
		notFound();
	}

	const documentId = anyVersion.entityVersion.entity.id;
	const { draftVersionId, hasDraftChanges, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(
			tx,
			documentId,
			organisationalUnitsLifecycleAdapter,
		);
		const { hasDraftChanges, publishedId } = await getDocumentLifecycleState(tx, documentId);
		return { draftVersionId, hasDraftChanges, publishedId };
	});

	/**
	 * The version selector and "with draft changes" UX only kick in when the draft actually diverges
	 * from the published version. Right after publish, a draft row still exists as a clone of the new
	 * published version but has no real changes — we treat that as published-only.
	 */
	const showVersionSelector = hasDraftChanges && publishedId != null;

	const { version } = await searchParamsPromise;
	let selectedVersion: "draft" | "published";
	let versionId: string | null;

	if (showVersionSelector) {
		selectedVersion = version === "published" ? "published" : "draft";
		versionId = selectedVersion === "published" ? publishedId : draftVersionId;
	} else if (publishedId != null) {
		selectedVersion = "published";
		versionId = publishedId;
	} else {
		selectedVersion = "draft";
		versionId = draftVersionId;
	}

	if (!versionId) {
		notFound();
	}

	const [
		chairs,
		descriptionRows,
		initialRelatedEntities,
		initialRelatedResources,
		initialSocialMedia,
		workingGroupData,
	] = await Promise.all([
		getWorkingGroupChairs(documentId),
		db
			.select({
				content: schema.richTextContentBlocks.content,
				id: schema.richTextContentBlocks.id,
			})
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityVersionId, versionId),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getSocialMediaOptions(),
		getOrganisationalUnitEditDataForAdmin(user, {
			slug,
			unitType: "working_group",
			versionId: draftVersionId,
			publishedVersionId: publishedId,
		}),
	]);

	if (workingGroupData == null) {
		notFound();
	}

	const {
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		selectedSocialMediaItems,
		socialMediaIds,
		unit: workingGroup,
	} = workingGroupData;

	const description = descriptionRows.at(0)?.content ?? null;

	const image =
		workingGroup.image != null
			? {
					...workingGroup.image,
					url: images.generateSignedImageUrl({
						key: workingGroup.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<WorkingGroupDetails
			chairs={chairs}
			documentId={documentId}
			hasDraft={hasDraftChanges}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			initialSocialMediaIds={socialMediaIds}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			isPublished={publishedId != null}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			selectedSocialMediaItems={selectedSocialMediaItems}
			workingGroup={{ ...workingGroup, description, image }}
			publishAction={publishWorkingGroupAction}
			selectedVersion={selectedVersion}
		/>
	);
}
