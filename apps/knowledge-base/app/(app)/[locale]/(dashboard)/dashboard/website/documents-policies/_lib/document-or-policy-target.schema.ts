import * as v from "valibot";

/** What a document or policy points to: an uploaded file, or an external page. */
export const documentOrPolicyKinds = ["document", "link"] as const;

export type DocumentOrPolicyKind = (typeof documentOrPolicyKinds)[number];

/**
 * Form entries shared by every create/update schema. Both target fields are optional here; each
 * schema requires the one that matches `kind`.
 */
export const DocumentOrPolicyTargetInputEntries = {
	kind: v.optional(v.picklist(documentOrPolicyKinds), "document"),
	documentKey: v.nullish(v.pipe(v.string(), v.nonEmpty()), null),
	linkUrl: v.nullish(v.pipe(v.string(), v.url()), null),
};
