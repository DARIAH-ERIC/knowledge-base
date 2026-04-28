import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-group-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getWorkingGroupEditDataForAdmin } from "@/lib/data/admin-organisational-units";
import { getPersonOptions } from "@/lib/data/article-contributors";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getEntityRelationOptions, getResourceRelationOptions } from "@/lib/data/relations";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditWorkingGroupPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditWorkingGroupPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit working group"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditWorkingGroupPage(
	props: Readonly<DashboardAdministratorEditWorkingGroupPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;
	const { user } = await assertAuthenticated();

	const [
		{ items: initialAssets },
		initialRelatedEntities,
		initialRelatedResources,
		initialPersons,
		workingGroupData,
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getEntityRelationOptions(),
		getResourceRelationOptions(),
		getPersonOptions(),
		getWorkingGroupEditDataForAdmin(user, slug),
	]);

	if (workingGroupData == null) {
		notFound();
	}

	const {
		chairs,
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		unit: workingGroup,
		unitRelationStatusOptions,
	} = workingGroupData;

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
		<WorkingGroupEditForm
			chairs={chairs}
			initialAssets={initialAssets}
			initialPersonItems={initialPersons.items}
			initialPersonTotal={initialPersons.total}
			initialRelatedEntityIds={relatedEntityIds}
			initialRelatedEntityItems={initialRelatedEntities.items}
			initialRelatedEntityTotal={initialRelatedEntities.total}
			initialRelatedResourceIds={relatedResourceIds}
			initialRelatedResourceItems={initialRelatedResources.items}
			initialRelatedResourceTotal={initialRelatedResources.total}
			relations={relations}
			selectedRelatedEntities={selectedRelatedEntities}
			selectedRelatedResources={selectedRelatedResources}
			unitRelationStatusOptions={unitRelationStatusOptions}
			workingGroup={{ ...workingGroup, image }}
		/>
	);
}
