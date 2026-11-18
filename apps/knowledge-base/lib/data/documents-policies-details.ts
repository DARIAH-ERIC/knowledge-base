import * as schema from "@dariah-eric/database/schema";

import { getNextDocumentPolicyPosition } from "@/lib/data/documents-policies-order";
import {
	getDocumentIdForVersion,
	getDocumentLifecycleState,
	touchVersion,
} from "@/lib/data/entity-lifecycle";
import type { Transaction } from "@/lib/db";
import { inArray } from "@/lib/db/sql";

interface UpdateDocumentPolicyDetailsParams {
	/** Any version id of the entry, as listed in the dashboard. */
	versionId: string;
	values: Partial<Pick<schema.DocumentOrPolicyInput, "title" | "summary">> &
		Pick<schema.DocumentOrPolicyInput, "documentId" | "linkUrl" | "url"> & {
			groupId: string | null;
		};
}

interface UpdateDocumentPolicyDetailsResult {
	documentId: string;
	/** True when the published version changed, so the website needs to be told. */
	isPublishedChange: boolean;
}

/**
 * The quick edit in the documents and policies list edits the entry as the list shows it.
 *
 * - With unpublished draft changes, the list shows the draft and labels it "Draft": only the draft is
 *   changed, and it stays marked as changed.
 * - Otherwise the list shows what's live: the published version is changed, and so is its synced
 *   draft clone when one exists, so the clone cannot later publish the old values back. Both keep
 *   the same `updated_at`, so the entry is still listed as "Published".
 */
export async function updateDocumentPolicyDetails(
	tx: Transaction,
	params: UpdateDocumentPolicyDetailsParams,
): Promise<UpdateDocumentPolicyDetailsResult> {
	const { versionId, values } = params;

	const documentId = await getDocumentIdForVersion(tx, versionId);
	const { draftId, publishedId, hasDraftChanges } = await getDocumentLifecycleState(tx, documentId);

	const targetIds = (hasDraftChanges ? [draftId] : [publishedId, draftId]).filter(
		(id): id is string => id != null,
	);
	const [primaryId] = targetIds;

	if (primaryId == null) {
		throw new Error(`Document "${documentId}" has no versions.`);
	}

	const current = await tx.query.documentsPolicies.findFirst({
		where: { id: primaryId },
		columns: { groupId: true },
	});

	const position =
		current != null && current.groupId !== values.groupId
			? await getNextDocumentPolicyPosition(tx, values.groupId)
			: undefined;

	await tx
		.update(schema.documentsPolicies)
		.set({ ...values, ...(position !== undefined ? { position } : {}) })
		.where(inArray(schema.documentsPolicies.id, targetIds));

	const updatedAt = new Date();
	for (const id of targetIds) {
		await touchVersion(tx, id, updatedAt);
	}

	return { documentId, isPublishedChange: !hasDraftChanges && publishedId != null };
}
