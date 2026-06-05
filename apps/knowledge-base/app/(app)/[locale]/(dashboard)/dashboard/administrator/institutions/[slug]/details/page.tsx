import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { InstitutionDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institution-details";
import { publishInstitutionAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_lib/publish-institution.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import {
	getRichTextFieldContent,
	resolveSelectedDetailVersion,
} from "@/lib/data/entity-detail-view";
import {
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import { getSocialMediaOptionsByIds } from "@/lib/data/social-media";
import { getUnitRelations } from "@/lib/data/unit-relations";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorInstitutionDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorInstitutionDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - View institution"),
	});

	return metadata;
}

export default async function DashboardAdministratorInstitutionDetailsPage(
	props: Readonly<DashboardAdministratorInstitutionDetailsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams: searchParamsPromise } = props;

	const { slug } = await params;

	await assertAuthenticated();

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

	const { version } = await searchParamsPromise;

	const versionState = await resolveSelectedDetailVersion(documentId, version);
	if (versionState == null) {
		notFound();
	}
	const { hasDraftChanges, publishedId, selectedVersion, versionId } = versionState;

	const institution = await db.query.organisationalUnits.findFirst({
		where: { id: versionId },
		columns: {
			acronym: true,
			id: true,
			name: true,
			sshocMarketplaceActorId: true,
			summary: true,
		},
		with: {
			entityVersion: {
				columns: { id: true },
				with: {
					entity: {
						columns: {
							id: true,
							slug: true,
						},
					},
				},
			},
			image: {
				columns: {
					key: true,
					label: true,
				},
			},
		},
	});

	if (institution == null) {
		notFound();
	}

	const [{ relatedEntityIds, relatedResourceIds }, relations, socialMediaRows, description] =
		await Promise.all([
			getEntityRelations(documentId),
			getUnitRelations(documentId),
			db.query.organisationalUnitsToSocialMedia.findMany({
				where: { organisationalUnitId: institution.id },
				columns: { socialMediaId: true },
			}),
			getRichTextFieldContent(versionId, "description"),
		]);

	const socialMediaIds = socialMediaRows.map((row) => row.socialMediaId);

	const [selectedRelatedEntities, selectedRelatedResources, selectedSocialMediaItems] =
		await Promise.all([
			getEntityRelationOptionsByIds(relatedEntityIds),
			getResourceRelationOptionsByIds(relatedResourceIds),
			getSocialMediaOptionsByIds(socialMediaIds),
		]);

	const image =
		institution.image != null
			? {
					...institution.image,
					url: images.generateSignedImageUrl({
						key: institution.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<InstitutionDetails
			documentId={documentId}
			institution={{ ...institution, description, image }}
			hasDraft={hasDraftChanges}
			isPublished={publishedId != null}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			selectedSocialMediaItems={selectedSocialMediaItems}
			publishAction={publishInstitutionAction}
			selectedVersion={selectedVersion}
		/>
	);
}
