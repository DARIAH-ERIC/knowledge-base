"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-contribution.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
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
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, personId, roleTypeId, organisationalUnitId, duration } = result.output;

		const contribution = await db.query.personsToOrganisationalUnits.findFirst({
			where: { id },
			columns: { id: true },
		});

		if (contribution == null) {
			return createActionStateError({ message: t("Contribution not found.") });
		}

		const allowedRelation = await db
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
					eq(schema.organisationalUnits.id, organisationalUnitId),
					eq(
						schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
						roleTypeId,
					),
				),
			)
			.limit(1)
			.then((rows) => {
				return rows[0] ?? null;
			});

		if (allowedRelation == null) {
			return createActionStateError({
				message: t("The selected role is not allowed for this organisation."),
				validationErrors: {
					organisationalUnitId: t("The selected role is not allowed for this organisation."),
				},
			});
		}

		const existing = await db.query.personsToOrganisationalUnits.findFirst({
			where: {
				AND: [{ personId }, { organisationalUnitId }, { roleTypeId }, { id: { ne: id } }],
			},
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This contribution already exists.") });
		}

		await db
			.update(schema.personsToOrganisationalUnits)
			.set({ duration, organisationalUnitId, personId, roleTypeId })
			.where(eq(schema.personsToOrganisationalUnits.id, id));

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({ data: { id } });
	},
);
