import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, eq, sql } from "@/lib/db/sql";

export type ServiceKpiCategory = (typeof schema.serviceKpiCategoryEnum)[number];

export interface CountryService {
	id: string;
	name: string;
}

/**
 * The services a country reports on for a given campaign `year`. Services attach to the country's
 * **national consortium** (sshoc marketplace actor ids are mapped to consortia), not to the country
 * org unit directly — so resolve the consortium via the document-level `is_national_consortium_of`
 * relation (guarded by org-unit type + active in the reporting year, matching the software screen),
 * then its services.
 */
export async function getCountryServices(
	countryDocumentId: string,
	year: number,
): Promise<Array<CountryService>> {
	return db
		.selectDistinct({ id: schema.services.id, name: schema.services.name })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.organisationalUnitsRelations.unitDocumentId),
		)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.innerJoin(
			schema.servicesToOrganisationalUnits,
			eq(
				schema.servicesToOrganisationalUnits.organisationalUnitDocumentId,
				schema.organisationalUnitsRelations.unitDocumentId,
			),
		)
		.innerJoin(
			schema.services,
			eq(schema.services.id, schema.servicesToOrganisationalUnits.serviceId),
		)
		.where(
			and(
				eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, countryDocumentId),
				eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
				eq(
					schema.organisationalUnitTypes.type,
					"national_consortium" as typeof schema.organisationalUnitTypes.$inferSelect.type,
				),
				sql`
					${schema.organisationalUnitsRelations.duration} && tstzrange (
						MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
						MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
					)
				`,
			),
		)
		.orderBy(schema.services.name);
}

export interface ReportServiceWithKpis extends CountryService {
	kpis: Array<{ kpi: ServiceKpiCategory; value: number }>;
}

/**
 * The country's services (via its consortium) together with the KPI values recorded for this
 * report.
 */
export async function getCountryReportServices(
	countryReportId: string,
	countryDocumentId: string,
	year: number,
): Promise<Array<ReportServiceWithKpis>> {
	const services = await getCountryServices(countryDocumentId, year);
	if (services.length === 0) {
		return [];
	}

	const kpiRows = await db.query.countryReportServiceKpis.findMany({
		where: { countryReportId },
		columns: { serviceId: true, kpi: true, value: true },
	});
	const kpisByService = new Map<string, Array<{ kpi: ServiceKpiCategory; value: number }>>();
	for (const row of kpiRows) {
		const list = kpisByService.get(row.serviceId) ?? [];
		list.push({ kpi: row.kpi, value: row.value });
		kpisByService.set(row.serviceId, list);
	}

	return services.map((service) => {
		return { ...service, kpis: kpisByService.get(service.id) ?? [] };
	});
}
