import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { NationalConsortiumForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortium-form";
import { updateDelegatedNationalConsortiumAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/update-national-consortium.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditData } from "@/lib/data/admin-organisational-units";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface CountryEditPageProps extends PageProps<"/[locale]/dashboard/countries/[code]/edit"> {}

export async function generateMetadata(
	_props: Readonly<CountryEditPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, { title: t("Edit national consortium") });
}

export default async function CountryEditPage(
	props: Readonly<CountryEditPageProps>,
): Promise<ReactNode> {
	const [{ code }, { user }] = await Promise.all([props.params, assertAuthenticated()]);
	const t = await getExtracted();
	const scopes = await getUserOrganisationalUnitScopes(user);
	const country = scopes.countries.find((item) => item.slug === code);
	const consortium = country?.nationalConsortium;
	if (country == null || consortium == null || !country.canEdit) {
		notFound();
	}

	await assertCan(user, "update", { type: "organisational_unit", id: consortium.documentId });
	const { draftVersionId, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(
			tx,
			consortium.documentId,
			organisationalUnitsLifecycleAdapter,
		);
		const lifecycle = await getDocumentLifecycleState(tx, consortium.documentId);
		return { draftVersionId, publishedId: lifecycle.publishedId };
	});

	const [{ items: initialAssets }, initialSocialMedia, data] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getSocialMediaOptions(),
		getOrganisationalUnitEditData({
			slug: consortium.slug,
			unitType: "national_consortium",
			versionId: draftVersionId,
			publishedVersionId: publishedId,
		}),
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
		<Fragment>
			<EntityFormHeader title={t("Edit national consortium")} />
			<NationalConsortiumForm
				formAction={updateDelegatedNationalConsortiumAction}
				formId="delegated-national-consortium-edit-form"
				initialAssets={initialAssets}
				initialRelatedEntityItems={[]}
				initialRelatedEntityTotal={0}
				initialRelatedResourceItems={[]}
				initialRelatedResourceTotal={0}
				initialSocialMediaIds={data.socialMediaIds}
				initialSocialMediaItems={initialSocialMedia.items}
				initialSocialMediaTotal={initialSocialMedia.total}
				nationalConsortium={{ ...data.unit, image }}
				selectedSocialMediaItems={data.selectedSocialMediaItems}
				showRelationFields={false}
				showSaveAndPublish={false}
			/>
		</Fragment>
	);
}
