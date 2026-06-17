import { assert } from "@acdh-oeaw/lib";
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";

import { type Action, can } from "@/lib/auth/permissions";
import { classifyCompensationRole } from "@/lib/data/report-contributions";
import { db } from "@/lib/db";
import { alias, eq, sql } from "@/lib/db/sql";

export interface CountryReportSummaryData {
	operationalCost: {
		total: number;
		threshold: number | null;
		lines: Array<{
			key: string;
			label: string;
			quantity: number;
			unitAmount: number;
			total: number;
		}>;
	};
	totalContributors: number | null;
	smallEvents: number | null;
	mediumEvents: number | null;
	largeEvents: number | null;
	veryLargeEvents: number | null;
	dariahCommissionedEvent: string | null;
	reusableOutcomes: string | null;
	institutions: Array<{
		id: string;
		name: string;
		acronym: string | null;
		representationType: string | null;
	}>;
	contributions: Array<{
		id: string;
		personName: string;
		orgUnitName: string;
		roleType: string;
		/**
		 * Effective compensation role (stored, or classified from the relation); null if not
		 * compensated.
		 */
		compensationRole: string | null;
	}>;
	socialMediaAccounts: Array<{
		socialMediaId: string;
		name: string;
		url: string;
		type: string;
		kpis: Array<{ kpi: string; value: number }>;
	}>;
	services: Array<{
		serviceId: string;
		name: string;
		kpis: Array<{ kpi: string; value: number }>;
	}>;
	projectContributions: Array<{
		id: string;
		projectName: string;
		amountEuros: number;
	}>;
}

export interface CountryReportData {
	id: string;
	status: string;
	country: { name: string };
	campaign: { year: number; status: string };
	summary: CountryReportSummaryData;
}

interface OperationalCostCampaignData {
	contributionAmounts: Array<{ roleType: string; amount: number }>;
	countryThresholds: Array<{ countryDocumentId: string; amount: number }>;
	eventAmounts: Array<{ eventType: string; amount: number }>;
	serviceSizes: Array<{ serviceSize: string; visitsThreshold: number | null; amount: number }>;
	socialMediaAmounts: Array<{ category: string; amount: number }>;
}

export interface CountryReportHeaderData {
	id: string;
	country: { name: string };
	campaign: { year: number };
}

export type AuthorizedCountryReportResult<T> =
	| { status: "forbidden" | "not-found" }
	| { status: "ok"; data: T };

