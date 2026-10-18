"use server";

import type { EditablePerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/person-relations-section";
import { assertCanEditPerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_lib/authorize-delegated-person";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getPersonSocialMedia } from "@/lib/data/person-social-media";
import {
	selectedImageColumns,
	selectedImageWith,
	toSelectedImage,
} from "@/lib/data/selected-image";
import { db } from "@/lib/db";

/**
 * Loads the current (draft-or-published) person so the delegated edit sheet can prefill the full
 * person form. Only reads: the draft is created when the edit is saved. Authorized the same way as
 * the edit itself. Returns `null` when the person cannot be resolved.
 */
export async function getDelegatedPersonAction(documentId: string): Promise<EditablePerson | null> {
	const { user } = await assertAuthenticated();
	await assertCanEditPerson(user, documentId);

	const lifecycle = await db.query.documentLifecycle.findFirst({
		where: { documentId },
		columns: { draftId: true, publishedId: true },
	});

	const versionId = lifecycle?.draftId ?? lifecycle?.publishedId;
	if (versionId == null) {
		return null;
	}

	const person = await db.query.persons.findFirst({
		where: { id: versionId },
		columns: {
			email: true,
			name: true,
			orcid: true,
			sortName: true,
			imageCaption: true,
			imageCaptionMode: true,
		},
		with: {
			entityVersion: {
				columns: {},
				with: { entity: { columns: { slug: true } } },
			},
			image: {
				columns: selectedImageColumns,
				with: selectedImageWith,
			},
		},
	});

	if (person == null) {
		return null;
	}

	const [biographyContentBlocks, socialMedia] = await Promise.all([
		getEntityContentBlocks(versionId, "biography"),
		getPersonSocialMedia(db, versionId),
	]);

	return {
		...person,
		biographyContentBlocks,
		image: person.image != null ? toSelectedImage(person.image, imageGridOptions) : null,
		isPublished: lifecycle?.publishedId != null,
		socialMedia,
	};
}
