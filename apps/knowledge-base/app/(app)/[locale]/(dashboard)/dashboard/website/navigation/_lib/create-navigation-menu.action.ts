"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateNavigationMenuActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_lib/create-navigation-menu.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createNavigationMenuAction = createServerAction(
	async function createNavigationMenuAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateNavigationMenuActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateNavigationMenuActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { name } = result.output;

		const [menu] = await db
			.insert(schema.navigationMenus)
			.values({ name })
			.returning({ id: schema.navigationMenus.id });

		after(async () => {
			await dispatchWebhook({ type: "navigation" });
		});

		revalidatePath("/[locale]/dashboard/website/navigation", "layout");

		return createActionStateSuccess({ data: menu });
	},
);
