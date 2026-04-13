import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateProjectPageProps extends PageProps<"/[locale]/dashboard/administrator/projects/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateProjectPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Create project"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateProjectPage(
	_props: Readonly<DashboardAdministratorCreateProjectPageProps>,
): Promise<ReactNode> {
	const { items: initialAssets } = await getMediaLibraryAssets({
		imageUrlOptions: imageGridOptions,
	});

	const [scopes, orgUnits, roles, allSocialMedia] = await Promise.all([
		db.query.projectScopes.findMany({
			orderBy: {
				scope: "asc",
			},
			columns: {
				id: true,
				scope: true,
			},
		}),
		db.query.organisationalUnits.findMany({
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
		db.query.projectRoles.findMany({
			orderBy: { role: "asc" },
			columns: { id: true, role: true },
		}),
		db.query.socialMedia.findMany({
			orderBy: { name: "asc" },
			columns: { id: true, name: true, url: true },
			with: {
				type: { columns: { type: true } },
			},
		}),
	]);

	return (
		<ProjectCreateForm
			initialAssets={initialAssets}
			orgUnits={orgUnits}
			roles={roles}
			scopes={scopes}
			socialMediaItems={allSocialMedia}
		/>
	);
}
