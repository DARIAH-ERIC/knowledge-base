"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateUnitRelationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-unit-relation.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

/**
 * Stays on createServerAction because the success response carries typed data. Auth gate is in the
 * wrapper, audit is written inside the same transaction as the mutation.
 */
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
			const draftUnitId = await ensureOrganisationalUnitDraftVersion(tx, unitId);
			const existing = await tx.query.organisationalUnitsRelations.findFirst({
				where: {
					unitId: draftUnitId,
					relatedUnitId,
					status: statusId,
				},
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			const relatedUnit = await tx.query.organisationalUnits.findFirst({
				where: { id: relatedUnitId },
				columns: {},
				with: { type: { columns: { type: true } } },
			});

			const row = await tx
				.insert(schema.organisationalUnitsRelations)
				.values({ unitId: draftUnitId, relatedUnitId, status: statusId, duration })
				.returning({ id: schema.organisationalUnitsRelations.id })
				.then((rows) => rows[0]!);

			await touchVersion(tx, draftUnitId);

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "create",
				subjectType: "create_unit_relation",
				subjectId: row.id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return { relatedUnitType: relatedUnit?.type.type, row };
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
