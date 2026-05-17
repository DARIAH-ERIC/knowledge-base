"use server";

import * as schema from "@dariah-eric/database/schema";
import {
	type ValidationErrors,
	createActionStateError,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { UpdateOrganigramActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/organigram/_lib/update-organigram.schema";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq, sql } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

function normalizeArray(entries: Array<FormDataEntryValue>): Array<string> {
	return entries.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
}

export const updateOrganigramAction = createServerAction(
	async function updateOrganigramAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		await assertAdmin();

		const ids = normalizeArray(formData.getAll("id"));
		const labels = normalizeArray(formData.getAll("label"));
		const descriptions = normalizeArray(formData.getAll("description"));
		const positions = normalizeArray(formData.getAll("position"));
		const kinds = normalizeArray(formData.getAll("kind"));

		if (
			ids.length !== labels.length ||
			ids.length !== descriptions.length ||
			ids.length !== positions.length ||
			ids.length !== kinds.length
		) {
			return createActionStateError({ message: t("Invalid or missing fields.") });
		}

		const input = {
			nodes: ids.map((id, index) => {
				const description = descriptions[index] ?? "";
				const position = positions[index] ?? "";

				return {
					id,
					label: labels[index] ?? "",
					description: description === "" ? null : description,
					position: position === "" ? null : Number(position),
					kind: kinds[index] as (typeof schema.organigramNodeKindsEnum)[number],
				};
			}),
		};

		const result = await v.safeParseAsync(UpdateOrganigramActionInputSchema, input, {
			lang: getIntlLanguage(locale),
		});

		if (!result.success) {
			const errors = v.flatten<typeof UpdateOrganigramActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		await db.transaction(async (tx) => {
			for (const node of result.output.nodes) {
				await tx
					.update(schema.organigramNodes)
					.set({
						label: node.label,
						description: node.description,
						position: node.position,
						updatedAt: sql`NOW()`,
					})
					.where(eq(schema.organigramNodes.id, node.id));
			}
		});

		after(async () => {
			await dispatchWebhook({ type: "organigram" });
		});

		revalidatePath("/[locale]/dashboard/website/organigram", "layout");

		return createActionStateSuccess({ message: t("Organigram saved.") });
	},
);
