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
			// personId / unitId are document ids (entities.id). Relations are document-level and do not
			// require the edited working group to be published (the person picker restricts to published).
			const existing = await tx.query.personsToOrganisationalUnits.findFirst({
				where: {
					personDocumentId: personId,
					organisationalUnitDocumentId: unitId,
					roleTypeId: roleType.id,
				},
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			const row = await tx
				.insert(schema.personsToOrganisationalUnits)
				.values({
					personDocumentId: personId,
					organisationalUnitDocumentId: unitId,
					roleTypeId: roleType.id,
					duration,
				})
				.returning({ id: schema.personsToOrganisationalUnits.id })
				.then((rows) => rows[0]!);

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
