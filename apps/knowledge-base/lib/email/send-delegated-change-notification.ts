import { log } from "@acdh-oeaw/lib";
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";

import { env } from "@/config/env.config";
import { type Database, type Transaction, db } from "@/lib/db";
import { alias, eq, sql } from "@/lib/db/sql";
import { email } from "@/lib/email";
import { getEntityDetailHref, getOrganisationalUnitDetailHref } from "@/lib/entity-detail-href";
import type { IntlLocale } from "@/lib/i18n/locales";
import { createFullUrl } from "@/lib/navigation/create-full-url";
import { getPathname } from "@/lib/navigation/navigation";

/**
 * Notifications to the contact address about changes national coordinators and working group chairs
 * make from their delegated dashboards. Relations have no draft stage, so a relation between
 * published entries is live on the website at once; new people and institutions are drafts that
 * wait for an administrator. Changes made by administrators are not notified.
 *
 * Like the report notifications, sending is best-effort: failures are logged, never surfaced.
 */

type Executor = Database | Transaction;

interface RelationEndpoint {
	name: string;
	/** Never published, so neither the entry nor its relations appear on the website. */
	isDraft: boolean;
	/** Dashboard detail page, if the entry has one. */
	href: string | null;
}

export interface RelationDescription {
	kind: "person" | "institution";
	source: RelationEndpoint;
	target: RelationEndpoint;
	/** Raw role or relation status token, e.g. `national_coordinator_deputy`. */
	role: string;
	start: Date;
	end: Date | null;
}

export type RelationChange = "added" | "updated" | "ended" | "deleted";

type Actor = Pick<User, "email" | "name" | "role">;

/** Whether a change by `user` (made as `realUser`, if impersonating) should be notified. */
export function isDelegatedChange(
	user: Pick<User, "role"> | null,
	realUser?: Pick<User, "role"> | null,
): boolean {
	return user != null && user.role !== "admin" && realUser?.role !== "admin";
}

