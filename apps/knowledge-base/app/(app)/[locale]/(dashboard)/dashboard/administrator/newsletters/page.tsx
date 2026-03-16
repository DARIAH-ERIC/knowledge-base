import type { Metadata } from "next";
import { useExtracted } from "next-intl";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { TableExample } from "@/components/ui/table-example";
import { client } from "@/lib/mailchimp/client";

interface DashboardAdministratorNewslettersPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorNewslettersPageProps>,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = {
		title: t("Administrator dashboard - Newsletters"),
	};

	return metadata;
}

export default function DashboardAdministratorNewslettersPage(
	_props: Readonly<DashboardAdministratorNewslettersPageProps>,
): ReactNode {
	const t = useExtracted();

	const _newsletters = client.get();

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">
				{t("Newsletters")}
			</h1>
			<TableExample />
		</Main>
	);
}
