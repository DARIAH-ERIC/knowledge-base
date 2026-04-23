import { and, eq, inArray, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { NationalConsortiaPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/national-consortia/_components/national-consortia-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorNationalConsortiaPageProps extends PageProps<"/[locale]/dashboard/administrator/national-consortia"> {}

async function getNationalConsortiaForDashboard(): Promise<
	Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			countryName: string | null;
			entity: Pick<schema.Entity, "documentId" | "slug"> & {
				status: Pick<schema.EntityStatus, "id" | "type">;
			};
		}
	>
> {
	const nationalConsortia = await db.query.organisationalUnits.findMany({
		where: { type: { type: "national_consortium" } },
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
	});

	const nationalConsortiumIds = nationalConsortia.map((unit) => {
		return unit.id;
	});

	if (nationalConsortiumIds.length === 0) {
		return nationalConsortia.map((unit) => {
			return {
				...unit,
				countryName: null,
			};
		});
	}

	const relatedCountries = await db
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
				inArray(schema.organisationalUnitsRelations.unitId, nationalConsortiumIds),
				eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
				eq(schema.organisationalUnitTypes.type, "country"),
				sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const countryNameByUnitId = new Map<string, string>();

	for (const relation of relatedCountries) {
		if (!countryNameByUnitId.has(relation.unitId)) {
			countryNameByUnitId.set(relation.unitId, relation.countryName);
		}
	}

	return nationalConsortia.map((unit) => {
		return {
			...unit,
			countryName: countryNameByUnitId.get(unit.id) ?? null,
		};
	});
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorNationalConsortiaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - National consortia"),
	});

	return metadata;
}

export default function DashboardAdministratorNationalConsortiaPage(
	_props: Readonly<DashboardAdministratorNationalConsortiaPageProps>,
): ReactNode {
	const nationalConsortia = getNationalConsortiaForDashboard();

	return (
		<Suspense fallback={<LoadingScreen />}>
			<NationalConsortiaPage nationalConsortia={nationalConsortia} />
		</Suspense>
	);
}
