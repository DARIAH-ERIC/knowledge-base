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
			countryName: string | null;
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

	if (institutionIds.length === 0) {
		return institutions.map((institution) => {
			return {
				...institution,
				countryName: null,
				ericRelationStatuses: [],
			};
		});
	}

	const [relations, countries] = await Promise.all([
		ericIds.length > 0
			? db
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
					)
			: Promise.resolve([]),
		db
			.select({
				countryName: schema.organisationalUnits.name,
				unitId: schema.organisationalUnitsRelations.unitId,
			})
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.organisationalUnitsRelations.relatedUnitId),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(
				and(
					inArray(schema.organisationalUnitsRelations.unitId, institutionIds),
					eq(schema.organisationalUnitStatus.status, "is_located_in"),
					eq(schema.organisationalUnitTypes.type, "country"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
				),
			),
	]);

	const statusesByInstitutionId = new Map<string, Array<InstitutionEricRelationStatus>>();
	const countryNameByInstitutionId = new Map<string, string>();

	for (const relation of relations) {
		const status = relation.status as InstitutionEricRelationStatus;
		const existing = statusesByInstitutionId.get(relation.unitId) ?? [];

		if (!existing.includes(status)) {
			existing.push(status);
			statusesByInstitutionId.set(relation.unitId, existing);
		}
	}

	for (const country of countries) {
		if (!countryNameByInstitutionId.has(country.unitId)) {
			countryNameByInstitutionId.set(country.unitId, country.countryName);
		}
	}

	return institutions.map((institution) => {
		return {
			...institution,
			countryName: countryNameByInstitutionId.get(institution.id) ?? null,
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
