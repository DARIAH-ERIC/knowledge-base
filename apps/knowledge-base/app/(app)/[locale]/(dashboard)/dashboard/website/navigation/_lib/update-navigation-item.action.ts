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

import { UpdateNavigationItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_lib/update-navigation-item.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateNavigationItemAction = createServerAction(
	async function updateNavigationItemAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateNavigationItemActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateNavigationItemActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, label, href, entityId, isExternal } = result.output;

		await db
			.update(schema.navigationItems)
			.set({
				label,
				href: href ?? null,
				entityId: entityId ?? null,
				isExternal: isExternal ?? false,
			})
			.where(eq(schema.navigationItems.id, id));

		after(async () => {
			await dispatchWebhook({ type: "navigation" });
		});

		revalidatePath("/[locale]/dashboard/website/navigation", "layout");

		return createActionStateSuccess({});
	},
);
