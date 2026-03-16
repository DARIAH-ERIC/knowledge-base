import type { Metadata, ResolvingMetadata } from "next";
import { useExtracted } from "next-intl";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteNavigationPageProps extends PageProps<"/[locale]/dashboard/website/navigation"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNavigationPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Navigation"),
	});

	return metadata;
}

export default function DashboardWebsiteNavigationPage(
	_props: Readonly<DashboardWebsiteNavigationPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">
				{t("Navigation")}
			</h1>
		</Main>
	);
}
