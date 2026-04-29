import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ContributionCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-create-form";
import { getContributionPersonOptions, getContributionRoleOptions } from "@/lib/data/contributions";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorCreateContributionPageProps extends PageProps<"/[locale]/dashboard/administrator/contributions/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorCreateContributionPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Create contribution"),
	});

	return metadata;
}

export default async function DashboardAdministratorCreateContributionPage(
	_props: Readonly<DashboardAdministratorCreateContributionPageProps>,
): Promise<ReactNode> {
	const [roleOptions, { items: initialPersons, total: initialPersonsTotal }] = await Promise.all([
		getContributionRoleOptions(),
		getContributionPersonOptions(),
	]);

	return (
		<ContributionCreateForm
			initialPersons={initialPersons}
			initialPersonsTotal={initialPersonsTotal}
			roleOptions={roleOptions}
		/>
	);
}
