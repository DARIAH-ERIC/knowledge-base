"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { CreateWorkingGroupChairActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group-chair.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { isPublishedEntityVersions } from "@/lib/data/current-entity-version";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

/** Uses createServerAction because the success response carries typed data. */
export const createWorkingGroupChairAction = createServerAction(
	{ requireAdmin: true },
	async function createWorkingGroupChairAction(state, formData, { user }) {
		const locale = await getLocale();
		const t = await getExtracted();

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
			if (!(await isPublishedEntityVersions(tx, [personId, unitId]))) {
				return { error: "not-published" as const };
			}

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

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "create",
				subjectType: "working_groups",
				subjectId: row.id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return { row };
		});

		if ("error" in returned) {
			if (returned.error === "not-published") {
				return createActionStateError({
					message: t("Relations can only target published entities."),
				});
			}
			return createActionStateError({ message: t("This chair relation already exists.") });
		}

		after(async () => {
			await dispatchWebhook({ type: "working-groups" });
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
