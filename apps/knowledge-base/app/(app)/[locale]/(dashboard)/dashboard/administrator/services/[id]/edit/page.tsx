import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ServiceEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_components/service-edit-form";
import {
	getOrganisationalUnitOptions,
	getOrganisationalUnitOptionsByIds,
} from "@/lib/data/organisational-units";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditServicePageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditServicePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit service"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditServicePage(
	props: Readonly<DashboardAdministratorEditServicePageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [service, serviceTypes, serviceStatuses, initialOrganisationalUnits, serviceRoles] =
		await Promise.all([
			db.query.services.findFirst({
				where: { id },
				columns: {
					id: true,
					name: true,
					sshocMarketplaceId: true,
					typeId: true,
					statusId: true,
					comment: true,
					dariahBranding: true,
					monitoring: true,
					privateSupplier: true,
				},
			}),
			db.query.serviceTypes.findMany({
				orderBy: { type: "asc" },
				columns: { id: true, type: true },
			}),
			db.query.serviceStatuses.findMany({
				orderBy: { status: "asc" },
				columns: { id: true, status: true },
			}),
			getOrganisationalUnitOptions(),
			db.query.organisationalUnitServiceRoles.findMany({ columns: { id: true, role: true } }),
		]);

	if (service == null) {
		notFound();
	}

	const unitRoleRows = await db
		.select({
			organisationalUnitId: schema.servicesToOrganisationalUnits.organisationalUnitId,
			roleId: schema.servicesToOrganisationalUnits.roleId,
		})
		.from(schema.servicesToOrganisationalUnits)
		.where(eq(schema.servicesToOrganisationalUnits.serviceId, id));

	const ownerRoleId = serviceRoles.find((r) => {
		return r.role === "service_owner";
	})?.id;
	const providerRoleId = serviceRoles.find((r) => {
		return r.role === "service_provider";
	})?.id;

	const ownerUnitIds = unitRoleRows
		.filter((r) => {
			return r.roleId === ownerRoleId;
		})
		.map((r) => {
			return r.organisationalUnitId;
		});

	const providerUnitIds = unitRoleRows
		.filter((r) => {
			return r.roleId === providerRoleId;
		})
		.map((r) => {
			return r.organisationalUnitId;
		});

	const selectedOrganisationalUnits = await getOrganisationalUnitOptionsByIds([
		...new Set([...ownerUnitIds, ...providerUnitIds]),
	]);

	return (
		<ServiceEditForm
			initialOrganisationalUnitItems={initialOrganisationalUnits.items}
			initialOrganisationalUnitTotal={initialOrganisationalUnits.total}
			selectedOrganisationalUnits={selectedOrganisationalUnits}
			service={{ ...service, ownerUnitIds, providerUnitIds }}
			serviceStatuses={serviceStatuses}
			serviceTypes={serviceTypes}
		/>
	);
}
