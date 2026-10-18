"use server";

import type { EditableUnit } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/reverse-unit-relations-section";
import { assertCanEditCountryInstitution } from "@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/authorize-country-institution-relation";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import {
	selectedImageColumns,
	selectedImageWith,
	toSelectedImage,
} from "@/lib/data/selected-image";
import { getSocialMediaOptionsByIds } from "@/lib/data/social-media";
import { db } from "@/lib/db";

/**
 * Loads the current (draft-or-published) institution so the delegated edit sheet can prefill the
 * full institution form. Only reads: the draft is created when the edit is saved. Authorized the
 * same way as the edit itself (institution located in a managed country). Returns `null` when the
 * institution cannot be resolved.
 */
export async function getDelegatedInstitutionAction(
	documentId: string,
): Promise<EditableUnit | null> {
	const { user } = await assertAuthenticated();
	await assertCanEditCountryInstitution(user, documentId);

	const lifecycle = await db.query.documentLifecycle.findFirst({
		where: { documentId },
		columns: { draftId: true, publishedId: true },
	});

	const versionId = lifecycle?.draftId ?? lifecycle?.publishedId;
	if (versionId == null) {
		return null;
	}

	const unit = await db.query.organisationalUnits.findFirst({
		where: { id: versionId },
		columns: {
			acronym: true,
			name: true,
			ror: true,
			sshocMarketplaceActorId: true,
			summary: true,
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

	if (unit == null) {
		return null;
	}

	const [descriptionContentBlocks, socialMediaRows] = await Promise.all([
		getEntityContentBlocks(versionId, "description"),
		db.query.organisationalUnitsToSocialMedia.findMany({
			where: { organisationalUnitId: versionId },
			orderBy: { position: "asc" },
			columns: { socialMediaId: true },
		}),
	]);
	const socialMediaIds = socialMediaRows.map((row) => row.socialMediaId);

	return {
		...unit,
		descriptionContentBlocks,
		image: unit.image != null ? toSelectedImage(unit.image, imageGridOptions) : null,
		isPublished: lifecycle?.publishedId != null,
		socialMediaIds,
		selectedSocialMediaItems: await getSocialMediaOptionsByIds(socialMediaIds),
	};
}
