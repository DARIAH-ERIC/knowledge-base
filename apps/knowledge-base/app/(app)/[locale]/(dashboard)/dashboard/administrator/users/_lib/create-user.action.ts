"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateUserActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/create-user.schema";
import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createUserAction = createServerAction(
	async function createUserAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			CreateUserActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateUserActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { name, email, role, password, personId, organisationalUnitId } = result.output;

		if (!(await auth.isEmailAvailable(email))) {
			return createActionStateError({ message: t("This email address is already in use.") });
		}

		const user = await auth.createUser(email, name, password);

		await db
			.update(schema.users)
			.set({ role, personId: personId ?? null, organisationalUnitId: organisationalUnitId ?? null })
			.where(eq(schema.users.id, user.id));

		revalidatePath("/[locale]/dashboard/administrator/users", "layout");

		redirect({ href: "/dashboard/administrator/users", locale });
	},
);
