import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { ContributionsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contributions-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorContributionsPageProps extends PageProps<"/[locale]/dashboard/administrator/contributions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorContributionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Contributions"),
	});

	return metadata;
}

export default function DashboardAdministratorContributionsPage(
	_props: Readonly<DashboardAdministratorContributionsPageProps>,
): ReactNode {
	const contributions = db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personName: schema.persons.name,
			roleType: schema.personRoleTypes.type,
			organisationalUnitName: schema.organisationalUnits.name,
			organisationalUnitType: schema.organisationalUnitTypes.type,
			durationStart: schema.personsToOrganisationalUnits.duration,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(schema.persons, eq(schema.persons.id, schema.personsToOrganisationalUnits.personId))
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.orderBy(schema.persons.name)
		.then((rows) => {
			return rows.map((row) => {
				return {
					id: row.id,
					personName: row.personName,
					roleType: row.roleType,
					organisationalUnitName: row.organisationalUnitName,
					organisationalUnitType: row.organisationalUnitType,
					durationStart: row.durationStart.start,
					durationEnd: row.durationStart.end,
				};
			});
		});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<ContributionsPage contributions={contributions} />
		</Suspense>
	);
}
