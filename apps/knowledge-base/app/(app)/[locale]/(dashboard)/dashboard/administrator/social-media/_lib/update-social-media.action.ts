"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import { eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateSocialMediaActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_lib/update-social-media.schema";
import { assertAdmin } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateSocialMediaAction = createServerAction(
	async function updateSocialMediaAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateSocialMediaActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateSocialMediaActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, name, url, type, duration } = result.output;

		const socialMediaType = await db.query.socialMediaTypes.findFirst({
			where: { type },
			columns: { id: true },
		});

		assert(socialMediaType, "Social media type not found.");

		const durationValue =
			duration?.start != null ? { start: duration.start, end: duration.end } : null;

		await db
			.update(schema.socialMedia)
			.set({ name, url, typeId: socialMediaType.id, duration: durationValue })
			.where(eq(schema.socialMedia.id, id));

		revalidatePath("/[locale]/dashboard/administrator/social-media", "layout");

		redirect({ href: "/dashboard/administrator/social-media", locale });
	},
);
