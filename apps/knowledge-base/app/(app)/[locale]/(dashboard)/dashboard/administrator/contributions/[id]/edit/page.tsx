import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ContributionEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-edit-form";
import { getContributionRoleOptions } from "@/lib/data/contributions";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditContributionPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditContributionPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit contribution"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditContributionPage(
	props: Readonly<DashboardAdministratorEditContributionPageProps>,
): Promise<ReactNode> {
	const { params } = props;
	const { id } = await params;

	const [contribution, roleOptions] = await Promise.all([
		db
			.select({
				id: schema.personsToOrganisationalUnits.id,
				personId: schema.persons.id,
				personName: schema.persons.name,
				roleTypeId: schema.personRoleTypes.id,
				organisationalUnitId: schema.organisationalUnits.id,
				organisationalUnitName: schema.organisationalUnits.name,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.persons,
				eq(schema.persons.id, schema.personsToOrganisationalUnits.personId),
			)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
			)
			.where(eq(schema.personsToOrganisationalUnits.id, id))
			.limit(1)
			.then((rows) => {
				return rows[0] ?? null;
			}),
		getContributionRoleOptions(),
	]);

	if (contribution == null) {
		notFound();
	}

	return (
		<ContributionEditForm
			contribution={{
				id: contribution.id,
				durationEnd: contribution.duration.end?.toISOString().slice(0, 10) ?? null,
				durationStart: contribution.duration.start.toISOString().slice(0, 10),
				organisationalUnit: {
					id: contribution.organisationalUnitId,
					name: contribution.organisationalUnitName,
				},
				person: { id: contribution.personId, name: contribution.personName },
				roleTypeId: contribution.roleTypeId,
			}}
			roleOptions={roleOptions}
		/>
	);
}
