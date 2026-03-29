"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import { and, eq, inArray, notInArray } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { UpdateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/update-project.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateProjectAction = createServerAction(
	async function updateProjectAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			UpdateProjectActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateProjectActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as ValidationErrors | undefined,
			});
		}

		const {
			acronym,
			call,
			description,
			duration,
			funding,
			id,
			imageKey,
			name,
			partners,
			scopeId,
			socialMediaIds,
			summary,
			topic,
		} = result.output;

		await db.transaction(async (tx) => {
			let imageId = null;

			if (imageKey != null) {
				const asset = await tx.query.assets.findFirst({
					where: { key: imageKey },
					columns: { id: true },
				});

				assert(asset);

				imageId = asset.id;
			}

			await tx
				.update(schema.projects)
				.set({
					id,
					acronym,
					call,
					duration,
					funding,
					imageId,
					name,
					scopeId,
					summary,
					topic,
				})
				.where(eq(schema.projects.id, id));

			const descriptionField = await tx.query.fields.findFirst({
				where: {
					entityId: id,
					name: { fieldName: "description" },
				},
				columns: { id: true },
			});

			const parsedContent = JSON.parse(description) as schema.RichTextContentBlock["content"];

			if (descriptionField != null) {
				const existingContentBlock = await tx.query.contentBlocks.findFirst({
					where: {
						fieldId: descriptionField.id,
						type: { type: "rich_text" },
					},
					columns: { id: true },
				});

				if (existingContentBlock != null) {
					await tx
						.update(schema.richTextContentBlocks)
						.set({ content: parsedContent })
						.where(eq(schema.richTextContentBlocks.id, existingContentBlock.id));
				} else {
					const richTextType = await tx.query.contentBlockTypes.findFirst({
						where: { type: "rich_text" },
						columns: { id: true },
					});

					assert(richTextType);

					const [newContentBlock] = await tx
						.insert(schema.contentBlocks)
						.values({ fieldId: descriptionField.id, typeId: richTextType.id, position: 0 })
						.returning({ id: schema.contentBlocks.id });

					assert(newContentBlock);

					await tx.insert(schema.richTextContentBlocks).values({
						id: newContentBlock.id,
						content: parsedContent,
					});
				}
			}

			// Sync partners: delete removed, update existing, insert new.
			const submittedPartnerIds = partners
				.map((p) => {
					return p.id;
				})
				.filter((pid): pid is string => {
					return pid != null;
				});

			if (submittedPartnerIds.length > 0) {
				await tx
					.delete(schema.projectsToOrganisationalUnits)
					.where(
						and(
							eq(schema.projectsToOrganisationalUnits.projectId, id),
							notInArray(schema.projectsToOrganisationalUnits.id, submittedPartnerIds),
						),
					);
			} else {
				await tx
					.delete(schema.projectsToOrganisationalUnits)
					.where(eq(schema.projectsToOrganisationalUnits.projectId, id));
			}

			for (const p of partners) {
				const duration =
					p.durationStart != null
						? { start: p.durationStart, end: p.durationEnd ?? undefined }
						: undefined;

				if (p.id != null) {
					await tx
						.update(schema.projectsToOrganisationalUnits)
						.set({ unitId: p.unitId, roleId: p.roleId, duration: duration ?? null })
						.where(eq(schema.projectsToOrganisationalUnits.id, p.id));
				} else {
					await tx
						.insert(schema.projectsToOrganisationalUnits)
						.values({ projectId: id, unitId: p.unitId, roleId: p.roleId, duration });
				}
			}

			// Sync social media: delete removed, insert new — preserve existing junction rows.
			const existingSocialMedia = await tx.query.projectsToSocialMedia.findMany({
				where: { projectId: id },
				columns: { id: true, socialMediaId: true },
			});

			const existingSocialMediaIds = new Set(
				existingSocialMedia.map((r) => {
					return r.socialMediaId;
				}),
			);
			const submittedSocialMediaIds = new Set(socialMediaIds);

			const socialMediaToDelete = existingSocialMedia
				.filter((r) => {
					return !submittedSocialMediaIds.has(r.socialMediaId);
				})
				.map((r) => {
					return r.id;
				});

			if (socialMediaToDelete.length > 0) {
				await tx
					.delete(schema.projectsToSocialMedia)
					.where(inArray(schema.projectsToSocialMedia.id, socialMediaToDelete));
			}

			const socialMediaToInsert = socialMediaIds.filter((smId) => {
				return !existingSocialMediaIds.has(smId);
			});

			if (socialMediaToInsert.length > 0) {
				await tx.insert(schema.projectsToSocialMedia).values(
					socialMediaToInsert.map((socialMediaId) => {
						return { projectId: id, socialMediaId };
					}),
				);
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/projects", "layout");

		redirect({ href: "/dashboard/administrator/projects", locale });
	},
);
