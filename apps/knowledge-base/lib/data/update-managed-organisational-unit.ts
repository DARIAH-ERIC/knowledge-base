import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { ContentBlockInput } from "@/lib/content-block-input";
import { ensureDraftVersion, touchVersion } from "@/lib/data/entity-lifecycle";
import { replaceEntityVersionFieldContentBlocks } from "@/lib/data/entity-version-fields";
import { organisationalUnitsLifecycleAdapter } from "@/lib/data/organisational-units.lifecycle-adapter";
import type { Transaction } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";

interface ManagedOrganisationalUnitUpdate {
	documentId: string;
	name?: string;
	acronym: string | null;
	summary: string | null;
	sshocMarketplaceActorId: number | null;
	ror?: string | null;
	imageKey: string | null;
	descriptionContentBlocks: Array<ContentBlockInput>;
	socialMediaIds: Array<string>;
}

/** Saves the fields exposed on delegated non-admin forms. Publishing remains admin-only. */
export async function updateManagedOrganisationalUnitDraft(
	tx: Transaction,
	input: ManagedOrganisationalUnitUpdate,
): Promise<void> {
	const draftVersionId = await ensureDraftVersion(
		tx,
		input.documentId,
		organisationalUnitsLifecycleAdapter,
	);

	let imageId: string | null = null;
	if (input.imageKey != null) {
		const asset = await tx.query.assets.findFirst({
			where: { key: input.imageKey },
			columns: { id: true },
		});
		assert(asset);
		imageId = asset.id;
	}

	await tx
		.update(schema.organisationalUnits)
		.set({
			acronym: input.acronym,
			imageId,
			name: input.name,
			ror: input.ror,
			sshocMarketplaceActorId: input.sshocMarketplaceActorId,
			summary: input.summary,
		})
		.where(eq(schema.organisationalUnits.id, draftVersionId));

	await replaceEntityVersionFieldContentBlocks(
		tx,
		draftVersionId,
		"description",
		input.descriptionContentBlocks,
	);

	const existingSocialMedia = await tx.query.organisationalUnitsToSocialMedia.findMany({
		where: { organisationalUnitId: draftVersionId },
		columns: { id: true, socialMediaId: true },
	});
	const existingIds = new Set(existingSocialMedia.map((row) => row.socialMediaId));
	const submittedIds = new Set(input.socialMediaIds);
	const idsToDelete = existingSocialMedia
		.filter((row) => !submittedIds.has(row.socialMediaId))
		.map((row) => row.id);
	if (idsToDelete.length > 0) {
		await tx
			.delete(schema.organisationalUnitsToSocialMedia)
			.where(inArray(schema.organisationalUnitsToSocialMedia.id, idsToDelete));
	}

	const idsToInsert = input.socialMediaIds.filter((id) => !existingIds.has(id));
	if (idsToInsert.length > 0) {
		await tx.insert(schema.organisationalUnitsToSocialMedia).values(
			idsToInsert.map((socialMediaId) => {
				return {
					organisationalUnitId: draftVersionId,
					socialMediaId,
				};
			}),
		);
	}

	await touchVersion(tx, draftVersionId);
}
