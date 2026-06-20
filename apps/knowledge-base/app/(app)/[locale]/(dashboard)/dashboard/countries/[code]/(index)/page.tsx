import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { NationalConsortiumDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortia-details";
import { imageGridOptions } from "@/config/assets.config";
import { assertCan } from "@/lib/auth/permissions";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOrganisationalUnitEditData } from "@/lib/data/admin-organisational-units";
import { resolveSelectedDetailVersion } from "@/lib/data/entity-detail-view";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface CountryPageProps extends PageProps<"/[locale]/dashboard/countries/[code]"> {}

export async function generateMetadata(
	_props: Readonly<CountryPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, { title: t("National consortium") });
}

export default async function CountryPage(props: Readonly<CountryPageProps>): Promise<ReactNode> {
	const [{ code }, searchParams, { user }] = await Promise.all([
		props.params,
		props.searchParams,
		assertAuthenticated(),
	]);
	const scopes = await getUserOrganisationalUnitScopes(user);
	const country = scopes.countries.find((item) => item.slug === code);
	const consortium = country?.nationalConsortium;
	if (country == null || consortium == null) {
		notFound();
	}

	await assertCan(user, "read", { type: "organisational_unit", id: consortium.documentId });
	const requestedVersion = country.canEdit ? searchParams.version : "published";
	const versionState = await resolveSelectedDetailVersion(consortium.documentId, requestedVersion);
	if (versionState == null || (!country.canEdit && versionState.publishedId == null)) {
		notFound();
	}

	const data = await getOrganisationalUnitEditData({
		slug: consortium.slug,
		unitType: "national_consortium",
		versionId: versionState.versionId,
		publishedVersionId: versionState.publishedId,
	});
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
	const detailHref = `/dashboard/countries/${country.slug}`;

	return (
		<NationalConsortiumDetails
			detailHref={detailHref}
			documentId={consortium.documentId}
			editHref={country.canEdit ? `${detailHref}/edit` : null}
			enableAdminEntityLinks={false}
			hasDraft={country.canEdit && versionState.hasDraftChanges}
			isPublished={versionState.publishedId != null}
			nationalConsortium={{ ...data.unit, image }}
			relations={data.relations}
			selectedRelatedEntities={data.selectedRelatedEntities}
			selectedRelatedResources={data.selectedRelatedResources}
			selectedSocialMediaItems={data.selectedSocialMediaItems}
			selectedVersion={versionState.selectedVersion}
		/>
	);
}
