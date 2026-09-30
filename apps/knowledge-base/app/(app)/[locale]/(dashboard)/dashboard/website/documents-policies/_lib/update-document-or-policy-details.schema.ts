import {
	DocumentOrPolicySelectSchema,
	DocumentOrPolicyUpdateSchema,
} from "@dariah-eric/database/schema";
import * as v from "valibot";

import { DocumentOrPolicyTargetInputEntries } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/document-or-policy-target.schema";

export const UpdateDocumentOrPolicyDetailsActionInputSchema = v.pipe(
	v.object({
		...v.pick(DocumentOrPolicySelectSchema, ["id"]).entries,
		...v.pick(DocumentOrPolicyUpdateSchema, ["title"]).entries,
		summary: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
		url: v.nullish(v.pipe(v.string(), v.url()), null),
		groupId: v.optional(v.pipe(v.string(), v.uuid())),
		...DocumentOrPolicyTargetInputEntries,
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
