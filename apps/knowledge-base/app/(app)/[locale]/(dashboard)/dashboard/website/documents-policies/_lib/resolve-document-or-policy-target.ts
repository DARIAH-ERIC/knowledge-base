import { assert } from "@acdh-oeaw/lib";
import type * as schema from "@dariah-eric/database/schema";

import type { DocumentOrPolicyKind } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_lib/document-or-policy-target.schema";
import type { Transaction } from "@/lib/db";

interface DocumentOrPolicyTargetInput {
	kind: DocumentOrPolicyKind;
	documentKey: string | null;
	linkUrl: string | null;
	url: string | null;
}

/**
 * Maps the form's target fields to the columns of a `documents_policies` row. Exactly one of
 * `documentId` and `linkUrl` is set, matching the table's check constraint. The supplementary `url`
 * only applies to uploaded documents; an external link already is the url.
 */
export async function resolveDocumentOrPolicyTarget(
	tx: Transaction,
	input: DocumentOrPolicyTargetInput,
): Promise<Pick<schema.DocumentOrPolicyInput, "documentId" | "linkUrl" | "url">> {
	if (input.kind === "link") {
		assert(input.linkUrl != null);

		return { documentId: null, linkUrl: input.linkUrl, url: null };
	}

	assert(input.documentKey != null);

	const asset = await tx.query.assets.findFirst({
		where: { key: input.documentKey },
		columns: { id: true },
	});

	assert(asset);

	return {
		documentId: asset.id,
		linkUrl: null,
		url: input.url != null && input.url.length > 0 ? input.url : null,
	};
}
