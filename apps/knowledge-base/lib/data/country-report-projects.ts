import * as schema from "@dariah-eric/database/schema";

import { latestEditableEntityVersionWhere } from "@/lib/data/current-entity-version";
import { type Database, type Transaction, db } from "@/lib/db";
import { alias, and, asc, eq, sql } from "@/lib/db/sql";

export interface CountryReportProjectOption {
	/** The project document id (entities.id), matching `project_document_id` on a contribution. */
	id: string;
	name: string;
	/** Never published; coordinators can create a project and report it before it is published. */
	isDraft: boolean;
}

/**
 * Projects a country report can record a contribution to, one row per document, resolved
 * draft-first. Draft-only projects are included so a coordinator can report a project they just
 * created, before an administrator publishes it.
 */
export async function getCountryReportProjectOptions(
	queryDb: Database | Transaction = db,
	projectDocumentId?: string,
): Promise<Array<CountryReportProjectOption>> {
	return queryDb
		.select({
			id: schema.entityVersions.entityId,
			name: schema.projects.name,
			isDraft: sql<boolean>`${schema.documentLifecycle.publishedId} IS NULL`,
		})
		.from(schema.projects)
		.innerJoin(schema.entityVersions, eq(schema.projects.id, schema.entityVersions.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.entityVersions.entityId),
		)
		.where(
			and(
				latestEditableEntityVersionWhere(),
				projectDocumentId != null
					? eq(schema.entityVersions.entityId, projectDocumentId)
					: undefined,
			),
		)
		.orderBy(asc(schema.projects.name));
}

/** Whether `projectDocumentId` is a project a country report can record a contribution to. */
export async function isCountryReportProjectOption(
	projectDocumentId: string,
	queryDb: Database | Transaction = db,
): Promise<boolean> {
	const rows = await getCountryReportProjectOptions(queryDb, projectDocumentId);
	return rows.length > 0;
}

export interface CountryReportProjectContributionRow {
	id: string;
	amountEuros: number;
	projectDocumentId: string;
	project: {
		name: string;
		duration: schema.Project["duration"];
		isDraft: boolean;
	} | null;
}

/**
 * The project contributions of a country report, each with the project's name and duration.
 *
 * Projects resolve draft-first (`COALESCE(draftId, publishedId)`), like every other reporting
 * lookup: coordinators can create a project and report it before an administrator publishes it, and
 * a published-only lookup would leave such a project without a name.
 */
export async function getCountryReportProjectContributionRows(
	countryReportId: string,
	queryDb: Database | Transaction = db,
): Promise<Array<CountryReportProjectContributionRow>> {
	const lifecycle = alias(schema.documentLifecycle, "country_report_project_lifecycle");

	const rows = await queryDb
		.select({
			id: schema.countryReportProjectContributions.id,
			amountEuros: schema.countryReportProjectContributions.amountEuros,
			projectDocumentId: schema.countryReportProjectContributions.projectDocumentId,
			name: schema.projects.name,
			duration: schema.projects.duration,
			isDraft: sql<boolean>`${lifecycle.publishedId} IS NULL`,
		})
		.from(schema.countryReportProjectContributions)
		.leftJoin(
			lifecycle,
			eq(lifecycle.documentId, schema.countryReportProjectContributions.projectDocumentId),
		)
		.leftJoin(
			schema.projects,
			sql`${schema.projects.id} = COALESCE(${lifecycle.draftId}, ${lifecycle.publishedId})`,
		)
		.where(eq(schema.countryReportProjectContributions.countryReportId, countryReportId))
		.orderBy(asc(schema.countryReportProjectContributions.projectDocumentId));

	return rows.map((row) => {
		return {
			id: row.id,
			amountEuros: row.amountEuros,
			projectDocumentId: row.projectDocumentId,
			project:
				row.name != null && row.duration != null
					? { name: row.name, duration: row.duration, isDraft: row.isDraft }
					: null,
		};
	});
}
