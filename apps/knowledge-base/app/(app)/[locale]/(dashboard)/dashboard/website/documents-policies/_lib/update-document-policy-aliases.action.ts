"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { UpdateDocumentPolicyAliasesActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/update-document-policy-aliases.schema";
import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { and, eq, inArray, sql } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateDocumentPolicyAliasesAction = createMutationAction({
	schema: UpdateDocumentPolicyAliasesActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "documents_policies" },
	revalidate: "/[locale]/dashboard/website/documents-policies",

	async preCheck({ input }) {
		const t = await getExtracted();

		const entityIds = [
			...new Set(
				schema.documentPolicyAliasKeysEnum.map((key) => input[key]).filter((id) => id != null),
			),
		];

		if (entityIds.length === 0) {
			return undefined;
		}

		const rows = await db
			.selectDistinct({ id: schema.entityVersions.entityId })
			.from(schema.documentsPolicies)
			.innerJoin(schema.entityVersions, eq(schema.documentsPolicies.id, schema.entityVersions.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(
				and(publishedEntityVersionWhere(), inArray(schema.entityVersions.entityId, entityIds)),
			);

		if (rows.length !== entityIds.length) {
			return createActionStateError({
				message: t("Stable links must point to published documents or policies."),
			});
		}

		return undefined;
	},

	async mutate(tx, input) {
		const t = await getExtracted();

		for (const key of schema.documentPolicyAliasKeysEnum) {
			const entityId = input[key];

			if (entityId == null) {
				await tx
					.delete(schema.documentPolicyAliases)
					.where(eq(schema.documentPolicyAliases.key, key));
				continue;
			}

			await tx
				.insert(schema.documentPolicyAliases)
				.values({ key, entityId })
				.onConflictDoUpdate({
					target: schema.documentPolicyAliases.key,
					set: { entityId, updatedAt: sql`NOW()` },
				});
		}

		return { subjectId: "aliases", successMessage: t("Stable links saved.") };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["document-aliases"] });
	},
});
