"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateUnitRelationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-unit-relation.schema";
import {
	getAuditSubjectIdFromFormData,
	getAuditSummaryFromFormData,
	recordAuditEvent,
} from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createUnitRelationAction = createServerAction(
	async function createUnitRelationAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const auditSession = await assertAdmin();

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

			return { relatedUnitType: relatedUnit?.type.type, row };
		});

		if ("error" in returned) {
			return createActionStateError({ message: t("This relation already exists.") });
		}

		await recordAuditEvent(db, {
			actorUserId: auditSession?.user.id,
			action: "create",
			subjectType: "create_unit_relation",
			subjectId: getAuditSubjectIdFromFormData(formData),
			summary: getAuditSummaryFromFormData(formData),
		});

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
