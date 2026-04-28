import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getProjectEditDataForAdmin } from "@/lib/data/projects";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditProjectPageProps extends PageProps<"/[locale]/dashboard/administrator/projects/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditProjectPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit project"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditProjectPage(
	props: Readonly<DashboardAdministratorEditProjectPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const { user } = await assertAuthenticated();
	const [{ items: initialAssets }, projectData] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		getProjectEditDataForAdmin(user, slug),
	]);

	if (projectData == null) {
		notFound();
	}

	const {
		description,
		initialOrgUnits,
		initialPartners,
		initialSocialMedia,
		initialSocialMediaIds,
		project,
		roles,
		scopes,
		selectedSocialMediaItems,
	} = projectData;

	const image =
		project.image != null
			? {
					...project.image,
					url: images.generateSignedImageUrl({
						key: project.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<ProjectEditForm
			initialAssets={initialAssets}
			initialOrgUnitItems={initialOrgUnits.items}
			initialOrgUnitTotal={initialOrgUnits.total}
			initialPartners={initialPartners}
			initialSocialMediaIds={initialSocialMediaIds}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			project={{ ...project, description, image }}
			roles={roles}
			scopes={scopes}
			selectedSocialMediaItems={selectedSocialMediaItems}
		/>
	);
}
