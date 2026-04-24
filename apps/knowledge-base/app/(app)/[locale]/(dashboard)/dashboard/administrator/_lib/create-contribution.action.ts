"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
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

import { CreateContributionActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createContributionAction = createServerAction(
	async function createContributionAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateContributionActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateContributionActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { personId, roleTypeId, organisationalUnitId, duration } = result.output;

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
			where: { personId, organisationalUnitId, roleTypeId },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This contribution already exists.") });
		}

		const returned = await db
			.insert(schema.personsToOrganisationalUnits)
			.values({ personId, organisationalUnitId, roleTypeId, duration })
			.returning({ id: schema.personsToOrganisationalUnits.id })
			.then((rows) => {
				return rows[0]!;
			});

		revalidatePath("/[locale]/dashboard/administrator", "layout");

		return createActionStateSuccess({
			data: {
				id: returned.id,
				durationStart: duration.start.toISOString(),
				durationEnd: duration.end?.toISOString() ?? null,
			},
		});
	},
);
