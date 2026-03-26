/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, count, desc, eq, type SQL, sql } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import type { Database, Transaction } from "@/middlewares/db";
import type { EventDurationFilter } from "@/routes/events/schemas";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetEventsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	/** @default undefined */
	filter?: EventDurationFilter;
}

export async function getEvents(db: Database | Transaction, params: GetEventsParams) {
	const { limit = 10, offset = 0, filter } = params;

	const now = new Date();
	const lower = sql`LOWER(${schema.events.duration})`;
	const upper = sql`UPPER(${schema.events.duration})`;
	let timeFilter: SQL | undefined;
	switch (filter) {
		case "upcoming": {
			timeFilter = sql`${lower} > ${now}`;
			break;
		}
		case "ongoing": {
			timeFilter = and(
				sql`${lower} <= ${now}`,
				sql`
					(
						${upper} IS NULL
						OR ${upper} > ${now}
					)
				`,
			);
			break;
		}
		case "past": {
			timeFilter = and(sql`${upper} IS NOT NULL`, sql`${upper} <= ${now}`);
			break;
		}
		case undefined: {
			timeFilter = undefined;
		}
	}

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.events.id,
				title: schema.events.title,
				summary: schema.events.summary,
				location: schema.events.location,
				duration: schema.events.duration,
				isFullDay: schema.events.isFullDay,
				entity: {
					slug: schema.entities.slug,
					updatedAt: schema.entities.updatedAt,
				},
				image: {
					key: schema.assets.key,
				},
			})
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.leftJoin(schema.assets, eq(schema.assets.id, schema.events.imageId))
			.where(and(timeFilter, eq(schema.entityStatus.type, "published")))
			.orderBy(desc(lower))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(and(timeFilter, eq(schema.entityStatus.type, "published"))),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = item.image
			? images.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.preview },
				})
			: null;

		const duration = {
			start: item.duration.start.toISOString(),
			end: item.duration.end?.toISOString(),
		};

		return { ...item, duration, image, publishedAt: item.entity.updatedAt.toISOString() };
	});

	return { data, limit, offset, total };
}

//

interface GetEventByIdParams {
	id: schema.Event["id"];
}

export async function getEventById(db: Database | Transaction, params: GetEventByIdParams) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.events.findFirst({
			where: {
				id,
				entity: {
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
				duration: true,
				isFullDay: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
		}),
		getContentBlocks(db, id),
	]);

	if (item == null) {
		return null;
	}

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const duration = {
		start: item.duration.start.toISOString(),
		end: item.duration.end?.toISOString(),
	};

	return { ...item, duration, image, publishedAt: item.entity.updatedAt.toISOString(), ...fields };
}

//

interface GetEventSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getEventSlugs(db: Database | Transaction, params: GetEventSlugsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.events.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetEventBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getEventBySlug(db: Database | Transaction, params: GetEventBySlugParams) {
	const { slug } = params;

	const item = await db.query.events.findFirst({
		where: {
			entity: {
				slug,
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
			duration: true,
			isFullDay: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
					updatedAt: true,
				},
			},
			image: {
				columns: {
					key: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const duration = {
		start: item.duration.start.toISOString(),
		end: item.duration.end?.toISOString(),
	};

	const fields = await getContentBlocks(db, item.id);

	return { ...item, duration, image, publishedAt: item.entity.updatedAt.toISOString(), ...fields };
}
