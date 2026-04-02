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

interface DashboardWebsiteMetadataPageProps extends PageProps<"/[locale]/dashboard/website/metadata"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteMetadataPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Metadata"),
	});

	return metadata;
}

export default function DashboardWebsiteMetadataPage(
	_props: Readonly<DashboardWebsiteMetadataPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Website metadata")}</HeaderTitle>
				<HeaderDescription>{t("Manage website metadata.")}</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
