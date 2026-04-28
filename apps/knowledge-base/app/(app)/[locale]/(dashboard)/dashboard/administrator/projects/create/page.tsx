import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getOrganisationalUnitOptions } from "@/lib/data/organisational-units";
import { getSocialMediaOptions } from "@/lib/data/social-media";
import { db } from "@/lib/db";
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
		prefix: "logos",
	});

	const [scopes, initialOrgUnits, roles, initialSocialMedia] = await Promise.all([
		db.query.projectScopes.findMany({
			orderBy: {
				scope: "asc",
			},
			columns: {
				id: true,
				scope: true,
			},
		}),
		getOrganisationalUnitOptions(),
		db.query.projectRoles.findMany({
			orderBy: { role: "asc" },
			columns: { id: true, role: true },
		}),
		getSocialMediaOptions(),
	]);

	return (
		<ProjectCreateForm
			initialAssets={initialAssets}
			initialOrgUnitItems={initialOrgUnits.items}
			initialOrgUnitTotal={initialOrgUnits.total}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			roles={roles}
			scopes={scopes}
		/>
	);
}
