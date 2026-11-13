"use server";

import { CreateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-project.schema";
import { createProjectDraft } from "@/lib/data/create-project-draft";
import { publishVersion } from "@/lib/data/entity-lifecycle";
import { projectsLifecycleAdapter } from "@/lib/data/projects.lifecycle-adapter";
import { getRequestedSlug } from "@/lib/entity-slug-input";
import { shouldSaveAndPublish } from "@/lib/form-intent";
import { syncWebsiteDocumentForEntity } from "@/lib/search/website-index";
import { createMutationAction, getCreatedSlug } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createProjectAction = createMutationAction({
	schema: CreateProjectActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "projects" },
	revalidate: "/[locale]/dashboard/administrator/projects",
	redirect: ({ result }) => `/dashboard/administrator/projects/${getCreatedSlug(result)}/details`,

	async mutate(tx, input, { formData }) {
		const { documentId, slug } = await createProjectDraft(tx, {
			...input,
			requestedSlug: getRequestedSlug(input.slug),
		});

		if (shouldSaveAndPublish(formData)) {
			await publishVersion(tx, documentId, projectsLifecycleAdapter);
		}

		return {
			subjectId: documentId,
			subjectSlug: slug,
			auditSummary: {
				lifecycle: shouldSaveAndPublish(formData) ? "published" : "draft",
			},
		};
	},

	async postCommit({ result, ctx }) {
		if (!shouldSaveAndPublish(ctx.formData)) {
			return;
		}
		await syncWebsiteDocumentForEntity(result.subjectId);
		await dispatchWebhook({ tags: ["projects"] });
	},
});
