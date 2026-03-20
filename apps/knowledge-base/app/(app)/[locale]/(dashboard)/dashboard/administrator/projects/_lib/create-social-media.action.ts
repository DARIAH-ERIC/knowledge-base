"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import {
	createActionStateError,
	createActionStateSuccess,
	type ValidationErrors,
} from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateSocialMediaSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-social-media.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";

export interface CreatedSocialMedia {
	id: string;
	name: string;
	url: string;
	type: { type: string };
}

export const createSocialMediaAction = createServerAction<CreatedSocialMedia>(
	async function createSocialMediaAction(_state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAuthenticated();

		const result = await v.safeParseAsync(CreateSocialMediaSchema, getFormDataValues(formData), {
			lang: getIntlLanguage(locale),
		});

		if (!result.success) {
			const errors = v.flatten<typeof CreateSocialMediaSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as ValidationErrors | undefined,
			});
		}

		const { name, url, type, duration } = result.output;

		const socialMediaType = await db.query.socialMediaTypes.findFirst({
			where: { type },
			columns: { id: true },
		});

		if (socialMediaType == null) {
			return createActionStateError({ message: t("Invalid social media type.") });
		}

		const [created] = await db
			.insert(schema.socialMedia)
			.values({
				name,
				url,
				typeId: socialMediaType.id,
				duration: duration?.start != null ? { start: duration.start, end: duration.end } : null,
			})
			.returning({ id: schema.socialMedia.id });

		assert(created);

		return createActionStateSuccess({
			data: { id: created.id, name, url, type: { type } },
		});
	},
);
