"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { UpdateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-contribution.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { db } from "@/lib/db";
import { and, eq, ne, sql } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateContributionAction = createServerAction(
	{ requireAdmin: true },
	async function updateContributionAction(state, formData, { user }) {
		const locale = await getLocale();
		const t = await getExtracted();
		const result = await v.safeParseAsync(
			UpdateContributionActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateContributionActionInputSchema>(result.issues);
			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { id, personDocumentId, roleTypeId, organisationalUnitDocumentId, duration } =
			result.output;

		const returned = await db.transaction(async (tx) => {
			const unit = await tx
				.select({
					unitType: schema.organisationalUnitTypes.type,
					allowedRelationId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.id,
				})
				.from(schema.organisationalUnits)
				.innerJoin(
					schema.documentLifecycle,
					sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
				)
				.innerJoin(
					schema.organisationalUnitTypes,
					eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
				)
				.leftJoin(
					schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations,
					and(
						eq(
							schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
							schema.organisationalUnits.typeId,
						),
						eq(
							schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
							roleTypeId,
						),
					),
				)
				.where(eq(schema.documentLifecycle.documentId, organisationalUnitDocumentId))
				.limit(1)
				.then((rows) => rows[0] ?? null);

			if (unit?.allowedRelationId == null) {
				return { error: "role-not-allowed" as const };
			}

			const existing = await tx
				.select({ id: schema.personsToOrganisationalUnits.id })
				.from(schema.personsToOrganisationalUnits)
				.where(
					and(
						ne(schema.personsToOrganisationalUnits.id, id),
						eq(schema.personsToOrganisationalUnits.personDocumentId, personDocumentId),
						eq(
							schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
							organisationalUnitDocumentId,
						),
						eq(schema.personsToOrganisationalUnits.roleTypeId, roleTypeId),
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
					personDocumentId,
					organisationalUnitDocumentId,
					roleTypeId,
					duration,
				})
				.where(eq(schema.personsToOrganisationalUnits.id, id));

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "update",
				subjectType: "contributions",
				subjectId: id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return { ok: true };
		});

		if ("error" in returned) {
			if (returned.error === "duplicate") {
				return createActionStateError({ message: t("This contribution already exists.") });
			}
			return createActionStateError({
				message: t("The selected role is not allowed for this organisation."),
			});
		}

		revalidatePath("/[locale]/dashboard/administrator", "layout");
		return createActionStateSuccess({});
	},
);
