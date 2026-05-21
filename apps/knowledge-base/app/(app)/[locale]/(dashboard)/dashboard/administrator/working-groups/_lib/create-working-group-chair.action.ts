"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateWorkingGroupChairActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group-chair.schema";
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
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createWorkingGroupChairAction = createServerAction(
	async function createWorkingGroupChairAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		const auditSession = await assertAdmin();

		const result = await v.safeParseAsync(
			CreateWorkingGroupChairActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateWorkingGroupChairActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { unitId, personId, duration } = result.output;

		const roleType = await db.query.personRoleTypes.findFirst({
			where: { type: "is_chair_of" },
			columns: { id: true },
		});

		if (roleType == null) {
			return createActionStateError({ message: t("Role type not found.") });
		}

		const returned = await db.transaction(async (tx) => {
			const draftUnitId = await ensureOrganisationalUnitDraftVersion(tx, unitId);
			const existing = await tx.query.personsToOrganisationalUnits.findFirst({
				where: { personId, organisationalUnitId: draftUnitId, roleTypeId: roleType.id },
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			const row = await tx
				.insert(schema.personsToOrganisationalUnits)
				.values({ personId, organisationalUnitId: draftUnitId, roleTypeId: roleType.id, duration })
				.returning({ id: schema.personsToOrganisationalUnits.id })
				.then((rows) => rows[0]!);

			await touchVersion(tx, draftUnitId);

			return { row };
		});

		if ("error" in returned) {
			return createActionStateError({ message: t("This chair relation already exists.") });
		}

		await dispatchWebhook({ type: "working-groups" });
		await recordAuditEvent(db, {
			actorUserId: auditSession?.user.id,
			action: "create",
			subjectType: "working_groups",
			subjectId: getAuditSubjectIdFromFormData(formData),
			summary: getAuditSummaryFromFormData(formData),
		});

		revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");

		return createActionStateSuccess({
			data: {
				id: returned.row.id,
				durationStart: duration.start.toISOString(),
				durationEnd: duration.end?.toISOString() ?? null,
			},
		});
	},
);
