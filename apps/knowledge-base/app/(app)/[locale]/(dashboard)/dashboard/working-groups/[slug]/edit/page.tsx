import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { DelegatedWorkingGroupEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/working-groups/[slug]/edit/_components/delegated-working-group-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditData } from "@/lib/data/admin-organisational-units";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getContributionPersonOptions } from "@/lib/data/contributions";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { getPersonRelationRoleOptions, getPersonRelations } from "@/lib/data/person-relations";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface WorkingGroupEditPageProps extends PageProps<"/[locale]/dashboard/working-groups/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<WorkingGroupEditPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, { title: t("Edit working group") });
}

export default async function WorkingGroupEditPage(
	props: Readonly<WorkingGroupEditPageProps>,
): Promise<ReactNode> {
	const [{ slug }, { user }] = await Promise.all([props.params, assertAuthenticated()]);
	const scopes = await getUserOrganisationalUnitScopes(user);
	const workingGroup = scopes.workingGroups.find((item) => item.slug === slug);
	if (workingGroup == null || !workingGroup.canEdit) {
		notFound();
	}

	await assertCan(user, "update", { type: "organisational_unit", id: workingGroup.documentId });
	const { draftVersionId, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(
			tx,
			workingGroup.documentId,
			organisationalUnitsLifecycleAdapter,
		);
		const lifecycle = await getDocumentLifecycleState(tx, workingGroup.documentId);
		return { draftVersionId, publishedId: lifecycle.publishedId };
	});

	const [
		{ items: initialAssets },
		initialSocialMedia,
		data,
		personRelations,
		personRelationRoleOptions,
		{ items: initialPersonItems, total: initialPersonTotal },
	] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getSocialMediaOptions(),
		getOrganisationalUnitEditData({
			slug,
			unitType: "working_group",
			versionId: draftVersionId,
			publishedVersionId: publishedId,
		}),
		getPersonRelations(workingGroup.documentId),
		getPersonRelationRoleOptions("working_group"),
		getContributionPersonOptions(),
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

	return (
		<DelegatedWorkingGroupEditForm
			documentId={workingGroup.documentId}
			initialAssets={initialAssets}
			initialPersonItems={initialPersonItems}
			initialPersonTotal={initialPersonTotal}
			initialSocialMediaIds={data.socialMediaIds}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			personRelationRoleOptions={personRelationRoleOptions}
			personRelations={personRelations}
			selectedSocialMediaItems={data.selectedSocialMediaItems}
			workingGroup={{ ...data.unit, image }}
		/>
	);
}
