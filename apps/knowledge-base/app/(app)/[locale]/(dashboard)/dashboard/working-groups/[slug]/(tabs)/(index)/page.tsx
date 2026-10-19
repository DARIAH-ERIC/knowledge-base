import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { WorkingGroupDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-details";
import { imageGridOptions } from "@/config/assets.config";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditData } from "@/lib/data/admin-organisational-units";
import { resolveSelectedDetailVersion } from "@/lib/data/entity-detail-view";
import { getPersonRelations } from "@/lib/data/person-relations";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface WorkingGroupPageProps extends PageProps<"/[locale]/dashboard/working-groups/[slug]"> {}

export async function generateMetadata(
	_props: Readonly<WorkingGroupPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, { title: t("Working group") });
}

export default async function WorkingGroupPage(
	props: Readonly<WorkingGroupPageProps>,
): Promise<ReactNode> {
	const [{ slug }, searchParams, { user }] = await Promise.all([
		props.params,
		props.searchParams,
		assertAuthenticated(),
	]);
	const scopes = await getUserOrganisationalUnitScopes(user);
	const workingGroup = scopes.workingGroups.find((item) => item.slug === slug);
	if (workingGroup == null) {
		notFound();
	}

	await assertCan(user, "read", { type: "organisational_unit", id: workingGroup.documentId });
	const requestedVersion = workingGroup.canEdit ? searchParams.version : "published";
	const versionState = await resolveSelectedDetailVersion(
		workingGroup.documentId,
		requestedVersion,
	);
	if (versionState == null || (!workingGroup.canEdit && versionState.publishedId == null)) {
		notFound();
	}

	const [data, personRelations] = await Promise.all([
		getOrganisationalUnitEditData({
			slug,
			unitType: "working_group",
			versionId: versionState.versionId,
			publishedVersionId: versionState.publishedId,
		}),
		getPersonRelations(workingGroup.documentId),
	]);
	if (data == null) {
		notFound();
	}

	const image =
		data.unit.image == null
			? null
			: {
					...data.unit.image,
					url: images.generateSignedImageUrl({
						key: data.unit.image.key,
						options: imageGridOptions,
					}).url,
				};
	const detailHref = `/dashboard/working-groups/${slug}`;

	return (
		<WorkingGroupDetails
			detailHref={detailHref}
			documentId={workingGroup.documentId}
			editHref={workingGroup.canEdit ? `${detailHref}/edit` : null}
			enableAdminEntityLinks={false}
			hasDraft={workingGroup.canEdit && versionState.hasDraftChanges}
			isPublished={versionState.publishedId != null}
			personRelations={personRelations}
			relations={data.relations}
			selectedRelatedEntities={data.selectedRelatedEntities}
			selectedRelatedResources={data.selectedRelatedResources}
			selectedSocialMediaItems={data.selectedSocialMediaItems}
			selectedVersion={versionState.selectedVersion}
			workingGroup={{ ...data.unit, image }}
		/>
	);
}
