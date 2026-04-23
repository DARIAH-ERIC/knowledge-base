import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { ServicesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_components/services-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorServicesPageProps extends PageProps<"/[locale]/dashboard/administrator/services"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorServicesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Services"),
	});

	return metadata;
}

export default function DashboardAdministratorServicesPage(
	_props: Readonly<DashboardAdministratorServicesPageProps>,
): ReactNode {
	const services = db.query.services.findMany({
		orderBy: { name: "asc" },
		columns: {
			id: true,
			name: true,
			sshocMarketplaceId: true,
		},
		with: {
			type: { columns: { type: true } },
			status: { columns: { status: true } },
		},
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<ServicesPage services={services} />
		</Suspense>
	);
}