async function getCountryReportData(id: string): Promise<CountryReportData | null> {
	const report = await db.query.countryReports.findFirst({
		where: { id },
		columns: {
			id: true,
			status: true,
			countryDocumentId: true,
			totalContributors: true,
			smallEvents: true,
			mediumEvents: true,
			largeEvents: true,
			veryLargeEvents: true,
			dariahCommissionedEvent: true,
			reusableOutcomes: true,
		},
		with: {
			campaign: {
				columns: { year: true, status: true },
				with: {
					contributionAmounts: { columns: { roleType: true, amount: true } },
					countryThresholds: { columns: { countryDocumentId: true, amount: true } },
					eventAmounts: { columns: { eventType: true, amount: true } },
					serviceSizes: {
						columns: { serviceSize: true, visitsThreshold: true, amount: true },
					},
					socialMediaAmounts: { columns: { category: true, amount: true } },
				},
			},
			country: { columns: { name: true } },
			institutions: {
				columns: { id: true, representationType: true },
				with: {
					organisationalUnit: { columns: { name: true, acronym: true } },
				},
				orderBy: { organisationalUnitDocumentId: "asc" },
			},
			socialMediaKpis: {
				columns: { socialMediaId: true, kpi: true, value: true },
				with: {
					socialMedia: {
						columns: { name: true, url: true },
						with: { type: { columns: { type: true } } },
					},
				},
			},
			serviceKpis: {
				columns: { serviceId: true, kpi: true, value: true },
				with: {
					service: { columns: { name: true } },
				},
			},
			projectContributions: {
				columns: { id: true, amountEuros: true },
				with: {
					project: { columns: { name: true } },
				},
				orderBy: { projectDocumentId: "asc" },
			},
		},
	});

	if (report == null) {
		return null;
	}

	// Claimed contributions are document-level person↔org relations; resolve each endpoint to its
	// latest editable version for display.
	const personDocumentLifecycle = alias(schema.documentLifecycle, "person_document_lifecycle");
	const organisationalUnitDocumentLifecycle = alias(
		schema.documentLifecycle,
		"organisational_unit_document_lifecycle",
	);
	const organisationalUnitEntities = alias(schema.entities, "organisational_unit_entities");
	const contributionRows = await db
		.select({
			id: schema.countryReportContributions.id,
			storedRole: schema.countryReportContributions.contributionRole,
			personName: schema.persons.name,
			orgUnitName: schema.organisationalUnits.name,
			orgUnitSlug: organisationalUnitEntities.slug,
			orgUnitType: schema.organisationalUnitTypes.type,
			roleType: schema.personRoleTypes.type,
		})
		.from(schema.countryReportContributions)
		.innerJoin(
			schema.personsToOrganisationalUnits,
			eq(
				schema.personsToOrganisationalUnits.id,
				schema.countryReportContributions.personToOrgUnitId,
			),
		)
		.innerJoin(
			personDocumentLifecycle,
			eq(personDocumentLifecycle.documentId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(
			schema.persons,
			sql`${schema.persons.id} = COALESCE(${personDocumentLifecycle.draftId}, ${personDocumentLifecycle.publishedId})`,
		)
		.innerJoin(
			organisationalUnitEntities,
			eq(
				organisationalUnitEntities.id,
				schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
			),
		)
		.innerJoin(
			organisationalUnitDocumentLifecycle,
			eq(organisationalUnitDocumentLifecycle.documentId, organisationalUnitEntities.id),
		)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${organisationalUnitDocumentLifecycle.draftId}, ${organisationalUnitDocumentLifecycle.publishedId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.where(eq(schema.countryReportContributions.countryReportId, id));

	const reportContributions = contributionRows.map((row) => {
		return {
			id: row.id,
			personName: row.personName,
			orgUnitName: row.orgUnitName,
			roleType: row.roleType,
			compensationRole:
				row.storedRole ?? classifyCompensationRole(row.roleType, row.orgUnitSlug, row.orgUnitType),
		};
	});

	const socialMediaMap = new Map<
		string,
		{ name: string; url: string; type: string; kpis: Array<{ kpi: string; value: number }> }
	>();
	for (const row of report.socialMediaKpis) {
		const existing = socialMediaMap.get(row.socialMediaId);
		if (existing == null) {
			socialMediaMap.set(row.socialMediaId, {
				name: row.socialMedia.name,
				url: row.socialMedia.url,
				type: row.socialMedia.type.type,
				kpis: [{ kpi: row.kpi, value: row.value }],
			});
		} else {
			existing.kpis.push({ kpi: row.kpi, value: row.value });
		}
	}

	const serviceMap = new Map<
		string,
		{ name: string; kpis: Array<{ kpi: string; value: number }> }
	>();
	for (const row of report.serviceKpis) {
		const existing = serviceMap.get(row.serviceId);
		if (existing == null) {
			serviceMap.set(row.serviceId, {
				name: row.service.name,
				kpis: [{ kpi: row.kpi, value: row.value }],
			});
		} else {
			existing.kpis.push({ kpi: row.kpi, value: row.value });
		}
	}

	// A country report always references a published country.
	assert(report.country, "Country report is missing its published country.");

	const summary = {
		totalContributors: report.totalContributors,
		smallEvents: report.smallEvents,
		mediumEvents: report.mediumEvents,
		largeEvents: report.largeEvents,
		veryLargeEvents: report.veryLargeEvents,
		dariahCommissionedEvent: report.dariahCommissionedEvent,
		reusableOutcomes: report.reusableOutcomes,
		institutions: report.institutions.map((i) => {
			return {
				id: i.id,
				name: i.organisationalUnit?.name ?? "",
				acronym: i.organisationalUnit?.acronym ?? null,
				representationType: i.representationType,
			};
		}),
		contributions: reportContributions,
		socialMediaAccounts: Array.from(socialMediaMap.entries()).map(([socialMediaId, data]) => {
			return { socialMediaId, ...data };
		}),
		services: Array.from(serviceMap.entries()).map(([serviceId, data]) => {
			return { serviceId, ...data };
		}),
		projectContributions: report.projectContributions.map((p) => {
			return {
				id: p.id,
				projectName: p.project?.name ?? "",
				amountEuros: p.amountEuros,
			};
		}),
	};
	const operationalCost = calculateOperationalCost({
		...summary,
		campaign: report.campaign,
		countryDocumentId: report.countryDocumentId,
	});

	return {
		id: report.id,
		status: report.status,
		country: report.country,
		campaign: report.campaign,
		summary: {
			operationalCost,
			...summary,
		},
	};
}

type OperationalCostLine = CountryReportSummaryData["operationalCost"]["lines"][number];

function addOperationalCostLine(
	lines: Array<OperationalCostLine>,
	key: string,
	label: string,
	quantity: number,
	unitAmount: number | undefined,
): void {
	if (quantity <= 0 || unitAmount == null) {
		return;
	}

	lines.push({ key, label, quantity, unitAmount, total: quantity * unitAmount });
}

function calculateOperationalCost(
	summary: Omit<CountryReportSummaryData, "operationalCost"> & {
		campaign: OperationalCostCampaignData;
		countryDocumentId: string;
	},
): CountryReportSummaryData["operationalCost"] {
	const contributionAmounts = new Map(
		summary.campaign.contributionAmounts.map((amount) => [amount.roleType, amount.amount]),
	);
	const eventAmounts = new Map(
		summary.campaign.eventAmounts.map((amount) => [amount.eventType, amount.amount]),
	);
	const socialMediaAmounts = new Map(
		summary.campaign.socialMediaAmounts.map((amount) => [amount.category, amount.amount]),
	);
	const lines: Array<OperationalCostLine> = [];

	const contributionCounts = new Map<string, number>();
	for (const contribution of summary.contributions) {
		if (contribution.compensationRole != null) {
			contributionCounts.set(
				contribution.compensationRole,
				(contributionCounts.get(contribution.compensationRole) ?? 0) + 1,
			);
		}
	}
	for (const [role, quantity] of contributionCounts) {
		addOperationalCostLine(
			lines,
			`contribution-${role}`,
			`Contribution: ${role}`,
			quantity,
			contributionAmounts.get(role),
		);
	}

	addOperationalCostLine(
		lines,
		"events-small",
		"Small events",
		summary.smallEvents ?? 0,
		eventAmounts.get("small"),
	);
	addOperationalCostLine(
		lines,
		"events-medium",
		"Medium events",
		summary.mediumEvents ?? 0,
		eventAmounts.get("medium"),
	);
	addOperationalCostLine(
		lines,
		"events-large",
		"Large events",
		summary.largeEvents ?? 0,
		eventAmounts.get("large"),
	);
	addOperationalCostLine(
		lines,
		"events-very-large",
		"Very large events",
		summary.veryLargeEvents ?? 0,
		eventAmounts.get("very_large"),
	);
	addOperationalCostLine(
		lines,
		"events-dariah-commissioned",
		"DARIAH commissioned event",
		summary.dariahCommissionedEvent == null || summary.dariahCommissionedEvent === "" ? 0 : 1,
		eventAmounts.get("dariah_commissioned"),
	);

	for (const account of summary.socialMediaAccounts) {
		const category = account.type === "website" ? "website" : "other";
		const hasKpis = account.kpis.some((kpi) => kpi.value > 0);
		addOperationalCostLine(
			lines,
			`social-media-${account.socialMediaId}`,
			`Social media: ${account.name}`,
			hasKpis ? 1 : 0,
			socialMediaAmounts.get(category),
		);
	}

	const serviceSizeAmounts = summary.campaign.serviceSizes.toSorted(
		(left, right) => (right.visitsThreshold ?? 0) - (left.visitsThreshold ?? 0),
	);
	for (const service of summary.services) {
		const visits = service.kpis.find((kpi) => kpi.kpi === "visits")?.value ?? 0;
		const size = serviceSizeAmounts.find((candidate) => visits >= (candidate.visitsThreshold ?? 0));
		addOperationalCostLine(
			lines,
			`service-${service.serviceId}`,
			`Service: ${service.name}`,
			size == null ? 0 : 1,
			size?.amount,
		);
	}

	for (const contribution of summary.projectContributions) {
		addOperationalCostLine(
			lines,
			`project-${contribution.id}`,
			`Project contribution: ${contribution.projectName}`,
			1,
			contribution.amountEuros,
		);
	}

	return {
		total: lines.reduce((sum, line) => sum + line.total, 0),
		threshold:
			summary.campaign.countryThresholds.find(
				(threshold) => threshold.countryDocumentId === summary.countryDocumentId,
			)?.amount ?? null,
		lines,
	};
}

async function getCountryReportHeader(id: string): Promise<CountryReportHeaderData | null> {
	const report = await db.query.countryReports.findFirst({
		where: { id },
		columns: { id: true },
		with: {
			campaign: { columns: { year: true } },
			country: { columns: { name: true } },
		},
	});

	if (report == null) {
		return null;
	}

	// A country report always references a published country.
	assert(report.country, "Country report is missing its published country.");

	return {
		id: report.id,
		country: report.country,
		campaign: report.campaign,
	};
}

export async function getCountryReportDataForUser(
	user: User,
	id: string,
	action: Extract<Action, "read" | "update"> = "read",
): Promise<AuthorizedCountryReportResult<CountryReportData>> {
	return getAuthorizedCountryReportForUser(user, id, getCountryReportData, action);
}

export async function getCountryReportHeaderForUser(
	user: User,
	id: string,
	action: Extract<Action, "read" | "update"> = "read",
): Promise<AuthorizedCountryReportResult<CountryReportHeaderData>> {
	return getAuthorizedCountryReportForUser(user, id, getCountryReportHeader, action);
}

export async function getAuthorizedCountryReportForUser<T>(
	user: User,
	id: string,
	load: (id: string) => Promise<T | null>,
	action: Extract<Action, "read" | "update"> = "read",
): Promise<AuthorizedCountryReportResult<T>> {
	const header = await getCountryReportHeader(id);

	if (header == null) {
		return { status: "not-found" };
	}

	const allowed = await can(user, action, { type: "country_report", id });

	if (!allowed) {
		return { status: "forbidden" };
	}

	const report = await load(id);

	if (report == null) {
		return { status: "not-found" };
	}

	return { status: "ok", data: report };
}
