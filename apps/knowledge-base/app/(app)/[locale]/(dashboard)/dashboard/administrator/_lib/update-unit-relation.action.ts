"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { UpdateUnitRelationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-unit-relation.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { db } from "@/lib/db";
import { and, eq, ne } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateUnitRelationAction = createServerAction(
	{ requireAdmin: true },
	async function updateUnitRelationAction(state, formData, { user }) {
		const locale = await getLocale();
		const t = await getExtracted();
		const result = await v.safeParseAsync(
			UpdateUnitRelationActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateUnitRelationActionInputSchema>(result.issues);
			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { id, unitId, statusId, relatedUnitId, duration } = result.output;

		const existing = await db
			.select({ id: schema.organisationalUnitsRelations.id })
			.from(schema.organisationalUnitsRelations)
			.where(
				and(
					ne(schema.organisationalUnitsRelations.id, id),
					eq(schema.organisationalUnitsRelations.unitDocumentId, unitId),
					eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, relatedUnitId),
					eq(schema.organisationalUnitsRelations.status, statusId),
				),
			)
			.limit(1)
			.then((rows) => rows[0] ?? null);

		if (existing != null) {
			return createActionStateError({ message: t("This relation already exists.") });
		}

		await db.transaction(async (tx) => {
			await tx
				.update(schema.organisationalUnitsRelations)
				.set({
					unitDocumentId: unitId,
					relatedUnitDocumentId: relatedUnitId,
					status: statusId,
					duration,
				})
				.where(eq(schema.organisationalUnitsRelations.id, id));

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "update",
				subjectType: "unit_relations",
				subjectId: id,
				summary: getAuditSummaryFromFormData(formData),
			});
		});

		revalidatePath("/[locale]/dashboard/administrator", "layout");
		return createActionStateSuccess({});
	},
);
