import { and, eq, inArray } from "@dariah-eric/database";
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
			duration: schema.organisationalUnitsRelations.duration,
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
			),
		);

	const countryByUnitId = new Map<string, { from: Date; name: string; until: Date | null }>();

	for (const relation of relatedCountries) {
		const existing = countryByUnitId.get(relation.unitId);
		const nextRelation = {
			from: relation.duration.start,
			name: relation.countryName,
			until: relation.duration.end ?? null,
		};

		if (existing == null) {
			countryByUnitId.set(relation.unitId, nextRelation);
			continue;
		}

		const shouldReplace =
			(existing.until != null && nextRelation.until == null) || nextRelation.from > existing.from;

		if (shouldReplace) {
			countryByUnitId.set(relation.unitId, nextRelation);
		}
	}

	return nationalConsortia.map((unit) => {
		return {
			...unit,
			countryName: countryByUnitId.get(unit.id)?.name ?? null,
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
