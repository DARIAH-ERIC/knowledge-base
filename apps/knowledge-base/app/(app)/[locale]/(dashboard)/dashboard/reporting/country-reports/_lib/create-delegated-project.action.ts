"use server";

import { getExtracted } from "next-intl/server";
import * as v from "valibot";

import { CreateProjectActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-project.schema";
import { assertCan, assertReportEditable } from "@/lib/auth/permissions";
import { createProjectDraft } from "@/lib/data/create-project-draft";
import { countryReportRevalidatePaths } from "@/lib/data/reporting-urls";
import { notifyDraftEntityCreated } from "@/lib/email/send-delegated-change-notification";
import { createMutationAction } from "@/lib/server/create-mutation-action";

const CreateDelegatedProjectActionInputSchema = v.object({
	// Choosing the public URL, and related entities and resources, are administrator tasks, so the
	// delegated form does not offer them.
	...v.omit(CreateProjectActionInputSchema, ["slug", "relatedEntityIds", "relatedResourceIds"])
		.entries,
	countryReportId: v.pipe(v.string(), v.uuid()),
});

/**
 * Creates a new project as a draft from the projects step of a country report, so a reporter can
 * record a contribution to a project that is not yet in the system. Takes the fields of the admin
 * create form except slug and relations; publishing remains an admin task. Authorized against the
 * country report the caller is editing.
 */
export const createDelegatedProjectAction = createMutationAction({
	schema: CreateDelegatedProjectActionInputSchema,
	requireAuth: true,
	audit: { action: "create", subjectType: "projects" },
	revalidate: countryReportRevalidatePaths,
	async preCheck({ input, ctx }) {
		await assertCan(ctx.user, "update", { type: "country_report", id: input.countryReportId });
		await assertReportEditable(ctx.user, { type: "country_report", id: input.countryReportId });
	},
	postCommit({ result, input, ctx }) {
		return notifyDraftEntityCreated({
			kind: "project",
			documentId: result.subjectId,
			name: input.name,
			user: ctx.user,
			realUser: ctx.realUser,
			locale: ctx.locale,
		});
	},
	async mutate(tx, input) {
		const t = await getExtracted();

		const { documentId } = await createProjectDraft(tx, {
			...input,
			// The slug is generated from the name.
			requestedSlug: null,
			relatedEntityIds: [],
			relatedResourceIds: [],
		});

		return {
			subjectId: documentId,
			auditSummary: { lifecycle: "draft" },
			successMessage: t("Project saved as draft."),
			successData: { id: documentId, name: input.name },
		};
	},
});
