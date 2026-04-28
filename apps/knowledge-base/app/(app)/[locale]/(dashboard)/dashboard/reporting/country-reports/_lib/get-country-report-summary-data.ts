import { db } from "@dariah-eric/database";

export interface CountryReportSummaryData {
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
	}>;
	contributions: Array<{
		id: string;
		personName: string;
		orgUnitName: string;
		roleType: string;
	}>;
	socialMediaAccounts: Array<{
		socialMediaId: string;
		name: string;
		url: string;
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

export async function getCountryReportData(id: string): Promise<CountryReportData | null> {
	const report = await db.query.countryReports.findFirst({
		where: { id },
		columns: {
			id: true,
			status: true,
			totalContributors: true,
			smallEvents: true,
			mediumEvents: true,
			largeEvents: true,
			veryLargeEvents: true,
			dariahCommissionedEvent: true,
			reusableOutcomes: true,
		},
		with: {
			campaign: { columns: { year: true, status: true } },
			country: { columns: { name: true } },
			institutions: {
				columns: { id: true },
				with: {
					organisationalUnit: { columns: { name: true, acronym: true } },
				},
				orderBy: { organisationalUnitId: "asc" },
			},
			contributions: {
				columns: { id: true },
				with: {
					personToOrgUnit: {
						columns: { id: true },
						with: {
							person: { columns: { name: true } },
							organisationalUnit: { columns: { name: true } },
							roleType: { columns: { type: true } },
						},
					},
				},
			},
			socialMediaKpis: {
				columns: { socialMediaId: true, kpi: true, value: true },
				with: {
					socialMedia: { columns: { name: true, url: true } },
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
				orderBy: { projectId: "asc" },
			},
		},
	});

	if (report == null) return null;

	const socialMediaMap = new Map<
		string,
		{ name: string; url: string; kpis: Array<{ kpi: string; value: number }> }
	>();
	for (const row of report.socialMediaKpis) {
		const existing = socialMediaMap.get(row.socialMediaId);
		if (existing == null) {
			socialMediaMap.set(row.socialMediaId, {
				name: row.socialMedia.name,
				url: row.socialMedia.url,
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

	return {
		id: report.id,
		status: report.status,
		country: report.country,
		campaign: report.campaign,
		summary: {
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
					name: i.organisationalUnit.name,
					acronym: i.organisationalUnit.acronym,
				};
			}),
			contributions: report.contributions.map((c) => {
				return {
					id: c.id,
					personName: c.personToOrgUnit.person.name,
					orgUnitName: c.personToOrgUnit.organisationalUnit.name,
					roleType: c.personToOrgUnit.roleType.type,
				};
			}),
			socialMediaAccounts: Array.from(socialMediaMap.entries()).map(([socialMediaId, data]) => {
				return { socialMediaId, ...data };
			}),
			services: Array.from(serviceMap.entries()).map(([serviceId, data]) => {
				return { serviceId, ...data };
			}),
			projectContributions: report.projectContributions.map((p) => {
				return {
					id: p.id,
					projectName: p.project.name,
					amountEuros: p.amountEuros,
				};
			}),
		},
	};
}
