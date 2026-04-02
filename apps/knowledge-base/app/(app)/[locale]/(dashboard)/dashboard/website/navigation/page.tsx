import type { Metadata, ResolvingMetadata } from "next";
import { useExtracted } from "next-intl";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
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
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Website navigation")}</HeaderTitle>
				<HeaderDescription>{t("Manage website navigation.")}</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
