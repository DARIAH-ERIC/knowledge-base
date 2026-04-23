import { and, eq, inArray, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { InstitutionsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/institutions/_components/institutions-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorInstitutionsPageProps extends PageProps<"/[locale]/dashboard/administrator/institutions"> {}

type InstitutionEricRelationStatus =
	| "is_cooperating_partner_of"
	| "is_national_coordinating_institution_in"
	| "is_national_representative_institution_in"
	| "is_partner_institution_of";

async function getInstitutionsForDashboard(): Promise<
	Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			ericRelationStatuses: Array<InstitutionEricRelationStatus>;
			entity: Pick<schema.Entity, "documentId" | "slug"> & {
				status: Pick<schema.EntityStatus, "id" | "type">;
			};
		}
	>
> {
	const [institutions, erics] = await Promise.all([
		db.query.organisationalUnits.findMany({
			where: { type: { type: "institution" } },
			orderBy: { name: "asc" },
			columns: {
				id: true,
				name: true,
			},
			with: {
				entity: {
					columns: {
						documentId: true,
						slug: true,
					},
					with: {
						status: {
							columns: {
								id: true,
								type: true,
							},
						},
					},
				},
			},
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "eric" } },
			columns: { id: true },
		}),
	]);

	const institutionIds = institutions.map((institution) => {
		return institution.id;
	});
	const ericIds = erics.map((eric) => {
		return eric.id;
	});

	if (institutionIds.length === 0 || ericIds.length === 0) {
		return institutions.map((institution) => {
			return {
				...institution,
				ericRelationStatuses: [],
			};
		});
	}

	const relations = await db
		.select({
			status: schema.organisationalUnitStatus.status,
			unitId: schema.organisationalUnitsRelations.unitId,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				inArray(schema.organisationalUnitsRelations.unitId, institutionIds),
				inArray(schema.organisationalUnitsRelations.relatedUnitId, ericIds),
				inArray(schema.organisationalUnitStatus.status, [
					"is_partner_institution_of",
					"is_cooperating_partner_of",
					"is_national_coordinating_institution_in",
					"is_national_representative_institution_in",
				]),
				sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const statusesByInstitutionId = new Map<string, Array<InstitutionEricRelationStatus>>();

	for (const relation of relations) {
		const status = relation.status as InstitutionEricRelationStatus;
		const existing = statusesByInstitutionId.get(relation.unitId) ?? [];

		if (!existing.includes(status)) {
			existing.push(status);
			statusesByInstitutionId.set(relation.unitId, existing);
		}
	}

	return institutions.map((institution) => {
		return {
			...institution,
			ericRelationStatuses: statusesByInstitutionId.get(institution.id) ?? [],
		};
	});
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Institutions"),
	});

	return metadata;
}

export default function DashboardAdministratorInstitutionsPage(
	_props: Readonly<DashboardAdministratorInstitutionsPageProps>,
): ReactNode {
	const institutions = getInstitutionsForDashboard();

	return (
		<Suspense fallback={<LoadingScreen />}>
			<InstitutionsPage institutions={institutions} />
		</Suspense>
	);
}
