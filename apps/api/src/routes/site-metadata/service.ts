/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

export async function getSiteMetadata(db: Database | Transaction) {
	const item = await db.query.siteMetadata.findFirst({
		columns: {
			title: true,
			description: true,
			ogTitle: true,
			ogDescription: true,
		},
		with: {
			ogImage: {
				columns: {
					key: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const ogImage =
		item.ogImage != null
			? images.generateSignedImageUrl({
					key: item.ogImage.key,
					options: { width: imageWidth.featured },
				})
			: null;

	return { ...item, ogImage };
}
