import { unique } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { type Database, type Transaction, db } from "@/lib/db";
import { alias, count, desc, eq, inArray, sql } from "@/lib/db/sql";

/** A db handle usable for reads — the global pool, or an open transaction (for write-time reads). */
type AuditLogClient = Database | Transaction;

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
	client: AuditLogClient,
	documentIds: Array<string>,
): Promise<Map<string, string>> {
	if (documentIds.length === 0) {
		return new Map();
	}

	const versionId = sql`COALESCE(${schema.documentLifecycle.draftId}, ${schema.documentLifecycle.publishedId})`;

	const rows = await client
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

/**
 * Resolves a single entity document id to its current version's title/name. Pass the active
 * transaction and call this _before_ the entity is deleted; the result is meant to be stored as the
 * audit row's `subjectLabel` (see {@link resolveAuditSubjectLabel}).
 */
export async function resolveEntityDocumentLabel(
	client: AuditLogClient,
	documentId: string,
): Promise<string | null> {
	return (await resolveEntityDocumentTitles(client, [documentId])).get(documentId) ?? null;
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

/**
 * Resolves contribution ids (`persons_to_organisational_units.id`) to "<person> — <role> at <org
 * unit>". Both endpoints are `entities.id` document ids, so each is resolved through its
 * draft-or-published version, matching the admin-side reads.
 */
async function resolveContributionLabels(ids: Array<string>): Promise<Map<string, string>> {
	if (ids.length === 0) {
		return new Map();
	}

	const personLifecycle = alias(schema.documentLifecycle, "contribution_person_lifecycle");
	const unitLifecycle = alias(schema.documentLifecycle, "contribution_unit_lifecycle");
	const personVersionId = sql`COALESCE(${personLifecycle.draftId}, ${personLifecycle.publishedId})`;
	const unitVersionId = sql`COALESCE(${unitLifecycle.draftId}, ${unitLifecycle.publishedId})`;

	const rows = await db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personName: schema.persons.name,
			unitName: schema.organisationalUnits.name,
			role: schema.personRoleTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.leftJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.leftJoin(
			personLifecycle,
			eq(personLifecycle.documentId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.leftJoin(schema.persons, eq(schema.persons.id, personVersionId))
		.leftJoin(
			unitLifecycle,
			eq(
				unitLifecycle.documentId,
				schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
			),
		)
		.leftJoin(schema.organisationalUnits, eq(schema.organisationalUnits.id, unitVersionId))
		.where(inArray(schema.personsToOrganisationalUnits.id, ids));

	const labels = new Map<string, string>();
	for (const row of rows) {
		const person = row.personName ?? "Unknown person";
		const unit = row.unitName ?? "unknown organisation";
		const role = row.role != null ? humanizeSubjectType(row.role) : "contributor";
		labels.set(row.id, `${person} — ${role} at ${unit}`);
	}
	return labels;
}

/**
 * Resolves unit-relation ids (`organisational_units_to_units.id`) to "<unit> → <related unit>
 * (<status>)". Both endpoints are `entities.id` document ids, resolved through their
 * draft-or-published versions.
 */
async function resolveUnitRelationLabels(ids: Array<string>): Promise<Map<string, string>> {
	if (ids.length === 0) {
		return new Map();
	}

	const unitLifecycle = alias(schema.documentLifecycle, "unit_relation_unit_lifecycle");
	const relatedLifecycle = alias(schema.documentLifecycle, "unit_relation_related_lifecycle");
	const relatedUnits = alias(schema.organisationalUnits, "related_organisational_units");
	const unitVersionId = sql`COALESCE(${unitLifecycle.draftId}, ${unitLifecycle.publishedId})`;
	const relatedVersionId = sql`COALESCE(${relatedLifecycle.draftId}, ${relatedLifecycle.publishedId})`;

	const rows = await db
		.select({
			id: schema.organisationalUnitsRelations.id,
			unitName: schema.organisationalUnits.name,
			relatedUnitName: relatedUnits.name,
			status: schema.organisationalUnitStatus.status,
		})
		.from(schema.organisationalUnitsRelations)
		.leftJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.leftJoin(
			unitLifecycle,
			eq(unitLifecycle.documentId, schema.organisationalUnitsRelations.unitDocumentId),
		)
		.leftJoin(schema.organisationalUnits, eq(schema.organisationalUnits.id, unitVersionId))
		.leftJoin(
			relatedLifecycle,
			eq(relatedLifecycle.documentId, schema.organisationalUnitsRelations.relatedUnitDocumentId),
		)
		.leftJoin(relatedUnits, eq(relatedUnits.id, relatedVersionId))
		.where(inArray(schema.organisationalUnitsRelations.id, ids));

	const labels = new Map<string, string>();
	for (const row of rows) {
		const unit = row.unitName ?? "Unknown unit";
		const related = row.relatedUnitName ?? "unknown unit";
		const status = row.status != null ? humanizeSubjectType(row.status) : "related";
		labels.set(row.id, `${unit} → ${related} (${status})`);
	}
	return labels;
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

/** Resolves a `services.id` / `social_media.id` (etc.) to its `name`. */
async function resolveNamedRecordLabel(
	table: typeof schema.services | typeof schema.socialMedia,
	id: string,
): Promise<string | null> {
	const [row] = await db.select({ name: table.name }).from(table).where(eq(table.id, id)).limit(1);
	return row?.name ?? null;
}

/** Resolves a navigation id, trying menu-item labels first, then top-level menu names. */
async function resolveNavigationLabel(id: string): Promise<string | null> {
	const [item] = await db
		.select({ label: schema.navigationItems.label })
		.from(schema.navigationItems)
		.where(eq(schema.navigationItems.id, id))
		.limit(1);
	if (item?.label != null) {
		return item.label;
	}

	const [menu] = await db
		.select({ name: schema.navigationMenus.name })
		.from(schema.navigationMenus)
		.where(eq(schema.navigationMenus.id, id))
		.limit(1);
	return menu?.name ?? null;
}

/** Resolves a `projects_to_organisational_units.id` to "<project> — <organisation>". */
async function resolveProjectPartnerLabel(id: string): Promise<string | null> {
	const projectLifecycle = alias(schema.documentLifecycle, "project_partner_project_lifecycle");
	const unitLifecycle = alias(schema.documentLifecycle, "project_partner_unit_lifecycle");
	const projectVersionId = sql`COALESCE(${projectLifecycle.draftId}, ${projectLifecycle.publishedId})`;
	const unitVersionId = sql`COALESCE(${unitLifecycle.draftId}, ${unitLifecycle.publishedId})`;

	const [row] = await db
		.select({ projectName: schema.projects.name, unitName: schema.organisationalUnits.name })
		.from(schema.projectsToOrganisationalUnits)
		.leftJoin(
			projectLifecycle,
			eq(projectLifecycle.documentId, schema.projectsToOrganisationalUnits.projectDocumentId),
		)
		.leftJoin(schema.projects, eq(schema.projects.id, projectVersionId))
		.leftJoin(
			unitLifecycle,
			eq(unitLifecycle.documentId, schema.projectsToOrganisationalUnits.unitDocumentId),
		)
		.leftJoin(schema.organisationalUnits, eq(schema.organisationalUnits.id, unitVersionId))
		.where(eq(schema.projectsToOrganisationalUnits.id, id))
		.limit(1);

	if (row == null) {
		return null;
	}
	const project = row.projectName ?? "Unknown project";
	const unit = row.unitName ?? "unknown organisation";
	return `${project} — ${unit}`;
}

/**
 * Subject types whose id is an `entities.id` document id (resolved via the current version).
 * Includes the organisational-unit subtypes (`countries`, `institutions`, ...) — they all resolve
 * through `organisational_units.name` regardless of the discriminator carried in the subject type.
 */
const entityDocumentSubjectTypes = new Set([
	"news",
	"events",
	"pages",
	"opportunities",
	"funding_calls",
	"impact_case_studies",
	"spotlight_articles",
	"documents_policies",
	"documentation_pages",
	"internal_pages",
	"persons",
	"projects",
	"organisational_units",
	"countries",
	"institutions",
	"national_consortia",
	"working_groups",
	"governance_bodies",
]);

/**
 * Resolves a single subject to its human-readable label, dispatching on `subjectType`. Call this at
 * write time — before the subject row is deleted — and pass the result as `recordAuditEvent`'s
 * `subjectLabel`, so the audit log keeps a readable label even though the subject no longer
 * exists.
 *
 * Returns `null` when the subject can't be resolved (unknown type, non-uuid id, or a subtype id
 * that doesn't map cleanly, e.g. a document-policy _group_ under the `documents_policies` type);
 * callers that know a better label for those cases should pass it explicitly instead.
 */
export async function resolveAuditSubjectLabel(
	subjectType: string,
	subjectId: string,
): Promise<string | null> {
	if (!isUuid(subjectId)) {
		return null;
	}

	if (entityDocumentSubjectTypes.has(subjectType)) {
		return resolveEntityDocumentLabel(db, subjectId);
	}

	switch (subjectType) {
		case "country_reports":
		case "working_group_reports": {
			return (await resolveReportLabels([subjectId])).get(subjectId) ?? null;
		}
		case "reporting_campaigns": {
			return (await resolveCampaignLabels([subjectId])).get(subjectId) ?? null;
		}
		case "contributions": {
			return (await resolveContributionLabels([subjectId])).get(subjectId) ?? null;
		}
		case "unit_relations": {
			return (await resolveUnitRelationLabels([subjectId])).get(subjectId) ?? null;
		}
		case "users": {
			return (await resolveActorLabels([subjectId])).get(subjectId) ?? null;
		}
		case "project_partners": {
			return resolveProjectPartnerLabel(subjectId);
		}
		case "social_media": {
			return resolveNamedRecordLabel(schema.socialMedia, subjectId);
		}
		case "internal_services": {
			return resolveNamedRecordLabel(schema.services, subjectId);
		}
		case "navigation": {
			return resolveNavigationLabel(subjectId);
		}
		default: {
			return null;
		}
	}
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
				subjectLabel: schema.auditLogs.subjectLabel,
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

	// The subject id spaces are disjoint (entity document ids vs report ids vs campaign ids vs
	// contribution ids vs unit-relation ids), so each resolver is given every id and contributes only
	// the ones it owns.
	const [
		entityTitles,
		reportLabels,
		campaignLabels,
		contributionLabels,
		unitRelationLabels,
		actorLabels,
	] = await Promise.all([
		resolveEntityDocumentTitles(db, uuidSubjectIds),
		resolveReportLabels(uuidSubjectIds),
		resolveCampaignLabels(uuidSubjectIds),
		resolveContributionLabels(uuidSubjectIds),
		resolveUnitRelationLabels(uuidSubjectIds),
		resolveActorLabels(actorIds),
	]);

	const data: Array<AuditLogEntry> = items.map((item) => {
		// A label snapshotted at write time (see `resolveAuditSubjectLabel`) wins: it's the only source
		// that survives the subject being deleted. Otherwise resolve live from the current version so
		// renames stay reflected, and fall back to `<type> #<id>` when nothing resolves.
		const subjectLabel =
			item.subjectLabel ??
			entityTitles.get(item.subjectId) ??
			reportLabels.get(item.subjectId) ??
			campaignLabels.get(item.subjectId) ??
			contributionLabels.get(item.subjectId) ??
			unitRelationLabels.get(item.subjectId) ??
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
