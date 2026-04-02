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

interface DashboardNationalConsortiumPageProps extends PageProps<"/[locale]/dashboard/national-consortia/[code]"> {}

export async function generateMetadata(
	_props: Readonly<DashboardNationalConsortiumPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("National consortium dashboard"),
	});

	return metadata;
}

export default function DashboardNationalConsortiumPage(
	_props: Readonly<DashboardNationalConsortiumPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("National consortium dashboard")}</HeaderTitle>
				<HeaderDescription>{t("Manage national consortium.")}</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
