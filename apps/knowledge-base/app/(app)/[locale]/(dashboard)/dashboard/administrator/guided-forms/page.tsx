import { ButtonLink } from "@dariah-eric/ui/button-link";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@dariah-eric/ui/card";
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
					"Step-by-step forms for the cases which need several relations to be recorded together. Each one shows exactly what it will create before anything is saved, and writes it all at once. The regular screens remain available for editing relations individually.",
				)}
				title={t("Guided forms")}
			/>

			<div className="my-(--layout-gutter) grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<WizardCard
					actionLabel={t("Start")}
					description={t(
						"Record an institution's partnership with DARIAH-EU. Creates or selects the institution, the country it is located in, and its status towards DARIAH-EU — the country is the step most often forgotten.",
					)}
					href={wizardHref("partner-institution")}
					title={t("Partner institution of DARIAH-EU")}
				/>
				<WizardCard
					actionLabel={t("Start")}
					description={t(
						"Appoint a national coordinator, national representative, or their deputy. Records both the role in the country and the matching membership of the National Coordinator Committee or General Assembly, for the same period.",
					)}
					href={wizardHref("country-role")}
					title={t("National coordinator or representative")}
				/>
				<WizardCard
					actionLabel={t("Start")}
					description={t(
						"Close a working group or end a country's membership. Lists every person relation and unit relation that is still open on it, so they can all be ended with the same date.",
					)}
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
		<Card className="block-full">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="grow" />
			<CardFooter>
				<ButtonLink href={href} intent="secondary">
					{actionLabel}
				</ButtonLink>
			</CardFooter>
		</Card>
	);
}
