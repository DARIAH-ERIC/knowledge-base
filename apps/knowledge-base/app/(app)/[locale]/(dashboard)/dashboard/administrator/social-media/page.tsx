import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { SocialMediaPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_components/social-media-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorSocialMediaPageProps extends PageProps<"/[locale]/dashboard/administrator/social-media"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorSocialMediaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Social media"),
	});

	return metadata;
}

export default function DashboardAdministratorSocialMediaPage(
	_props: Readonly<DashboardAdministratorSocialMediaPageProps>,
): ReactNode {
	const socialMediaItems = db.query.socialMedia.findMany({
		orderBy: { name: "asc" },
		columns: { id: true, name: true, url: true },
		with: { type: { columns: { type: true } } },
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<SocialMediaPage socialMediaItems={socialMediaItems} />
		</Suspense>
	);
}
