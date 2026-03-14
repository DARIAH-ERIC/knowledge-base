import type { Metadata, ResolvingMetadata } from "next";
import { useExtracted } from "next-intl";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";
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
	const t = useExtracted();

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">
				{t("Projects")}
			</h1>
			<TableExample />
		</Main>
	);
}
