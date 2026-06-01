import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

export interface ReportRouteParams {
	year: string;
	slug: string;
}

export function getCountryReportHref(year: number, slug: string): string {
	return `/dashboard/reporting/country-reports/${year}/${slug}`;
}

export function getCountryReportEditHref(year: number, slug: string, step?: string): string {
	const base = `${getCountryReportHref(year, slug)}/edit`;

	return step == null ? base : `${base}/${step}`;
}

export function getWorkingGroupReportHref(year: number, slug: string): string {
	return `/dashboard/reporting/working-group-reports/${year}/${slug}`;
}

export function getWorkingGroupReportEditHref(year: number, slug: string, step?: string): string {
	const base = `${getWorkingGroupReportHref(year, slug)}/edit`;

	return step == null ? base : `${base}/${step}`;
}

export async function resolveCountryReportId(params: ReportRouteParams): Promise<string | null> {
	const year = Number(params.year);

	if (!Number.isInteger(year)) {
		return null;
	}

	const report = await db
		.select({ id: schema.countryReports.id })
		.from(schema.countryReports)
		.innerJoin(
			schema.reportingCampaigns,
			eq(schema.reportingCampaigns.id, schema.countryReports.campaignId),
		)
		.innerJoin(schema.entities, eq(schema.entities.id, schema.countryReports.countryDocumentId))
		.where(and(eq(schema.reportingCampaigns.year, year), eq(schema.entities.slug, params.slug)))
		.limit(1);

	return report[0]?.id ?? null;
}

export async function resolveWorkingGroupReportId(
	params: ReportRouteParams,
): Promise<string | null> {
	const year = Number(params.year);

	if (!Number.isInteger(year)) {
		return null;
	}

	const report = await db
		.select({ id: schema.workingGroupReports.id })
		.from(schema.workingGroupReports)
		.innerJoin(
			schema.reportingCampaigns,
			eq(schema.reportingCampaigns.id, schema.workingGroupReports.campaignId),
		)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.workingGroupReports.workingGroupDocumentId),
		)
		.where(and(eq(schema.reportingCampaigns.year, year), eq(schema.entities.slug, params.slug)))
		.limit(1);

	return report[0]?.id ?? null;
}

export async function getCountryReportEditHrefById(id: string, step?: string): Promise<string> {
	const report = await db
		.select({
			year: schema.reportingCampaigns.year,
			slug: schema.entities.slug,
		})
		.from(schema.countryReports)
		.innerJoin(
			schema.reportingCampaigns,
			eq(schema.reportingCampaigns.id, schema.countryReports.campaignId),
		)
		.innerJoin(schema.entities, eq(schema.entities.id, schema.countryReports.countryDocumentId))
		.where(eq(schema.countryReports.id, id))
		.limit(1);

	const [item] = report;

	return item == null
		? "/dashboard/reporting/country-reports"
		: getCountryReportEditHref(item.year, item.slug, step);
}

export async function getWorkingGroupReportEditHrefById(
	id: string,
	step?: string,
): Promise<string> {
	const report = await db
		.select({
			year: schema.reportingCampaigns.year,
			slug: schema.entities.slug,
		})
		.from(schema.workingGroupReports)
		.innerJoin(
			schema.reportingCampaigns,
			eq(schema.reportingCampaigns.id, schema.workingGroupReports.campaignId),
		)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.workingGroupReports.workingGroupDocumentId),
		)
		.where(eq(schema.workingGroupReports.id, id))
		.limit(1);

	const [item] = report;

	return item == null
		? "/dashboard/reporting/working-group-reports"
		: getWorkingGroupReportEditHref(item.year, item.slug, step);
}
