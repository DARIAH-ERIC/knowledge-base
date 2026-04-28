import { Heading } from "@dariah-eric/ui/heading";
import type { Metadata, ResolvingMetadata } from "next";
import { useExtracted } from "next-intl";
import { getExtracted } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { AdminTaskCard } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_components/admin-task-card";
import { ingestSshocServicesAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/ingest-sshoc-services.action";
import { syncResourcesSearchIndexAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/sync-resources-search-index.action";
import { syncWebsiteSearchIndexAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/sync-website-search-index.action";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorPageProps extends PageProps<"/[locale]/dashboard/administrator"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard"),
	});

	return metadata;
}

export default function DashboardAdministratorPage(
	_props: Readonly<DashboardAdministratorPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Administrator dashboard")}</Heading>
			<Header className="my-(--layout-gutter) border-t">
				<HeaderContent>
					<HeaderTitle>{t("Admin tasks")}</HeaderTitle>
					<HeaderDescription>
						{t("Run maintenance tasks that sync search and service data with upstream systems.")}
					</HeaderDescription>
				</HeaderContent>
			</Header>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<AdminTaskCard
					actionLabel={t("Re-sync resources index")}
					description={t("Fetch external resources and upsert the Typesense resources collection.")}
					formAction={syncResourcesSearchIndexAction}
					title={t("Resources search index")}
				/>
				<AdminTaskCard
					actionLabel={t("Re-sync search index")}
					description={t(
						"Rebuild the website search index entries for all syncable published content.",
					)}
					formAction={syncWebsiteSearchIndexAction}
					title={t("Website search index")}
				/>
				<AdminTaskCard
					actionLabel={t("Ingest SSHOC services")}
					description={t(
						"Fetch DARIAH services from the SSHOC Marketplace and upsert them into the administrator services dataset.",
					)}
					formAction={ingestSshocServicesAction}
					title={t("SSHOC Marketplace services")}
				/>
			</div>
		</Fragment>
	);
}
