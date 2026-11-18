import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/lib/db";
import { type SQL, and, eq, inArray, or, sql } from "@/lib/db/sql";

/**
 * Pick exactly one version row per entity, preferring the draft when one exists. Use for _editor
 * list views_ (admin tables, the navigation menu list) where the intent is to show the latest
 * editable view per document — including unpublished edits and draft-only documents.
 *
 * Do NOT use for _pickers_ that build relations to a target document — those need
 * `publishedEntityVersionWhere()` so an unpublished or draft-only target cannot be selected.
 */
export function latestEditableEntityVersionWhere(): SQL | undefined {
	return or(
		eq(schema.entityStatus.type, "draft"),
		and(
			eq(schema.entityStatus.type, "published"),
			sql`
				NOT EXISTS (
					SELECT
						1
					FROM
						"entity_versions" AS "ev2"
						INNER JOIN "entity_status" AS "es2" ON "ev2"."status_id" = "es2"."id"
					WHERE
						"ev2"."entity_id" = ${schema.entityVersions.entityId}
						AND "es2"."type" = 'draft'
				)
			`,
		),
	);
}

/**
 * Pick exactly one version row per entity: the draft when it holds unpublished changes (or the
 * entity was never published), otherwise the published version. Uses the same rule as
 * `document_lifecycle.has_draft_changes`, so a list built on it can take its "Draft" badge from the
 * selected row's status and never shows draft data under a "Published" label.
 *
 * Differs from `latestEditableEntityVersionWhere()` for entities with a synced draft clone (a draft
 * whose `updated_at` equals the published one, left behind by `ensureDraftVersion` and
 * `publishVersion`): this one picks the published row for them.
 */
export function latestChangedEntityVersionWhere(): SQL | undefined {
	const hasDraftChanges = sql`
		EXISTS (
			SELECT
				1
			FROM
				"document_lifecycle" AS "dl"
			WHERE
				"dl"."document_id" = ${schema.entityVersions.entityId}
				AND "dl"."has_draft_changes"
		)
	`;

	return or(
		and(eq(schema.entityStatus.type, "draft"), hasDraftChanges),
		and(eq(schema.entityStatus.type, "published"), sql`NOT ${hasDraftChanges}`),
	);
}

export function publishedEntityVersionWhere(): SQL | undefined {
	return eq(schema.entityStatus.type, "published");
}

/**
 * True when every `entityVersionIds` entry is a published version row. Use in server actions to
 * reject insertions that would link to a draft.
 */
export async function isPublishedEntityVersions(
	tx: Database | Transaction,
	entityVersionIds: ReadonlyArray<string>,
): Promise<boolean> {
	if (entityVersionIds.length === 0) {
		return true;
	}

	const rows = await tx
		.select({ id: schema.entityVersions.id })
		.from(schema.entityVersions)
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(
			and(
				eq(schema.entityStatus.type, "published"),
				inArray(schema.entityVersions.id, [...entityVersionIds]),
			),
		);

	return rows.length === entityVersionIds.length;
}

/** True when every document has at least one published version. */
export async function arePublishedEntityDocuments(
	tx: Database | Transaction,
	documentIds: ReadonlyArray<string>,
): Promise<boolean> {
	const uniqueDocumentIds = [...new Set(documentIds)];

	if (uniqueDocumentIds.length === 0) {
		return true;
	}

	const rows = await tx
		.selectDistinct({ id: schema.entityVersions.entityId })
		.from(schema.entityVersions)
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(
			and(
				eq(schema.entityStatus.type, "published"),
				inArray(schema.entityVersions.entityId, uniqueDocumentIds),
			),
		);

	return rows.length === uniqueDocumentIds.length;
}
