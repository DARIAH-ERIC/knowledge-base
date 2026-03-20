import type { Metadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { NewslettersPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/newsletters/_components/newsletters-page";
import { mailchimp } from "@/lib/mailchimp";

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
	const newsletters = mailchimp.get({ count: 1000 }).then((result) => {
		return result.unwrap().data;
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<NewslettersPage newsletters={newsletters} />
		</Suspense>
	);
}
