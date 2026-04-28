import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PersonEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getContributionRoleOptions, getPersonContributions } from "@/lib/data/contributions";
import { getPersonEditDataForAdmin } from "@/lib/data/persons";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditPersonPageProps extends PageProps<"/[locale]/dashboard/administrator/persons/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditPersonPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit person"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditPersonPage(
	props: Readonly<DashboardAdministratorEditPersonPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const { user } = await assertAuthenticated();
	const [{ items: initialAssets }, personData] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "avatars" }),
		getPersonEditDataForAdmin(user, slug),
	]);

	if (personData == null) {
		notFound();
	}

	const { biography, person } = personData;

	const [contributions, contributionRoleOptions] = await Promise.all([
		getPersonContributions(person.id),
		getContributionRoleOptions(),
	]);

	const image = {
		...person.image,
		url: images.generateSignedImageUrl({
			key: person.image.key,
			options: imageGridOptions,
		}).url,
	};

	return (
		<PersonEditForm
			contributionRoleOptions={contributionRoleOptions}
			contributions={contributions}
			initialAssets={initialAssets}
			person={{ ...person, biography, image }}
		/>
	);
}
