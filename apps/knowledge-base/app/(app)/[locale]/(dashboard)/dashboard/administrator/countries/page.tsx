import { and, eq, inArray, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { CountriesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_components/countries-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCountriesPageProps extends PageProps<"/[locale]/dashboard/administrator/countries"> {}

type CountryMemberObserverStatus = "is_member_of" | "is_observer_of" | null;

async function getCountriesForDashboard(): Promise<
	Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			memberObserverFrom: Date | null;
			memberObserverStatus: CountryMemberObserverStatus;
			memberObserverUntil: Date | null;
			entity: Pick<schema.Entity, "documentId" | "slug"> & {
				status: Pick<schema.EntityStatus, "id" | "type">;
			};
		}
	>
> {
	const [countries, erics] = await Promise.all([
		db.query.organisationalUnits.findMany({
			where: { type: { type: "country" } },
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

	const countryIds = countries.map((country) => {
		return country.id;
	});
	const ericIds = erics.map((eric) => {
		return eric.id;
	});

	if (countryIds.length === 0 || ericIds.length === 0) {
		return countries.map((country) => {
			return {
				...country,
				memberObserverFrom: null,
				memberObserverStatus: null,
				memberObserverUntil: null,
			};
		});
	}

	const relations = await db
		.select({
			duration: schema.organisationalUnitsRelations.duration,
			unitId: schema.organisationalUnitsRelations.unitId,
			status: schema.organisationalUnitStatus.status,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				inArray(schema.organisationalUnitsRelations.unitId, countryIds),
				inArray(schema.organisationalUnitsRelations.relatedUnitId, ericIds),
				inArray(schema.organisationalUnitStatus.status, ["is_member_of", "is_observer_of"]),
				sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const relationByCountryId = new Map<
		string,
		{
			from: Date;
			status: Exclude<CountryMemberObserverStatus, null>;
			until: Date | null;
		}
	>();

	for (const relation of relations) {
		if (!relationByCountryId.has(relation.unitId)) {
			relationByCountryId.set(relation.unitId, {
				from: relation.duration.start,
				status: relation.status as Exclude<CountryMemberObserverStatus, null>,
				until: relation.duration.end ?? null,
			});
		}
	}

	return countries.map((country) => {
		const relation = relationByCountryId.get(country.id);

		return {
			...country,
			memberObserverFrom: relation?.from ?? null,
			memberObserverStatus: relation?.status ?? null,
			memberObserverUntil: relation?.until ?? null,
		};
	});
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCountriesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Countries"),
	});

	return metadata;
}

export default function DashboardAdministratorCountriesPage(
	_props: Readonly<DashboardAdministratorCountriesPageProps>,
): ReactNode {
	const countries = getCountriesForDashboard();

	return (
		<Suspense fallback={<LoadingScreen />}>
			<CountriesPage countries={countries} />
		</Suspense>
	);
}
