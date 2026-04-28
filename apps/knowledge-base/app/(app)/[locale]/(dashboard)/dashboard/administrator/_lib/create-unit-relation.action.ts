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

import { CreateUnitRelationActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-unit-relation.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export const createUnitRelationAction = createServerAction(
	async function createUnitRelationAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateUnitRelationActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateUnitRelationActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { unitId, statusId, relatedUnitId, duration } = result.output;

		const existing = await db.query.organisationalUnitsRelations.findFirst({
			where: {
				unitId,
				relatedUnitId,
				status: statusId,
			},
			columns: { id: true },
		});

		if (existing != null) {
			return createActionStateError({ message: t("This relation already exists.") });
		}

		const returned = await db
			.insert(schema.organisationalUnitsRelations)
			.values({ unitId, relatedUnitId, status: statusId, duration })
			.returning({ id: schema.organisationalUnitsRelations.id })
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
