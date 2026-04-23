import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ServiceCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_components/service-create-form";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateServicePageProps {
	params: Promise<{ locale: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateServicePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - New service"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateServicePage(
	_props: Readonly<DashboardAdministratorCreateServicePageProps>,
): Promise<ReactNode> {
	const [serviceTypes, serviceStatuses, organisationalUnits] = await Promise.all([
		db.query.serviceTypes.findMany({ orderBy: { type: "asc" }, columns: { id: true, type: true } }),
		db.query.serviceStatuses.findMany({
			orderBy: { status: "asc" },
			columns: { id: true, status: true },
		}),
		db.query.organisationalUnits.findMany({
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
	]);

	return (
		<ServiceCreateForm
			organisationalUnits={organisationalUnits}
			serviceStatuses={serviceStatuses}
			serviceTypes={serviceTypes}
		/>
	);
}
