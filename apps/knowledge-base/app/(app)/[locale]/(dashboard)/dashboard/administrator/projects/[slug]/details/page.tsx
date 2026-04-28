import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-details";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getProjectDetailsForAdmin } from "@/lib/data/projects";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorProjectDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/projects/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorProjectDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Project details"),
	});

	return metadata;
}

export default async function DashboardAdministratorProjectDetailsPage(
	props: Readonly<DashboardAdministratorProjectDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const { user } = await assertAuthenticated();
	const projectData = await getProjectDetailsForAdmin(user, slug);

	if (projectData == null) {
		notFound();
	}

	const { description, partners, project, socialMedia } = projectData;

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
		<ProjectDetails
			project={{
				...project,
				description,
				image,
				partners,
				socialMedia,
			}}
		/>
	);
}
