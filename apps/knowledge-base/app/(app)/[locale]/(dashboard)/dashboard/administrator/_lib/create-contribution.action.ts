"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { db } from "@/lib/db";
import { and, eq, sql } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

/** Uses createServerAction because the success response carries typed data. */
export const createContributionAction = createServerAction(
	{ requireAdmin: true },
	async function createContributionAction(state, formData, { user }) {
		const locale = await getLocale();
		const t = await getExtracted();

		const result = await v.safeParseAsync(
			CreateContributionActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateContributionActionInputSchema>(result.issues);
			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const { personDocumentId, roleTypeId, organisationalUnitDocumentId, duration } = result.output;

		const returned = await db.transaction(async (tx) => {
			// Relations are document-level and do not require the edited entity to be published. Resolve
			// the org to its current version to validate the role/unit-type combination.
			const unit = await tx
				.select({
					unitType: schema.organisationalUnitTypes.type,
					slug: schema.entities.slug,
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
				.innerJoin(schema.entities, eq(schema.entities.id, schema.documentLifecycle.documentId))
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

			const existing = await tx.query.personsToOrganisationalUnits.findFirst({
				where: {
					personDocumentId,
					organisationalUnitDocumentId,
					roleTypeId,
				},
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			const personEntity = await tx
				.select({ slug: schema.entities.slug })
				.from(schema.entities)
				.where(eq(schema.entities.id, personDocumentId))
				.limit(1)
				.then((rows) => rows[0] ?? null);

			const row = await tx
				.insert(schema.personsToOrganisationalUnits)
				.values({
					personDocumentId,
					organisationalUnitDocumentId,
					roleTypeId,
					duration,
				})
				.returning({ id: schema.personsToOrganisationalUnits.id })
				.then((rows) => rows[0]!);

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "create",
				subjectType: "create_contribution",
				subjectId: row.id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return {
				row,
				targetUnitType: unit.unitType,
				organisationalUnitSlug: unit.slug,
				personSlug: personEntity?.slug,
			};
		});

		if ("error" in returned) {
			if (returned.error === "duplicate") {
				return createActionStateError({ message: t("This contribution already exists.") });
			}
			return createActionStateError({
				message: t("The selected role is not allowed for this organisation."),
				validationErrors: {
					organisationalUnitDocumentId: t(
						"The selected role is not allowed for this organisation.",
					),
				},
			});
		}

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({
			data: {
				id: returned.row.id,
				durationStart: duration.start.toISOString(),
				durationEnd: duration.end?.toISOString() ?? null,
				targetUnitType: returned.targetUnitType,
				organisationalUnitSlug: returned.organisationalUnitSlug,
				personSlug: returned.personSlug,
			},
		});
	},
);
