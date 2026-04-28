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

import { CreateNavigationItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_lib/create-navigation-item.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { and, eq, isNull } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createNavigationItemAction = createServerAction(
	async function createNavigationItemAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateNavigationItemActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateNavigationItemActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { menuId, parentId, label, href, entityId, isExternal } = result.output;

		const siblings = await db
			.select({ id: schema.navigationItems.id })
			.from(schema.navigationItems)
			.where(
				parentId != null
					? eq(schema.navigationItems.parentId, parentId)
					: and(eq(schema.navigationItems.menuId, menuId), isNull(schema.navigationItems.parentId)),
			);

		await db.insert(schema.navigationItems).values({
			menuId,
			parentId: parentId ?? null,
			label,
			href: href ?? null,
			entityId: entityId ?? null,
			isExternal: isExternal ?? false,
			position: siblings.length,
		});

		after(async () => {
			await dispatchWebhook({ type: "navigation" });
		});

		revalidatePath("/[locale]/dashboard/website/navigation", "layout");

		return createActionStateSuccess({});
	},
);
