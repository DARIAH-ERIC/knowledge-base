import { unique } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { count, desc, eq, inArray, sql } from "@/lib/db/sql";

export type AuditLogAction = (typeof schema.auditLogActionEnum)[number];

function isUuid(value: string): boolean {
	return /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu.test(value);
}

export const auditLogActions = schema.auditLogActionEnum;

export interface AuditLogEntry {
	id: string;
	action: AuditLogAction;
	subjectType: string;
	subjectId: string;
	/** Human-readable label for the subject, falling back to `<type> #<id>` when unresolved. */
	subjectLabel: string;
	/** Human-readable actor (`name (email)`), or "System" when no actor was recorded. */
	actorLabel: string;
	summary: Record<string, unknown>;
	createdAt: Date;
}

export interface GetAuditLogEntriesParams {
	limit: number;
	offset: number;
	action?: AuditLogAction;
}

export interface AuditLogResult {
	data: Array<AuditLogEntry>;
	total: number;
}

/**
 * Resolves entity-document subject ids (which are `entities.id` document ids) to their current
 * version's title/name. A single left-joined `COALESCE` over every subtype table resolves any
 * entity type in one round trip — non-matching ids (reports, navigation, assets, ...) simply yield
 * `null` and are handled by the other resolvers / fallback.
 */
async function resolveEntityDocumentTitles(
	documentIds: Array<string>,
): Promise<Map<string, string>> {
	if (documentIds.length === 0) {
		return new Map();
	}

	const versionId = sql`COALESCE(${schema.documentLifecycle.draftId}, ${schema.documentLifecycle.publishedId})`;

	const rows = await db
		.select({
			documentId: schema.documentLifecycle.documentId,
			label: sql<
				string | null
			>`COALESCE(${schema.news.title}, ${schema.events.title}, ${schema.pages.title}, ${schema.opportunities.title}, ${schema.fundingCalls.title}, ${schema.impactCaseStudies.title}, ${schema.spotlightArticles.title}, ${schema.documentsPolicies.title}, ${schema.documentationPages.title}, ${schema.internalPages.title}, ${schema.persons.name}, ${schema.projects.name}, ${schema.organisationalUnits.name})`,
		})
		.from(schema.documentLifecycle)
		.leftJoin(schema.news, eq(schema.news.id, versionId))
		.leftJoin(schema.events, eq(schema.events.id, versionId))
		.leftJoin(schema.pages, eq(schema.pages.id, versionId))
		.leftJoin(schema.opportunities, eq(schema.opportunities.id, versionId))
		.leftJoin(schema.fundingCalls, eq(schema.fundingCalls.id, versionId))
		.leftJoin(schema.impactCaseStudies, eq(schema.impactCaseStudies.id, versionId))
		.leftJoin(schema.spotlightArticles, eq(schema.spotlightArticles.id, versionId))
		.leftJoin(schema.documentsPolicies, eq(schema.documentsPolicies.id, versionId))
		.leftJoin(schema.documentationPages, eq(schema.documentationPages.id, versionId))
		.leftJoin(schema.internalPages, eq(schema.internalPages.id, versionId))
		.leftJoin(schema.persons, eq(schema.persons.id, versionId))
		.leftJoin(schema.projects, eq(schema.projects.id, versionId))
		.leftJoin(schema.organisationalUnits, eq(schema.organisationalUnits.id, versionId))
		.where(inArray(schema.documentLifecycle.documentId, documentIds));

	const labels = new Map<string, string>();
	for (const row of rows) {
		if (row.label != null) {
			labels.set(row.documentId, row.label);
		}
	}
	return labels;
}

