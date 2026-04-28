import { db } from "@dariah-eric/database";
import { socialMediaKpiCategoryEnum } from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { Label } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { upsertCountryReportSocialMediaKpisAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/upsert-country-report-social-media-kpis.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportSocialMediaPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportSocialMediaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report social media KPIs"),
	});
}

function formatKpi(kpi: string): string {
	return kpi.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => {
		return c.toUpperCase();
	});
}

export default async function DashboardReportingCountryReportSocialMediaPage(
	props: Readonly<DashboardReportingCountryReportSocialMediaPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const [report] = await Promise.all([
		db.query.countryReports.findFirst({
			where: { id },
			columns: { id: true },
			with: {
				country: {
					columns: { id: true },
					with: {
						socialMedia: {
							columns: { id: true, name: true, url: true },
						},
					},
				},
				socialMediaKpis: {
					columns: { socialMediaId: true, kpi: true, value: true },
				},
			},
		}),
		assertAuthenticated(),
	]);

	if (report == null) {
		notFound();
	}

	const t = await getExtracted();

	const kpiMap = new Map(
		report.socialMediaKpis.map((k) => {
			return [`${k.socialMediaId}-${k.kpi}`, k.value];
		}),
	);

	const accounts = report.country.socialMedia;

	return (
		<div className="flex flex-col gap-y-8">
			{accounts.length === 0 ? (
				<p className="text-sm text-muted-fg">
					{t("No social media accounts linked to this country.")}
				</p>
			) : (
				<form action={upsertCountryReportSocialMediaKpisAction}>
					<input name="id" type="hidden" value={report.id} />
					<div className="flex flex-col gap-y-8">
						{accounts.map((account) => {
							return (
								<section key={account.id} className="flex flex-col gap-y-4">
									<div className="space-y-1">
										<h2 className="text-sm font-semibold text-fg">{account.name}</h2>
										<p className="text-xs text-muted-fg">{account.url}</p>
									</div>
									<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
										{socialMediaKpiCategoryEnum.map((kpi) => {
											const existing = kpiMap.get(`${account.id}-${kpi}`);
											return (
												<TextField
													key={kpi}
													defaultValue={existing != null ? String(existing) : undefined}
													name={`kpis.${account.id}.${kpi}`}
													type="number"
												>
													<Label className="text-xs">{formatKpi(kpi)}</Label>
													<Input min={0} />
												</TextField>
											);
										})}
									</div>
								</section>
							);
						})}
					</div>
					<div className="mt-6">
						<Button type="submit">{t("Save")}</Button>
					</div>
				</form>
			)}
		</div>
	);
}
