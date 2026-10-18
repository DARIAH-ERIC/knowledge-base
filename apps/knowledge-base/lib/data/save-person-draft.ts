import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { ContentBlockInput } from "@/lib/content-block-input";
import {
	type CreatedDocument,
	createDraftDocumentWithSlug,
	ensureDraftVersion,
	touchVersion,
	updateDraftDocumentSlug,
} from "@/lib/data/entity-lifecycle";
import { replaceEntityVersionFieldContentBlocks } from "@/lib/data/entity-version-fields";
import { syncPersonSocialMedia } from "@/lib/data/person-social-media";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import type { Transaction } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import type { PersonSocialMediaEntryInput } from "@/lib/person-social-media-input";

interface PersonDraftInput extends Pick<
	typeof schema.persons.$inferInsert,
	"email" | "imageCaption" | "imageCaptionMode" | "name" | "orcid" | "sortName"
> {
	requestedSlug: string | null;
	imageKey?: string | null;
	socialMedia: Array<PersonSocialMediaEntryInput>;
	biographyContentBlocks: Array<ContentBlockInput>;
}

/**
 * Creates a new person as a draft document. Shared by the admin create form, which may publish it
 * right away, and the delegated dashboards, where publishing remains an admin task.
 */
export async function createPersonDraft(
	tx: Transaction,
	input: PersonDraftInput,
): Promise<CreatedDocument> {
	const type = await tx.query.entityTypes.findFirst({
		where: { type: "persons" },
		columns: { id: true },
	});
	assert(type);

	const created = await createDraftDocumentWithSlug(tx, type.id, {
		requestedSlug: input.requestedSlug,
		title: input.name,
	});

	const asset =
		input.imageKey != null
			? await tx.query.assets.findFirst({
					where: { key: input.imageKey },
					columns: { id: true },
				})
			: null;
	assert(input.imageKey == null || asset != null);

	await tx.insert(schema.persons).values({
		id: created.versionId,
		email: input.email,
		imageId: asset?.id ?? null,
		imageCaption: input.imageCaption,
		imageCaptionMode: input.imageCaptionMode,
		name: input.name,
		orcid: input.orcid,
		sortName: input.sortName,
	});

	await syncPersonSocialMedia(tx, created.versionId, input.socialMedia);

	await replaceEntityVersionFieldContentBlocks(
		tx,
		created.versionId,
		"biography",
		input.biographyContentBlocks,
	);

	return created;
}

/**
 * Saves a person's fields to the draft version of their document, creating that draft when only a
 * published version exists. Shared by the admin edit form, which may publish afterwards, and the
 * delegated dashboards, where publishing remains an admin task.
 */
export async function updatePersonDraft(
	tx: Transaction,
	documentId: string,
	// Fields left `undefined` keep their current value.
	input: Omit<PersonDraftInput, "name" | "sortName"> & { name?: string; sortName?: string },
): Promise<void> {
	const draftVersionId = await ensureDraftVersion(tx, documentId, personsLifecycleAdapter);

	// The form only offers the slug while the document is draft-only; `updateDraftDocumentSlug`
	// re-checks that server-side, so a forged submission cannot rename a published page.
	if (input.requestedSlug != null) {
		await updateDraftDocumentSlug(tx, documentId, input.requestedSlug);
	}

	const asset =
		input.imageKey != null
			? await tx.query.assets.findFirst({
					where: { key: input.imageKey },
					columns: { id: true },
				})
			: null;
	assert(input.imageKey == null || asset != null);

	await tx
		.update(schema.persons)
		.set({
			email: input.email,
			imageId: asset?.id ?? null,
			imageCaption: input.imageCaption,
			imageCaptionMode: input.imageCaptionMode,
			name: input.name,
			orcid: input.orcid,
			sortName: input.sortName,
		})
		.where(eq(schema.persons.id, draftVersionId));

	await syncPersonSocialMedia(tx, draftVersionId, input.socialMedia);

	await replaceEntityVersionFieldContentBlocks(
		tx,
		draftVersionId,
		"biography",
		input.biographyContentBlocks,
	);

	await touchVersion(tx, draftVersionId);
}
