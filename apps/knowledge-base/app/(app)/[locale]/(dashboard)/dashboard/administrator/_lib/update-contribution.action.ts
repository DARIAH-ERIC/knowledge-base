"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, createActionStateSuccess } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import * as v from "valibot";

import { UpdateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-contribution.schema";
import { assertAdmin } from "@/lib/auth/session";
import { publishVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { ensureOrganisationalUnitDraftVersion } from "@/lib/data/organisational-unit-drafts";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import { ensurePersonDraftVersion } from "@/lib/data/person-drafts";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateContributionAction = createServerAction(
	async function updateContributionAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

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

		const { id, personId, roleTypeId, organisationalUnitId, duration } = result.output;

		const contribution = await db.query.personsToOrganisationalUnits.findFirst({
			where: { id },
			columns: {
				id: true,
				duration: true,
				organisationalUnitId: true,
				personId: true,
				roleTypeId: true,
			},
		});

		if (contribution == null) {
			return createActionStateError({ message: t("Contribution not found.") });
		}

		const returned = await db.transaction(async (tx) => {
			const sourceDraftPersonId = await ensurePersonDraftVersion(tx, contribution.personId);
			const targetDraftPersonId = await ensurePersonDraftVersion(tx, personId);
			const sourceDraftOrganisationalUnitId = await ensureOrganisationalUnitDraftVersion(
				tx,
				contribution.organisationalUnitId,
			);
			const targetDraftOrganisationalUnitId = await ensureOrganisationalUnitDraftVersion(
				tx,
				organisationalUnitId,
			);
			const draftContribution =
				sourceDraftPersonId === contribution.personId &&
				sourceDraftOrganisationalUnitId === contribution.organisationalUnitId
					? { id }
					: await tx.query.personsToOrganisationalUnits.findFirst({
							where: {
								personId: sourceDraftPersonId,
								organisationalUnitId: sourceDraftOrganisationalUnitId,
								roleTypeId: contribution.roleTypeId,
							},
							columns: { id: true },
						});

			if (draftContribution == null) {
				return { error: "not-found" as const };
			}

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
						eq(schema.organisationalUnits.id, targetDraftOrganisationalUnitId),
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
					AND: [
						{ personId: targetDraftPersonId },
						{ organisationalUnitId: targetDraftOrganisationalUnitId },
						{ roleTypeId },
						{ id: { ne: draftContribution.id } },
					],
				},
				columns: { id: true },
			});

			if (existing != null) {
				return { error: "duplicate" as const };
			}

			await tx
				.update(schema.personsToOrganisationalUnits)
				.set({
					duration,
					organisationalUnitId: targetDraftOrganisationalUnitId,
					personId: targetDraftPersonId,
					roleTypeId,
				})
				.where(eq(schema.personsToOrganisationalUnits.id, draftContribution.id));

			await touchVersion(tx, sourceDraftPersonId);
			await touchVersion(tx, sourceDraftOrganisationalUnitId);

			if (sourceDraftPersonId !== targetDraftPersonId) {
				await touchVersion(tx, targetDraftPersonId);
			}

			if (sourceDraftOrganisationalUnitId !== targetDraftOrganisationalUnitId) {
				await touchVersion(tx, targetDraftOrganisationalUnitId);
			}

			if (shouldSaveAndPublish(formData)) {
				const [personVersion, organisationalUnitVersion] = await Promise.all([
					tx.query.entityVersions.findFirst({
						where: { id: targetDraftPersonId },
						columns: {},
						with: { entity: { columns: { id: true } } },
					}),
					tx.query.entityVersions.findFirst({
						where: { id: targetDraftOrganisationalUnitId },
						columns: {},
						with: { entity: { columns: { id: true } } },
					}),
				]);

				if (personVersion != null) {
					await publishVersion(tx, personVersion.entity.id, personsLifecycleAdapter);
				}

				if (organisationalUnitVersion != null) {
					await publishVersion(
						tx,
						organisationalUnitVersion.entity.id,
						organisationalUnitsLifecycleAdapter,
					);
				}
			}

			return { id: draftContribution.id };
		});

		if ("error" in returned) {
			if (returned.error === "duplicate") {
				return createActionStateError({ message: t("This contribution already exists.") });
			}

			if (returned.error === "not-found") {
				return createActionStateError({ message: t("Contribution not found.") });
			}

			return createActionStateError({
				message: t("The selected role is not allowed for this organisation."),
				validationErrors: {
					organisationalUnitId: t("The selected role is not allowed for this organisation."),
				},
			});
		}

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({ data: { id: returned.id } });
	},
);
