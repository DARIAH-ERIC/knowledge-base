import { serviceKpiCategoryEnum } from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { Label } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { getAuthorizedCountryReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { upsertCountryReportServiceKpisAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/upsert-country-report-service-kpis.action";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportServicesPageProps extends PageProps<"/[locale]/dashboard/reporting/country-reports/[id]/edit/services"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportServicesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report service KPIs"),
	});
}

function formatKpi(kpi: string): string {
	return kpi.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => {
		return c.toUpperCase();
	});
}

export default async function DashboardReportingCountryReportServicesPage(
	props: Readonly<DashboardReportingCountryReportServicesPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedCountryReportForUser(
		user,
		id,
		(id) => {
			return db.query.countryReports.findFirst({
				where: { id },
				columns: { id: true },
				with: {
					country: {
						columns: { id: true },
						with: {
							services: {
								columns: { id: true, name: true },
							},
						},
					},
					serviceKpis: {
						columns: { serviceId: true, kpi: true, value: true },
					},
				},
			});
		},
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report == null) {
		notFound();
	}

	const t = await getExtracted();

	const kpiMap = new Map(
		report.serviceKpis.map((k) => {
			return [`${k.serviceId}-${k.kpi}`, k.value];
		}),
	);

	const services = report.country.services;

	return (
		<div className="flex flex-col gap-y-8">
			{services.length === 0 ? (
				<p className="text-sm text-muted-fg">{t("No services linked to this country.")}</p>
			) : (
				<form action={upsertCountryReportServiceKpisAction}>
					<input name="id" type="hidden" value={report.id} />
					<div className="flex flex-col gap-y-8">
						{services.map((service) => {
							return (
								<section key={service.id} className="flex flex-col gap-y-4">
									<h2 className="text-sm font-semibold text-fg">{service.name}</h2>
									<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
										{serviceKpiCategoryEnum.map((kpi) => {
											const existing = kpiMap.get(`${service.id}-${kpi}`);
											return (
												<TextField
													key={kpi}
													defaultValue={existing != null ? String(existing) : undefined}
													name={`kpis.${service.id}.${kpi}`}
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
