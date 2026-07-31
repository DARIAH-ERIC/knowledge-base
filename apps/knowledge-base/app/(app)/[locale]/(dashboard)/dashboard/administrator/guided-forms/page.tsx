import { ButtonLink } from "@dariah-eric/ui/button-link";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@dariah-eric/ui/card";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import { EntityListHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { wizardHref } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/guided-forms/_lib/wizard-registry";
import { assertAdminPageAccess } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorWizardsPageProps extends PageProps<"/[locale]/dashboard/administrator/guided-forms"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWizardsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Guided forms"),
	});

	return metadata;
}

export default async function DashboardAdministratorWizardsPage(
	_props: Readonly<DashboardAdministratorWizardsPageProps>,
): Promise<ReactNode> {
	await assertAdminPageAccess();

	const t = await getExtracted();

	return (
		<Fragment>
			<EntityListHeader
				description={t(
					"For tasks that need several relations recorded together. Each form shows what it will save before anything is written.",
				)}
				title={t("Guided forms")}
			/>

			{/* Stacked, and held to the same width as the forms themselves, so the hub and the wizard it
			    opens read as one column rather than the page reflowing on the way in. */}
			<div className="my-(--layout-gutter) flex max-inline-3xl flex-col gap-y-4">
				<WizardCard
					actionLabel={t("Start")}
					description={t(
						"Records the institution, the country it is located in, and its status towards DARIAH-EU.",
					)}
					href={wizardHref("partner-institution")}
					title={t("Partner institution of DARIAH-EU")}
				/>
				<WizardCard
					actionLabel={t("Start")}
					description={t(
						"Records the role in the country and the matching seat on the National Coordinator Committee or General Assembly, for the same period.",
					)}
					href={wizardHref("country-role")}
					title={t("National coordinator or representative")}
				/>
				<WizardCard
					actionLabel={t("Start")}
					description={t("Ends everything still open on a working group or country, on one date.")}
					href={wizardHref("retire-unit")}
					title={t("Retire a unit")}
				/>
			</div>
		</Fragment>
	);
}

interface WizardCardProps {
	actionLabel: string;
	description: string;
	href: string;
	title: string;
}

function WizardCard(props: Readonly<WizardCardProps>): ReactNode {
	const { actionLabel, description, href, title } = props;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardFooter>
				<ButtonLink href={href} intent="secondary">
					{actionLabel}
				</ButtonLink>
			</CardFooter>
		</Card>
	);
}
