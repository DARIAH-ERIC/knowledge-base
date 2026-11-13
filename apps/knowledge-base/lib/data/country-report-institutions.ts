import * as schema from "@dariah-eric/database/schema";

import { type Database, type Transaction, db } from "@/lib/db";
import { alias, asc, eq, sql } from "@/lib/db/sql";

export const countryReportInstitutionRepresentationPrecedence = {
	is_national_coordinating_institution_in: 1,
	is_national_representative_institution_in: 2,
	is_partner_institution_of: 3,
} as const;

export type CountryReportInstitutionRepresentation =
	keyof typeof countryReportInstitutionRepresentationPrecedence;

const countryReportInstitutionRepresentationLabels = {
	is_national_coordinating_institution_in: "National coordinating institution",
	is_national_representative_institution_in: "National representative institution",
	is_partner_institution_of: "Partner institution",
} as const satisfies Record<CountryReportInstitutionRepresentation, string>;

/** Human-readable label for an institution's representation type. */
export function formatCountryReportInstitutionRepresentationType(
	type: CountryReportInstitutionRepresentation,
): string {
	return countryReportInstitutionRepresentationLabels[type];
}

export function sortCountryReportInstitutionRepresentationTypes(
	types: Iterable<CountryReportInstitutionRepresentation>,
): Array<CountryReportInstitutionRepresentation> {
	return Array.from(new Set(types)).toSorted(
		(left, right) =>
			countryReportInstitutionRepresentationPrecedence[left] -
			countryReportInstitutionRepresentationPrecedence[right],
	);
}

export interface CountryReportInstitutionSummaryRow {
	id: string;
	organisationalUnitDocumentId: string;
	representationType: CountryReportInstitutionRepresentation | null;
	/** `isDraft`: never published, so the institution does not appear on the website yet. */
	organisationalUnit: { name: string; acronym: string | null; isDraft?: boolean } | null;
}

export interface CountryReportInstitutionSummaryItem {
	id: string;
	name: string;
	acronym: string | null;
	isDraft: boolean;
	representationTypes: Array<CountryReportInstitutionRepresentation>;
}

export function groupCountryReportInstitutionSummaryRows(
	rows: ReadonlyArray<CountryReportInstitutionSummaryRow>,
): Array<CountryReportInstitutionSummaryItem> {
	const byDocumentId = new Map<string, CountryReportInstitutionSummaryItem>();

	for (const row of rows) {
		const existing = byDocumentId.get(row.organisationalUnitDocumentId);
		if (existing == null) {
			byDocumentId.set(row.organisationalUnitDocumentId, {
				id: row.id,
				name: row.organisationalUnit?.name ?? "",
				acronym: row.organisationalUnit?.acronym ?? null,
				isDraft: row.organisationalUnit?.isDraft ?? false,
				representationTypes:
					row.representationType == null
						? []
						: sortCountryReportInstitutionRepresentationTypes([row.representationType]),
			});
		} else if (row.representationType != null) {
			existing.representationTypes = sortCountryReportInstitutionRepresentationTypes([
				...existing.representationTypes,
				row.representationType,
			]);
		}
	}

	return Array.from(byDocumentId.values()).toSorted((left, right) => {
		const leftTypeOrder =
			// oxlint-disable-next-line typescript/no-unnecessary-condition -- guards an empty `representationTypes`, which the `!` hides.
			countryReportInstitutionRepresentationPrecedence[left.representationTypes[0]!] ??
			Number.MAX_VALUE;
		const rightTypeOrder =
			// oxlint-disable-next-line typescript/no-unnecessary-condition -- guards an empty `representationTypes`, which the `!` hides.
			countryReportInstitutionRepresentationPrecedence[right.representationTypes[0]!] ??
			Number.MAX_VALUE;

		return leftTypeOrder - rightTypeOrder || left.name.localeCompare(right.name);
	});
}

/**
 * The institution rows of a country report's snapshot, each with the institution's name and
 * acronym.
 *
 * Names resolve draft-first (`COALESCE(draftId, publishedId)`), like every other reporting lookup:
 * coordinators can create a partner institution and report it before an administrator publishes it,
 * and a published-only lookup would leave such an institution without a name.
 */
export async function getCountryReportInstitutionRows(
	countryReportId: string,
	queryDb: Database | Transaction = db,
): Promise<Array<CountryReportInstitutionSummaryRow>> {
	const lifecycle = alias(schema.documentLifecycle, "country_report_institution_lifecycle");

	const rows = await queryDb
		.select({
			id: schema.countryReportInstitutions.id,
			organisationalUnitDocumentId: schema.countryReportInstitutions.organisationalUnitDocumentId,
			representationType: schema.countryReportInstitutions.representationType,
			name: schema.organisationalUnits.name,
			acronym: schema.organisationalUnits.acronym,
			isDraft: sql<boolean>`${lifecycle.publishedId} IS NULL`,
		})
		.from(schema.countryReportInstitutions)
		.leftJoin(
			lifecycle,
			eq(lifecycle.documentId, schema.countryReportInstitutions.organisationalUnitDocumentId),
		)
		.leftJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${lifecycle.draftId}, ${lifecycle.publishedId})`,
		)
		.where(eq(schema.countryReportInstitutions.countryReportId, countryReportId))
		.orderBy(asc(schema.countryReportInstitutions.organisationalUnitDocumentId));

	return rows.map((row) => {
		return {
			id: row.id,
			organisationalUnitDocumentId: row.organisationalUnitDocumentId,
			representationType: row.representationType,
			organisationalUnit:
				row.name != null ? { name: row.name, acronym: row.acronym, isDraft: row.isDraft } : null,
		};
	});
}
