"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { UpdateWorkingGroupChairActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/update-working-group-chair.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { db } from "@/lib/db";
import { and, eq, ne } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

/** Uses createServerAction because the success response carries typed data. */
export const updateWorkingGroupChairAction = createServerAction(
	{ requireAdmin: true },
	async function updateWorkingGroupChairAction(state, formData, { user }) {
		const locale = await getLocale();
		const t = await getExtracted();

		const result = await v.safeParseAsync(
			UpdateWorkingGroupChairActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateWorkingGroupChairActionInputSchema>(result.issues);
			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { id, unitId, personId, duration } = result.output;

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
			const existing = await tx
				.select({ id: schema.personsToOrganisationalUnits.id })
				.from(schema.personsToOrganisationalUnits)
				.where(
					and(
						ne(schema.personsToOrganisationalUnits.id, id),
						eq(schema.personsToOrganisationalUnits.personDocumentId, personId),
						eq(schema.personsToOrganisationalUnits.organisationalUnitDocumentId, unitId),
						eq(schema.personsToOrganisationalUnits.roleTypeId, roleType.id),
					),
				)
				.limit(1)
				.then((rows) => rows[0] ?? null);

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			await tx
				.update(schema.personsToOrganisationalUnits)
				.set({
					personDocumentId: personId,
					organisationalUnitDocumentId: unitId,
					roleTypeId: roleType.id,
					duration,
				})
				.where(eq(schema.personsToOrganisationalUnits.id, id));

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "update",
				subjectType: "working_groups",
				subjectId: id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return { ok: true };
		});

		if ("error" in returned) {
			return createActionStateError({ message: t("This chair relation already exists.") });
		}

		after(async () => {
			await dispatchWebhook({ type: "working-groups" });
		});

		revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");

		return createActionStateSuccess({});
	},
);
