import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ServiceCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_components/service-create-form";
import { getOrganisationalUnitOptions } from "@/lib/data/organisational-units";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

export async function generateMetadata(
	_props: unknown,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - New service"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateServicePage(
	_props: unknown,
): Promise<ReactNode> {
	const [serviceTypes, serviceStatuses, initialOrganisationalUnits] = await Promise.all([
		db.query.serviceTypes.findMany({ orderBy: { type: "asc" }, columns: { id: true, type: true } }),
		db.query.serviceStatuses.findMany({
			orderBy: { status: "asc" },
			columns: { id: true, status: true },
		}),
		getOrganisationalUnitOptions(),
	]);

	return (
		<ServiceCreateForm
			initialOrganisationalUnitItems={initialOrganisationalUnits.items}
			initialOrganisationalUnitTotal={initialOrganisationalUnits.total}
			serviceStatuses={serviceStatuses}
			serviceTypes={serviceTypes}
		/>
	);
}
