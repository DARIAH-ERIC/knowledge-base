import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { ProjectsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/projects-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorProjectsPageProps extends PageProps<"/[locale]/dashboard/administrator/projects"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorProjectsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Projects"),
	});

	return metadata;
}

export default function DashboardAdministratorProjectsPage(
	_props: Readonly<DashboardAdministratorProjectsPageProps>,
): ReactNode {
	const projects = db.query.projects.findMany({
		orderBy: {
			name: "asc",
		},
		columns: {
			acronym: true,
			duration: true,
			funding: true,
			id: true,
			name: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
				with: {
					status: {
						columns: {
							id: true,
							type: true,
						},
					},
				},
			},
			scope: {
				columns: {
					id: true,
					scope: true,
				},
			},
		},
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<ProjectsPage projects={projects} />
		</Suspense>
	);
}
