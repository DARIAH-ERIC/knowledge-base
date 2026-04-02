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

interface DashboardNationalConsortiumReportsPageProps extends PageProps<"/[locale]/dashboard/national-consortia/[code]/reports"> {}

export async function generateMetadata(
	_props: Readonly<DashboardNationalConsortiumReportsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("National consortium dashboard - Reports"),
	});

	return metadata;
}

export default function DashboardNationalConsortiumReportsPage(
	_props: Readonly<DashboardNationalConsortiumReportsPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Reports")}</HeaderTitle>
				<HeaderDescription>{t("Manage national consortium reports.")}</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