/** Resolves country/working-group report ids to "<org unit name> <campaign year>". */
async function resolveReportLabels(reportIds: Array<string>): Promise<Map<string, string>> {
	if (reportIds.length === 0) {
		return new Map();
	}

	const versionId = sql`COALESCE(${schema.documentLifecycle.draftId}, ${schema.documentLifecycle.publishedId})`;
	const labels = new Map<string, string>();

	const [countryReports, workingGroupReports] = await Promise.all([
		db
			.select({
				id: schema.countryReports.id,
				name: schema.organisationalUnits.name,
				year: schema.reportingCampaigns.year,
			})
			.from(schema.countryReports)
			.innerJoin(
				schema.reportingCampaigns,
				eq(schema.reportingCampaigns.id, schema.countryReports.campaignId),
			)
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.documentId, schema.countryReports.countryDocumentId),
			)
			.innerJoin(schema.organisationalUnits, eq(schema.organisationalUnits.id, versionId))
			.where(inArray(schema.countryReports.id, reportIds)),
		db
			.select({
				id: schema.workingGroupReports.id,
				name: schema.organisationalUnits.name,
				year: schema.reportingCampaigns.year,
			})
			.from(schema.workingGroupReports)
			.innerJoin(
				schema.reportingCampaigns,
				eq(schema.reportingCampaigns.id, schema.workingGroupReports.campaignId),
			)
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.documentId, schema.workingGroupReports.workingGroupDocumentId),
			)
			.innerJoin(schema.organisationalUnits, eq(schema.organisationalUnits.id, versionId))
			.where(inArray(schema.workingGroupReports.id, reportIds)),
	]);

	for (const row of [...countryReports, ...workingGroupReports]) {
		labels.set(row.id, `${row.name} ${String(row.year)}`);
	}
	return labels;
}

/** Resolves reporting-campaign ids to "Reporting campaign <year>". */
async function resolveCampaignLabels(campaignIds: Array<string>): Promise<Map<string, string>> {
	if (campaignIds.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({ id: schema.reportingCampaigns.id, year: schema.reportingCampaigns.year })
		.from(schema.reportingCampaigns)
		.where(inArray(schema.reportingCampaigns.id, campaignIds));

	return new Map(rows.map((row) => [row.id, `Reporting campaign ${String(row.year)}`]));
}

async function resolveActorLabels(actorIds: Array<string>): Promise<Map<string, string>> {
	if (actorIds.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
		.from(schema.users)
		.where(inArray(schema.users.id, actorIds));

	return new Map(rows.map((row) => [row.id, `${row.name} (${row.email})`]));
}

function humanizeSubjectType(subjectType: string): string {
	return subjectType.replaceAll("_", " ");
}

export async function getAuditLogEntries(
	params: Readonly<GetAuditLogEntriesParams>,
): Promise<AuditLogResult> {
	const { limit, offset, action } = params;

	const where = action != null ? eq(schema.auditLogs.action, action) : undefined;

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.auditLogs.id,
				action: schema.auditLogs.action,
				subjectType: schema.auditLogs.subjectType,
				subjectId: schema.auditLogs.subjectId,
				summary: schema.auditLogs.summary,
				createdAt: schema.auditLogs.createdAt,
				actorUserId: schema.auditLogs.actorUserId,
			})
			.from(schema.auditLogs)
			.where(where)
			.orderBy(desc(schema.auditLogs.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.auditLogs).where(where),
	]);

	const subjectIds = unique(items.map((item) => item.subjectId));
	const actorIds = unique(
		items.map((item) => item.actorUserId).filter((id): id is string => id != null),
	);

	// `subjectId` is a free-form text column, so it can hold non-uuid sentinels (e.g. "all" for
	// global/bulk actions). The resolvers below all match against uuid-typed columns, so feeding them
	// a non-uuid would make Postgres fail casting it to uuid. Filter to uuid-shaped ids; anything else
	// falls through to the `<type> #<id>` fallback label.
	const uuidSubjectIds = subjectIds.filter((id) => isUuid(id));

	// The subject id spaces are disjoint (entity document ids vs report ids vs campaign ids), so each
	// resolver is given every id and contributes only the ones it owns.
	const [entityTitles, reportLabels, campaignLabels, actorLabels] = await Promise.all([
		resolveEntityDocumentTitles(uuidSubjectIds),
		resolveReportLabels(uuidSubjectIds),
		resolveCampaignLabels(uuidSubjectIds),
		resolveActorLabels(actorIds),
	]);

	const data: Array<AuditLogEntry> = items.map((item) => {
		const subjectLabel =
			entityTitles.get(item.subjectId) ??
			reportLabels.get(item.subjectId) ??
			campaignLabels.get(item.subjectId) ??
			`${humanizeSubjectType(item.subjectType)} #${item.subjectId}`;

		const actorLabel =
			item.actorUserId == null
				? "System"
				: (actorLabels.get(item.actorUserId) ?? `Unknown user #${item.actorUserId}`);

		return {
			id: item.id,
			action: item.action,
			subjectType: item.subjectType,
			subjectId: item.subjectId,
			subjectLabel,
			actorLabel,
			summary: (item.summary ?? {}) as Record<string, unknown>,
			createdAt: item.createdAt,
		};
	});

	return { data, total: aggregate.at(0)?.total ?? 0 };
}
