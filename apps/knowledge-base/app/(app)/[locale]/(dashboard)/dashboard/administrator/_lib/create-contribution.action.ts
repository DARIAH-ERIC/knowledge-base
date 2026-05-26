"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { CreateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.schema";
import { getAuditSummaryFromFormData, recordAuditEvent } from "@/lib/audit/audit-log";
import { isPublishedEntityVersions } from "@/lib/data/current-entity-version";
import { touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { ensurePersonDraftVersion } from "@/lib/data/person-drafts";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
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

		const { personId, roleTypeId, organisationalUnitId, duration } = result.output;

		const returned = await db.transaction(async (tx) => {
			if (!(await isPublishedEntityVersions(tx, [personId, organisationalUnitId]))) {
				return { error: "not-published" as const };
			}

			const draftPersonId = await ensurePersonDraftVersion(tx, personId);
			const draftOrganisationalUnitId = await ensureOrganisationalUnitDraftVersion(
				tx,
				organisationalUnitId,
			);
			const allowedRelation = await tx
				.select({ id: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.id })
				.from(schema.organisationalUnits)
				.innerJoin(
					schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations,
					eq(
						schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
						schema.organisationalUnits.typeId,
					),
				)
				.where(
					and(
						eq(schema.organisationalUnits.id, draftOrganisationalUnitId),
						eq(
							schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
							roleTypeId,
						),
					),
				)
				.limit(1)
				.then((rows) => rows[0] ?? null);

			if (allowedRelation == null) {
				return { error: "role-not-allowed" as const };
			}

			const existing = await tx.query.personsToOrganisationalUnits.findFirst({
				where: {
					personId: draftPersonId,
					organisationalUnitId: draftOrganisationalUnitId,
					roleTypeId,
				},
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			const unit = await tx.query.organisationalUnits.findFirst({
				where: { id: draftOrganisationalUnitId },
				columns: {},
				with: { type: { columns: { type: true } } },
			});

			const row = await tx
				.insert(schema.personsToOrganisationalUnits)
				.values({
					personId: draftPersonId,
					organisationalUnitId: draftOrganisationalUnitId,
					roleTypeId,
					duration,
				})
				.returning({ id: schema.personsToOrganisationalUnits.id })
				.then((rows) => rows[0]!);

			await touchVersion(tx, draftPersonId);
			await touchVersion(tx, draftOrganisationalUnitId);

			await recordAuditEvent(tx, {
				actorUserId: user?.id,
				action: "create",
				subjectType: "create_contribution",
				subjectId: row.id,
				summary: getAuditSummaryFromFormData(formData),
			});

			return { row, targetUnitType: unit?.type.type };
		});

		if ("error" in returned) {
			if (returned.error === "duplicate") {
				return createActionStateError({ message: t("This contribution already exists.") });
			}
			if (returned.error === "not-published") {
				return createActionStateError({
					message: t("Relations can only target published entities."),
				});
			}
			return createActionStateError({
				message: t("The selected role is not allowed for this organisation."),
				validationErrors: {
					organisationalUnitId: t("The selected role is not allowed for this organisation."),
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
			},
		});
	},
);
