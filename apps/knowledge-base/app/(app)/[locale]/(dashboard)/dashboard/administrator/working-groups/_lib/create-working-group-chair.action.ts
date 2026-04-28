"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateWorkingGroupChairActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group-chair.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createWorkingGroupChairAction = createServerAction(
	async function createWorkingGroupChairAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateWorkingGroupChairActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateWorkingGroupChairActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
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

		const existing = await db.query.personsToOrganisationalUnits.findFirst({
			where: { personId, organisationalUnitId: unitId, roleTypeId: roleType.id },
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This chair relation already exists.") });
		}

		const returned = await db
			.insert(schema.personsToOrganisationalUnits)
			.values({ personId, organisationalUnitId: unitId, roleTypeId: roleType.id, duration })
			.returning({ id: schema.personsToOrganisationalUnits.id })
			.then((rows) => {
				return rows[0]!;
			});

		revalidatePath("/[locale]/dashboard/administrator/working-groups", "layout");

		return createActionStateSuccess({
			data: {
				id: returned.id,
				durationStart: duration.start.toISOString(),
				durationEnd: duration.end?.toISOString() ?? null,
			},
		});
	},
);
