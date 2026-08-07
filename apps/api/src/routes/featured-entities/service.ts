/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { serializeDateRange } from "@/lib/date-range";
import { flattenEntityVersion } from "@/lib/entity-version";
import { generateImageUrl, imageAssetColumns, withResolvedCaption } from "@/lib/images";
import type { Database, Transaction } from "@/middlewares/db";
import type { Announcement } from "@/routes/announcements/schemas";
import { imageWidth } from "~/config/api.config";

const entityVersionColumns = {
	columns: { updatedAt: true },
	with: {
		entity: {
			columns: { slug: true },
		},
	},
} as const;

export async function getFeaturedEntities(db: Database | Transaction) {
	const metadata = await db.query.siteMetadata.findFirst({
		columns: {
			featuredItemIds: true,
		},
	});

	const featuredNewsIds = metadata?.featuredItemIds?.news ?? [];
	const featuredEventIds = metadata?.featuredItemIds?.events ?? [];

	const [news, events] = await Promise.all([
		getFeaturedAnnouncements(db, featuredNewsIds),
		getFeaturedEvents(db, featuredEventIds),
	]);

	return { data: { news, events } };
}

async function getFeaturedAnnouncements(db: Database | Transaction, ids: Array<string>) {
	if (ids.length === 0) {
		return [];
	}

	const [news, opportunities, fundingCalls] = await Promise.all([
		db.query.news.findMany({
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
				publicationDate: true,
				imageCaption: true,
				imageCaptionMode: true,
			},
			with: {
				entityVersion: entityVersionColumns,
				image: imageAssetColumns,
			},
		}),
		db.query.opportunities.findMany({
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
				duration: true,
				website: true,
				imageCaption: true,
				imageCaptionMode: true,
			},
			with: {
				entityVersion: entityVersionColumns,
				image: imageAssetColumns,
				source: { columns: { source: true } },
			},
		}),
		db.query.fundingCalls.findMany({
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
				duration: true,
				imageCaption: true,
				imageCaptionMode: true,
			},
			with: {
				entityVersion: entityVersionColumns,
				image: imageAssetColumns,
			},
		}),
	]);

	const announcementsById = new Map<string, Announcement>();

	for (const item of news) {
		announcementsById.set(item.id, {
			type: "news",
			id: item.id,
			title: item.title,
			summary: item.summary,
			image: generateImageUrl(withResolvedCaption(item.image, item), imageWidth.preview),
			entity: item.entityVersion.entity,
			publishedAt: item.publicationDate.toISOString(),
		});
	}

	for (const item of opportunities) {
		announcementsById.set(item.id, {
			type: "opportunities",
			id: item.id,
			title: item.title,
			summary: item.summary,
			image: generateImageUrl(withResolvedCaption(item.image, item), imageWidth.preview),
			entity: item.entityVersion.entity,
			publishedAt: item.duration.start.toISOString(),
			duration: serializeDateRange(item.duration),
			source: item.source.source,
			website: item.website,
		});
	}

	for (const item of fundingCalls) {
		announcementsById.set(item.id, {
			type: "funding_calls",
			id: item.id,
			title: item.title,
			summary: item.summary,
			image: generateImageUrl(withResolvedCaption(item.image, item), imageWidth.preview),
			entity: item.entityVersion.entity,
			publishedAt: item.duration.start.toISOString(),
			duration: serializeDateRange(item.duration),
		});
	}

	return ids.flatMap((id) => {
		const item = announcementsById.get(id);
		return item != null ? [item] : [];
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
			imageCaption: true,
			imageCaptionMode: true,
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
			image: imageAssetColumns,
		},
	});

	const itemsById = new Map(items.map((item) => [item.id, item]));

	return ids
		.map((id) => itemsById.get(id))
		.filter((item): item is NonNullable<typeof item> => item != null)
		.map((item) => {
			const image = generateImageUrl(withResolvedCaption(item.image, item), imageWidth.preview);
			const duration = serializeDateRange(item.duration);

			return { type: "events" as const, ...flattenEntityVersion(item), image, duration };
		});
}
