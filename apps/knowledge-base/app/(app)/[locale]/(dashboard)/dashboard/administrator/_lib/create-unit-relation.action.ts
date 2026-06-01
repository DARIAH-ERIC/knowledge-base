"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateUnitRelationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-unit-relation.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { db } from "@/lib/db";
import { eq, sql } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

/** Uses createServerAction because the success response carries typed data. */
export const createUnitRelationAction = createServerAction(
	{ requireAdmin: true },
	async function createUnitRelationAction(state, formData, { user }) {
		const locale = await getLocale();
		const t = await getExtracted();

		const result = await v.safeParseAsync(
			CreateUnitRelationActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateUnitRelationActionInputSchema>(result.issues);
			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { unitId, statusId, relatedUnitId, duration } = result.output;

		const returned = await db.transaction(async (tx) => {
			// unitId / relatedUnitId are document ids (entities.id). Relations are document-level and do
			// not require the edited unit to be published (the picker restricts the *target*).
			const existing = await tx.query.organisationalUnitsRelations.findFirst({
				where: {
					unitDocumentId: unitId,
					relatedUnitDocumentId: relatedUnitId,
					status: statusId,
				},
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			// Resolve the related unit's current version (draft-or-published) for its type.
			const relatedUnit = await tx
				.select({ unitType: schema.organisationalUnitTypes.type })
				.from(schema.organisationalUnits)
				.innerJoin(
					schema.documentLifecycle,
					sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
				)
				.innerJoin(
					schema.organisationalUnitTypes,
					eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
				)
				.where(eq(schema.documentLifecycle.documentId, relatedUnitId))
				.limit(1)
				.then((rows) => rows[0] ?? null);

			const row = await tx
				.insert(schema.organisationalUnitsRelations)
				.values({
					unitDocumentId: unitId,
					relatedUnitDocumentId: relatedUnitId,
					status: statusId,
					duration,
				})
				.returning({ id: schema.organisationalUnitsRelations.id })
				.then((rows) => rows[0]!);

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "create",
				subjectType: "create_unit_relation",
				subjectId: row.id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return { relatedUnitType: relatedUnit?.unitType, row };
		});

		if ("error" in returned) {
			return createActionStateError({ message: t("This relation already exists.") });
		}

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({
			data: {
				id: returned.row.id,
				durationStart: duration.start.toISOString(),
				durationEnd: duration.end?.toISOString() ?? null,
				relatedUnitType: returned.relatedUnitType,
			},
		});
	},
);
