/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { serializeDateRange } from "@/lib/date-range";
import { flattenEntityVersion } from "@/lib/entity-version";
import { generateImageUrl } from "@/lib/images";
import type { Database, Transaction } from "@/middlewares/db";
import { imageWidth } from "~/config/api.config";

export async function getFeaturedEntities(db: Database | Transaction) {
	const metadata = await db.query.siteMetadata.findFirst({
		columns: {
			featuredItemIds: true,
		},
	});

	const featuredNewsIds = metadata?.featuredItemIds?.news ?? [];
	const featuredEventIds = metadata?.featuredItemIds?.events ?? [];

	const [news, events] = await Promise.all([
		getFeaturedNews(db, featuredNewsIds),
		getFeaturedEvents(db, featuredEventIds),
	]);

	return { data: { news, events } };
}

async function getFeaturedNews(db: Database | Transaction, ids: Array<string>) {
	if (ids.length === 0) {
		return [];
	}

	const items = await db.query.news.findMany({
		where: {
			id: {
				in: ids,
			},
			entityVersion: {
				status: {
					type: "published",
				},
			},
		},
		columns: {
			id: true,
			title: true,
			summary: true,
		},
		with: {
			entityVersion: {
				columns: { updatedAt: true },
				with: {
					entity: {
						columns: { slug: true },
					},
				},
			},
			image: {
				columns: {
					key: true,
					alt: true,
					caption: true,
				},
				with: {
					license: {
						columns: {
							name: true,
							url: true,
						},
					},
				},
			},
		},
	});

	const itemsById = new Map(items.map((item) => [item.id, item]));

	return ids
		.map((id) => itemsById.get(id))
		.filter((item): item is NonNullable<typeof item> => item != null)
		.map((item) => {
			const image = generateImageUrl(item.image, imageWidth.preview);

			return { ...flattenEntityVersion(item), image };
		});
}

async function getFeaturedEvents(db: Database | Transaction, ids: Array<string>) {
	if (ids.length === 0) {
		return [];
	}

	const items = await db.query.events.findMany({
		where: {
			id: {
				in: ids,
			},
			entityVersion: {
				status: {
					type: "published",
				},
			},
		},
		columns: {
			id: true,
			title: true,
			summary: true,
			location: true,
			isFullDay: true,
			duration: true,
		},
		with: {
			entityVersion: {
				columns: { updatedAt: true },
				with: {
					entity: {
						columns: { slug: true },
					},
				},
			},
			image: {
				columns: {
					key: true,
					alt: true,
					caption: true,
				},
				with: {
					license: {
						columns: {
							name: true,
							url: true,
						},
					},
				},
			},
		},
	});

	const itemsById = new Map(items.map((item) => [item.id, item]));

	return ids
		.map((id) => itemsById.get(id))
		.filter((item): item is NonNullable<typeof item> => item != null)
		.map((item) => {
			const image = generateImageUrl(item.image, imageWidth.preview);
			const duration = serializeDateRange(item.duration);

			return { ...flattenEntityVersion(item), image, duration };
		});
}
