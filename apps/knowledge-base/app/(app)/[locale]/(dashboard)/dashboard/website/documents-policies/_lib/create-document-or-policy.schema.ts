import { DocumentOrPolicyInsertSchema } from "@dariah-eric/database/schema";
import * as v from "valibot";

import { DocumentOrPolicyTargetInputEntries } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/document-or-policy-target.schema";
import { ContentBlockInputSchema } from "@/lib/content-block-input";
import { EntitySlugInputSchema } from "@/lib/entity-slug-input";

export const CreateDocumentOrPolicyActionInputSchema = v.pipe(
	v.object({
		slug: EntitySlugInputSchema,
		...v.pick(DocumentOrPolicyInsertSchema, ["title"]).entries,
		summary: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
		url: v.nullish(v.pipe(v.string(), v.url()), null),
		groupId: v.optional(v.pipe(v.string(), v.uuid())),
		...DocumentOrPolicyTargetInputEntries,
		contentBlocks: v.optional(
			v.array(v.pipe(v.string(), v.parseJson(), ContentBlockInputSchema)),
			[],
		),
	}),
	v.forward(
		v.partialCheck(
			[["kind"], ["documentKey"]],
			(input) => input.kind !== "document" || input.documentKey != null,
			"Please select a document.",
		),
		["documentKey"],
	),
	v.forward(
		v.partialCheck(
			[["kind"], ["linkUrl"]],
			(input) => input.kind !== "link" || input.linkUrl != null,
			"Please enter a link.",
		),
		["linkUrl"],
	),
);
