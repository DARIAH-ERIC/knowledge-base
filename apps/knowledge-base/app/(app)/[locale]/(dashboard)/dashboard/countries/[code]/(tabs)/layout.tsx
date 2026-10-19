import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { ReportStepTabs } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-step-tabs";
import { assertAuthenticated } from "@/lib/auth/session";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";

interface CountryTabsLayoutProps extends LayoutProps<"/[locale]/dashboard/countries/[code]"> {}

export default async function CountryTabsLayout(
	props: Readonly<CountryTabsLayoutProps>,
): Promise<ReactNode> {
	const { children, params } = props;

	const [{ code }, { user }] = await Promise.all([params, assertAuthenticated()]);
	const scopes = await getUserOrganisationalUnitScopes(user);
	const country = scopes.countries.find((item) => item.slug === code);

	if (country == null) {
		notFound();
	}

	const t = await getExtracted();
	const href = `/dashboard/countries/${country.slug}`;

	return (
		<div>
			<Header>
				<HeaderContent>
					<HeaderTitle>{country.name}</HeaderTitle>
					<HeaderDescription>
						{country.nationalConsortium?.name ?? t("National consortium")}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="flex flex-col gap-y-6 pbs-6">
				<ReportStepTabs
					aria-label={country.name}
					steps={[
						{ href, label: t("Details") },
						{ href: `${href}/reports`, label: t("Reports") },
					]}
				/>
				<div>{children}</div>
			</div>
		</div>
	);
}
