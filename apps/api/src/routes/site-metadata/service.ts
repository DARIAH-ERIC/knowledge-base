/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { generateImageUrl, imageAssetColumns } from "@/lib/images";
import { mapSocialMedia, socialMediaByPosition } from "@/lib/social-media";
import type { Database, Transaction } from "@/middlewares/db";
import { imageWidth } from "~/config/api.config";

const dariahEuSlug = "dariah-eu";

/**
 * DARIAH-EU's own contact details, which the site metadata carries because the ERIC has no entity
 * page and no endpoint of its own. Reads the published version only, and resolves to `null` while
 * the ERIC is draft-only.
 */
function getEricContactDetails(db: Database | Transaction) {
	return db.query.organisationalUnits.findFirst({
		where: {
			entityVersion: {
				status: {
					type: "published",
				},
				entity: {
					slug: dariahEuSlug,
				},
			},
			type: {
				type: "eric",
			},
		},
		columns: {
			email: true,
		},
		with: {
			socialMedia: {
				...socialMediaByPosition,
				columns: {
					id: true,
					name: true,
					url: true,
					duration: true,
				},
				with: {
					type: {
						columns: {
							type: true,
						},
					},
				},
			},
		},
	});
}

export async function getSiteMetadata(db: Database | Transaction) {
	const [item, eric] = await Promise.all([
		db.query.siteMetadata.findFirst({
			columns: {
				title: true,
				description: true,
				ogTitle: true,
				ogDescription: true,
			},
			with: {
				ogImage: imageAssetColumns,
			},
		}),
		getEricContactDetails(db),
	]);

	if (item == null) {
		return null;
	}

	const ogImage = generateImageUrl(item.ogImage, imageWidth.featured);

	return {
		...item,
		ogImage,
		email: eric?.email ?? null,
		socialMedia: eric != null ? mapSocialMedia(eric.socialMedia) : [],
	};
}
