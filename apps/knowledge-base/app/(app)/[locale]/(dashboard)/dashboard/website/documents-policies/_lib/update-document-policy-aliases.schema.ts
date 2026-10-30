import type { DocumentPolicyAliasKey } from "@dariah-eric/database/schema";
import * as v from "valibot";

const AliasTargetSchema = v.nullish(v.pipe(v.string(), v.uuid()), null);

/** Entity id of the documents-policies entry each alias points to; `null` unsets the alias. */
export const UpdateDocumentPolicyAliasesActionInputSchema = v.object({
	statutes: AliasTargetSchema,
	"internal-rules-of-procedure": AliasTargetSchema,
} satisfies Record<DocumentPolicyAliasKey, typeof AliasTargetSchema>);
