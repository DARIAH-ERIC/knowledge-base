"use server";

import { assert, getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { getExtracted, getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import * as v from "valibot";

import { UpdateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/update-project.schema";
import {
	getAuditSubjectIdFromFormData,
	getAuditSummaryFromFormData,
	recordAuditEvent,
} from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { ensureDraftVersion, publishVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { upsertRichTextEntityVersionField } from "@/lib/data/entity-version-fields";
import { projectsLifecycleAdapter } from "@/lib/data/projects.lifecycle-adapter";
import { db } from "@/lib/db";
import { and, eq, inArray, notInArray } from "@/lib/db/sql";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createServerAction } from "@/lib/server/create-server-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateProjectAction = createServerAction(
	async function updateProjectAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const auditSession = await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateProjectActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateProjectActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested,
			});
		}

		const {
			acronym,
			call,
			description,
			documentId,
			duration,
			funding,
			imageKey,
			name,
			partners,
			scopeId,
			socialMediaIds,
			summary,
			topic,
		} = result.output;

		await db.transaction(async (tx) => {
			const draftVersionId = await ensureDraftVersion(tx, documentId, projectsLifecycleAdapter);

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
				.where(eq(schema.projects.id, draftVersionId));

			const parsedContent = JSON.parse(description) as schema.RichTextContentBlock["content"];

			await upsertRichTextEntityVersionField(tx, draftVersionId, "description", parsedContent);

			const submittedPartnerIds = partners
				.map((p) => p.id)
				.filter((pid): pid is string => pid != null);

			if (submittedPartnerIds.length > 0) {
				await tx
					.delete(schema.projectsToOrganisationalUnits)
					.where(
						and(
							eq(schema.projectsToOrganisationalUnits.projectId, draftVersionId),
							notInArray(schema.projectsToOrganisationalUnits.id, submittedPartnerIds),
						),
					);
			} else {
				await tx
					.delete(schema.projectsToOrganisationalUnits)
					.where(eq(schema.projectsToOrganisationalUnits.projectId, draftVersionId));
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
						.values({ projectId: draftVersionId, unitId: p.unitId, roleId: p.roleId, duration });
				}
			}

			const existingSocialMedia = await tx.query.projectsToSocialMedia.findMany({
				where: { projectId: draftVersionId },
				columns: { id: true, socialMediaId: true },
			});

			const existingSocialMediaIds = new Set(existingSocialMedia.map((r) => r.socialMediaId));
			const submittedSocialMediaIds = new Set(socialMediaIds);

			const socialMediaToDelete = existingSocialMedia
				.filter((r) => !submittedSocialMediaIds.has(r.socialMediaId))
				.map((r) => r.id);

			if (socialMediaToDelete.length > 0) {
				await tx
					.delete(schema.projectsToSocialMedia)
					.where(inArray(schema.projectsToSocialMedia.id, socialMediaToDelete));
			}

			const socialMediaToInsert = socialMediaIds.filter(
				(smId) => !existingSocialMediaIds.has(smId),
			);

			if (socialMediaToInsert.length > 0) {
				await tx.insert(schema.projectsToSocialMedia).values(
					socialMediaToInsert.map((socialMediaId) => {
						return { projectId: draftVersionId, socialMediaId };
					}),
				);
			}

			await touchVersion(tx, draftVersionId);

			if (shouldSaveAndPublish(formData)) {
				await publishVersion(tx, documentId, projectsLifecycleAdapter);
			}
		});

		after(async () => {
			if (!shouldSaveAndPublish(formData)) {
				return;
			}

			await syncWebsiteDocumentForEntity(documentId);
			await dispatchWebhook({ type: "dariah-projects" });
		});

		await recordAuditEvent(db, {
			actorUserId: auditSession?.user.id,
			action: "update",
			subjectType: "projects",
			subjectId: getAuditSubjectIdFromFormData(formData),
			summary: {
				...getAuditSummaryFromFormData(formData),
				lifecycle: shouldSaveAndPublish(formData) ? "published" : "draft",
			},
		});

		revalidatePath("/[locale]/dashboard/administrator/projects", "layout");

		redirect({ href: "/dashboard/administrator/projects", locale });
	},
);
