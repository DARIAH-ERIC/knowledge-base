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

interface DashboardAdministratorSocialMediaPageProps extends PageProps<"/[locale]/dashboard/administrator/social-media"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorSocialMediaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - SocialMedia"),
	});

	return metadata;
}

export default function DashboardAdministratorSocialMediaPage(
	_props: Readonly<DashboardAdministratorSocialMediaPageProps>,
): ReactNode {
	const t = useExtracted();

	return (
		<Header>
			<HeaderContent>
				<HeaderTitle>{t("Social media")}</HeaderTitle>
				<HeaderDescription>
					{t("Manage all social media in the DARIAH knowledge base.")}
				</HeaderDescription>
			</HeaderContent>
		</Header>
	);
}
