import { buttonStyles } from "@dariah-eric/ui/button-styles";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { getCountryReportHeaderForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";
import { LocaleLink } from "@/lib/navigation/navigation";

interface CountryReportWelcomeScreenProps {
	reportId: string;
	/** Slug of the country the report belongs to (the report route's `slug` segment). */
	countrySlug: string;
}

export async function CountryReportWelcomeScreen(
	props: Readonly<CountryReportWelcomeScreenProps>,
): Promise<ReactNode> {
	const { reportId, countrySlug } = props;

	const { user } = await assertAuthenticated();
	const [result, scopes] = await Promise.all([
		getCountryReportHeaderForUser(user, reportId, "update"),
		getUserOrganisationalUnitScopes(user),
	]);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;

	const t = await getExtracted();

	/**
	 * Admins have no delegated scopes; they maintain consortium details from the administrator
	 * dashboard.
	 */
	const country = scopes.countries.find((item) => item.slug === countrySlug);
	const countryHref = `/dashboard/countries/${countrySlug}`;

	return (
		<div className="flex flex-col gap-y-10">
			<section className="flex flex-col gap-y-3">
				<h2 className="text-lg font-semibold text-fg">
					{t("Welcome to the {year} country report", { year: String(report.campaign.year) })}
				</h2>
				<div className="flex flex-col gap-y-3 text-sm text-muted-fg max-inline-2xl">
					<p>
						{t(
							"This report collects the activities of {country} and its national consortium for the reporting campaign. Each tab covers one section of the report, and several sections are prefilled with data from the knowledge base.",
							{ country: report.country.name },
						)}
					</p>
					<p>
						{t(
							"Work through the tabs one by one. When everything is complete, review the report on the Summary tab and submit it from there.",
						)}
					</p>
				</div>
			</section>

			<section className="flex flex-col gap-y-3 border-bs pbs-6">
				<h2 className="text-sm font-semibold text-fg">{t("Before you start")}</h2>
				<p className="text-sm text-muted-fg max-inline-2xl">
					{t(
						"Parts of this report are based on the details of your national consortium in the knowledge base, such as its people and partner institutions. Please make sure this information is up to date before you fill in the report.",
					)}
				</p>
				{country?.canEdit === true ? (
					<LocaleLink
						className={buttonStyles({ intent: "secondary", size: "sm", className: "self-start" })}
						href={`${countryHref}/edit`}
					>
						{t("Edit national consortium details")}
					</LocaleLink>
				) : country != null ? (
					<div className="flex flex-col gap-y-3">
						<p className="text-sm text-muted-fg max-inline-2xl">
							{t(
								"You cannot edit these details yourself. If something is out of date, please contact your national coordinator.",
							)}
						</p>
						<LocaleLink
							className="self-start text-sm text-fg underline underline-offset-4"
							href={countryHref}
						>
							{t("View national consortium details")}
						</LocaleLink>
					</div>
				) : null}
			</section>
		</div>
	);
}