/** A person↔unit relation with both endpoints resolved draft-first, for a notification. */
export async function describePersonRelation(
	relationId: string,
	executor: Executor = db,
): Promise<RelationDescription | null> {
	const personLifecycle = alias(schema.documentLifecycle, "notification_person_lifecycle");
	const unitLifecycle = alias(schema.documentLifecycle, "notification_unit_lifecycle");
	const personEntities = alias(schema.entities, "notification_person_entities");
	const unitEntities = alias(schema.entities, "notification_unit_entities");

	const [row] = await executor
		.select({
			personName: schema.persons.name,
			personSlug: personEntities.slug,
			personIsDraft: sql<boolean>`${personLifecycle.publishedId} IS NULL`,
			unitName: schema.organisationalUnits.name,
			unitSlug: unitEntities.slug,
			unitType: schema.organisationalUnitTypes.type,
			unitIsDraft: sql<boolean>`${unitLifecycle.publishedId} IS NULL`,
			role: schema.personRoleTypes.type,
			duration: schema.personsToOrganisationalUnits.duration,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			personEntities,
			eq(personEntities.id, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(personLifecycle, eq(personLifecycle.documentId, personEntities.id))
		.innerJoin(
			schema.persons,
			sql`${schema.persons.id} = COALESCE(${personLifecycle.draftId}, ${personLifecycle.publishedId})`,
		)
		.innerJoin(
			unitEntities,
			eq(unitEntities.id, schema.personsToOrganisationalUnits.organisationalUnitDocumentId),
		)
		.innerJoin(unitLifecycle, eq(unitLifecycle.documentId, unitEntities.id))
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${unitLifecycle.draftId}, ${unitLifecycle.publishedId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.where(eq(schema.personsToOrganisationalUnits.id, relationId))
		.limit(1);

	if (row == null) {
		return null;
	}

	return {
		kind: "person",
		source: {
			name: row.personName,
			isDraft: row.personIsDraft,
			href: getEntityDetailHref({ entityType: "persons", slug: row.personSlug }),
		},
		target: {
			name: row.unitName,
			isDraft: row.unitIsDraft,
			href: getOrganisationalUnitDetailHref(row.unitType, row.unitSlug),
		},
		role: row.role,
		start: row.duration.start,
		end: row.duration.end ?? null,
	};
}

/** A unit↔unit relation (e.g. a partner institution) with both units resolved draft-first. */
export async function describeUnitRelation(
	relationId: string,
	executor: Executor = db,
): Promise<RelationDescription | null> {
	const sourceLifecycle = alias(schema.documentLifecycle, "notification_source_lifecycle");
	const targetLifecycle = alias(schema.documentLifecycle, "notification_target_lifecycle");
	const sourceEntities = alias(schema.entities, "notification_source_entities");
	const targetEntities = alias(schema.entities, "notification_target_entities");
	const sourceUnits = alias(schema.organisationalUnits, "notification_source_units");
	const targetUnits = alias(schema.organisationalUnits, "notification_target_units");
	const sourceTypes = alias(schema.organisationalUnitTypes, "notification_source_types");
	const targetTypes = alias(schema.organisationalUnitTypes, "notification_target_types");

	const [row] = await executor
		.select({
			sourceName: sourceUnits.name,
			sourceSlug: sourceEntities.slug,
			sourceType: sourceTypes.type,
			sourceIsDraft: sql<boolean>`${sourceLifecycle.publishedId} IS NULL`,
			targetName: targetUnits.name,
			targetSlug: targetEntities.slug,
			targetType: targetTypes.type,
			targetIsDraft: sql<boolean>`${targetLifecycle.publishedId} IS NULL`,
			status: schema.organisationalUnitStatus.status,
			duration: schema.organisationalUnitsRelations.duration,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			sourceEntities,
			eq(sourceEntities.id, schema.organisationalUnitsRelations.unitDocumentId),
		)
		.innerJoin(sourceLifecycle, eq(sourceLifecycle.documentId, sourceEntities.id))
		.innerJoin(
			sourceUnits,
			sql`${sourceUnits.id} = COALESCE(${sourceLifecycle.draftId}, ${sourceLifecycle.publishedId})`,
		)
		.innerJoin(sourceTypes, eq(sourceTypes.id, sourceUnits.typeId))
		.innerJoin(
			targetEntities,
			eq(targetEntities.id, schema.organisationalUnitsRelations.relatedUnitDocumentId),
		)
		.innerJoin(targetLifecycle, eq(targetLifecycle.documentId, targetEntities.id))
		.innerJoin(
			targetUnits,
			sql`${targetUnits.id} = COALESCE(${targetLifecycle.draftId}, ${targetLifecycle.publishedId})`,
		)
		.innerJoin(targetTypes, eq(targetTypes.id, targetUnits.typeId))
		.where(eq(schema.organisationalUnitsRelations.id, relationId))
		.limit(1);

	if (row == null) {
		return null;
	}

	return {
		kind: "institution",
		source: {
			name: row.sourceName,
			isDraft: row.sourceIsDraft,
			href: getOrganisationalUnitDetailHref(row.sourceType, row.sourceSlug),
		},
		target: {
			name: row.targetName,
			isDraft: row.targetIsDraft,
			href: getOrganisationalUnitDetailHref(row.targetType, row.targetSlug),
		},
		role: row.status,
		start: row.duration.start,
		end: row.duration.end ?? null,
	};
}

function formatToken(token: string): string {
	return token.replace(/^is_/, "").replaceAll("_", " ");
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function toFullUrl(href: string, locale: IntlLocale): string {
	return String(createFullUrl({ pathname: getPathname({ href: { pathname: href }, locale }) }));
}

function describeWebsiteStatus(change: RelationChange, relation: RelationDescription): string {
	const drafts = [relation.source, relation.target].filter((endpoint) => endpoint.isDraft);

	if (drafts.length === 0) {
		return change === "deleted"
			? "The relation has been removed from the website."
			: "This change is live on the website.";
	}

	const names = drafts.map((endpoint) => endpoint.name).join(" and ");
	return change === "deleted"
		? `The relation was not shown on the website, as ${names} ${drafts.length > 1 ? "are" : "is"} not published.`
		: `The relation is not shown on the website until ${names} ${drafts.length > 1 ? "are" : "is"} published.`;
}

async function send(params: { actor: Actor; subject: string; lines: Array<string> }) {
	const { actor, subject, lines } = params;

	const result = await email.sendEmail({
		from: `${actor.name} <${actor.email}>`,
		to: env.EMAIL_ADDRESS,
		subject,
		text: lines.join("\n"),
	});

	if (result.isErr()) {
		log.error("Failed to send delegated change notification email.", result.error);
		return;
	}

	log.info(result.value);
}

/** Notifies that a coordinator or chair added, updated, ended or deleted a relation. */
export async function sendRelationChangeNotification(params: {
	change: RelationChange;
	relation: RelationDescription;
	actor: Actor;
	locale: IntlLocale;
}): Promise<void> {
	const { change, relation, actor, locale } = params;

	if (actor.role === "admin") {
		return;
	}

	const kindLabel = relation.kind === "person" ? "Person relation" : "Institution relation";
	const role = formatToken(relation.role);
	const draftNote = (endpoint: RelationEndpoint) =>
		endpoint.isDraft ? " (draft, not yet published)" : "";
	const period = `${formatDate(relation.start)} – ${relation.end != null ? formatDate(relation.end) : "open"}`;
	const links = [relation.target, relation.source].flatMap((endpoint) =>
		endpoint.href != null ? [`${endpoint.name}: ${toFullUrl(endpoint.href, locale)}`] : [],
	);

	await send({
		actor,
		subject: `${kindLabel} ${change}: ${relation.source.name} — ${role} — ${relation.target.name}`,
		lines: [
			`A ${kindLabel.toLowerCase()} was ${change} by ${actor.name} <${actor.email}>.`,
			"",
			`${relation.kind === "person" ? "Person" : "Institution"}: ${relation.source.name}${draftNote(relation.source)}`,
			`${relation.kind === "person" ? "Role" : "Relation"}: ${role}`,
			`Related to: ${relation.target.name}${draftNote(relation.target)}`,
			`Period: ${period}`,
			"",
			describeWebsiteStatus(change, relation),
			...(links.length > 0 ? ["", "Review in the knowledge base:", ...links] : []),
		],
	});
}

type CreatedDraftEntityKind = "institution" | "person" | "project";

const createdDraftEntityKindLabels: Record<CreatedDraftEntityKind, string> = {
	institution: "Institution",
	person: "Person",
	project: "Project",
};

/** Notifies that a coordinator or chair created a person, institution or project, saved as a draft. */
export async function sendDraftEntityCreatedNotification(params: {
	kind: CreatedDraftEntityKind;
	name: string;
	slug: string | null;
	actor: Actor;
	locale: IntlLocale;
}): Promise<void> {
	const { kind, name, slug, actor, locale } = params;

	if (actor.role === "admin") {
		return;
	}

	const href =
		slug == null
			? null
			: kind === "institution"
				? getOrganisationalUnitDetailHref("institution", slug)
				: getEntityDetailHref({ entityType: kind === "person" ? "persons" : "projects", slug });

	await send({
		actor,
		subject: `New ${kind} created as a draft: ${name}`,
		lines: [
			`A new ${kind} was created by ${actor.name} <${actor.email}>.`,
			"",
			`${createdDraftEntityKindLabels[kind]}: ${name}`,
			"",
			`The ${kind} is saved as a draft and is not shown on the website, nor are its relations, until an administrator publishes it.`,
			"",
			...(href != null ? [`Review the ${kind}: ${toFullUrl(href, locale)}`] : []),
			`All drafts awaiting review: ${toFullUrl("/dashboard/administrator/drafts", locale)}`,
		],
	});
}

/**
 * Describes a relation that still exists and notifies the change, when it was made by a coordinator
 * or chair. Call it after the transaction committed (from `postCommit`, or `after()` in a plain
 * server action). For deletions, describe the relation before deleting it and call
 * {@link sendRelationChangeNotification} instead.
 */
export async function notifyRelationChange(params: {
	kind: RelationDescription["kind"];
	relationId: string;
	change: Exclude<RelationChange, "deleted">;
	user: User | null;
	realUser?: User | null;
	locale: IntlLocale;
}): Promise<void> {
	const { kind, relationId, change, user, realUser, locale } = params;

	if (user == null || !isDelegatedChange(user, realUser)) {
		return;
	}

	const relation =
		kind === "person"
			? await describePersonRelation(relationId)
			: await describeUnitRelation(relationId);

	if (relation == null) {
		return;
	}

	await sendRelationChangeNotification({ change, relation, actor: user, locale });
}

/**
 * Notifies that a coordinator or chair created a draft person, institution or project. Call it
 * after the transaction committed.
 */
export async function notifyDraftEntityCreated(params: {
	kind: CreatedDraftEntityKind;
	documentId: string;
	name: string;
	user: User | null;
	realUser?: User | null;
	locale: IntlLocale;
}): Promise<void> {
	const { kind, documentId, name, user, realUser, locale } = params;

	if (user == null || !isDelegatedChange(user, realUser)) {
		return;
	}

	const entity = await db.query.entities.findFirst({
		where: { id: documentId },
		columns: { slug: true },
	});

	await sendDraftEntityCreatedNotification({
		kind,
		name,
		slug: entity?.slug ?? null,
		actor: user,
		locale,
	});
}

/**
 * Whether saving `documentId` now starts unpublished changes on top of its published version, i.e.
 * whether this is the first save since the entry was last published. Check it inside the
 * transaction, before saving. The edit pages create a draft when they open, but a freshly cloned
 * draft has no changes (`hasDraftChanges` compares it with the published version), so opening a
 * form does not count. Never-published entries return `false`: their creation is notified instead.
 */
export async function startsPendingChanges(tx: Transaction, documentId: string): Promise<boolean> {
	const [row] = await tx
		.select({
			publishedId: schema.documentLifecycle.publishedId,
			hasDraftChanges: schema.documentLifecycle.hasDraftChanges,
		})
		.from(schema.documentLifecycle)
		.where(eq(schema.documentLifecycle.documentId, documentId))
		.limit(1);

	return row?.publishedId != null && !row.hasDraftChanges;
}

type DraftEntityKind = "institution" | "national consortium" | "person" | "working group";

/**
 * Notifies that a coordinator, chair or user started changes to a published entry, which wait for
 * an administrator to publish them. Sent once per round of changes (see `startsPendingChanges`),
 * not for every save. Call it after the transaction committed.
 */
export async function notifyChangesAwaitingReview(params: {
	kind: DraftEntityKind;
	documentId: string;
	user: User | null;
	realUser?: User | null;
	locale: IntlLocale;
}): Promise<void> {
	const { kind, documentId, user, realUser, locale } = params;

	if (user == null || !isDelegatedChange(user, realUser)) {
		return;
	}

	let resolved: { name: string; href: string | null } | null;

	if (kind === "person") {
		const [row] = await db
			.select({ name: schema.persons.name, slug: schema.entities.slug })
			.from(schema.documentLifecycle)
			.innerJoin(schema.entities, eq(schema.entities.id, schema.documentLifecycle.documentId))
			.innerJoin(
				schema.persons,
				sql`${schema.persons.id} = COALESCE(${schema.documentLifecycle.draftId}, ${schema.documentLifecycle.publishedId})`,
			)
			.where(eq(schema.documentLifecycle.documentId, documentId))
			.limit(1);
		resolved =
			row == null
				? null
				: { name: row.name, href: getEntityDetailHref({ entityType: "persons", slug: row.slug }) };
	} else {
		const [row] = await db
			.select({
				name: schema.organisationalUnits.name,
				slug: schema.entities.slug,
				unitType: schema.organisationalUnitTypes.type,
			})
			.from(schema.documentLifecycle)
			.innerJoin(schema.entities, eq(schema.entities.id, schema.documentLifecycle.documentId))
			.innerJoin(
				schema.organisationalUnits,
				sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.draftId}, ${schema.documentLifecycle.publishedId})`,
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(eq(schema.documentLifecycle.documentId, documentId))
			.limit(1);
		resolved =
			row == null
				? null
				: { name: row.name, href: getOrganisationalUnitDetailHref(row.unitType, row.slug) };
	}

	if (resolved == null) {
		return;
	}

	await send({
		actor: user,
		subject: `Changes awaiting review: ${resolved.name} (${kind})`,
		lines: [
			`${user.name} <${user.email}> saved changes to the ${kind} ${resolved.name}.`,
			"",
			"The changes are saved as a draft and are not shown on the website until an administrator publishes them. Further saves to the same draft are not notified separately.",
			"",
			...(resolved.href != null ? [`Review the ${kind}: ${toFullUrl(resolved.href, locale)}`] : []),
			`All drafts awaiting review: ${toFullUrl("/dashboard/administrator/drafts", locale)}`,
		],
	});
}
