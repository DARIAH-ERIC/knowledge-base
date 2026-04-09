/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, asc, count, desc, eq, type SQL, sql } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetEventsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	/** ISO date string (YYYY-MM-DD). Only events whose duration overlaps on or after this date are returned. */
	from?: string;
	/** ISO date string (YYYY-MM-DD). Only events whose duration overlaps on or before this date are returned. */
	until?: string;
}

export async function getEvents(db: Database | Transaction, params: GetEventsParams) {
	const { limit = 10, offset = 0, from, until } = params;

	const lower = sql`LOWER(${schema.events.duration})`;
	const upper = sql`UPPER(${schema.events.duration})`;

	// Overlap condition: event overlaps [from, until] when
	//   lower < start-of-next-day(until)  (event starts before the window end day is over)
	//   AND (upper IS NULL OR upper >= from)  (event ends on or after the window start, or is open-ended)
	//
	// `until` is treated as inclusive of the full day: an event starting on `until` at any time is included.
	// To achieve this we use `lower < until + 1 day` rather than `lower <= until` (which would only match midnight).
	const fromFilter: SQL | undefined =
		from != null
			? sql`
					(
						${upper} IS NULL
						OR ${upper} >= ${new Date(from)}
					)
				`
			: undefined;
	const untilFilter: SQL | undefined =
		until != null
			? (() => {
					const exclusive = new Date(until);
					exclusive.setUTCDate(exclusive.getUTCDate() + 1);
					return sql`${lower} < ${exclusive}`;
				})()
			: undefined;

	const rangeFilter = and(fromFilter, untilFilter);

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
			.where(and(rangeFilter, eq(schema.entityStatus.type, "published")))
			.orderBy(desc(lower))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(and(rangeFilter, eq(schema.entityStatus.type, "published"))),
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

interface GetAdjacentEventsParams {
	id: schema.Event["id"];
	startDate: Date;
}

async function getAdjacentEvents(db: Database | Transaction, params: GetAdjacentEventsParams) {
	const { id, startDate } = params;

	const lower = sql`LOWER(${schema.events.duration})`;

	// Use a (lower, id) tuple cursor so that events sharing the same start timestamp
	// are ordered stably and each correctly identifies the other as prev/next.
	const cursor = sql`
		(
			${lower},
			${schema.events.id}::TEXT
		)
	`;
	const currentCursor = sql`
		(
			${startDate}::TIMESTAMPTZ,
			${id}::TEXT
		)
	`;

	const adjacentColumns = {
		id: schema.events.id,
		entity: {
			slug: schema.entities.slug,
		},
	} as const;

	const [prevRows, nextRows] = await Promise.all([
		db
			.select(adjacentColumns)
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(and(sql`${cursor} < ${currentCursor}`, eq(schema.entityStatus.type, "published")))
			.orderBy(desc(lower), desc(schema.events.id))
			.limit(1),
		db
			.select(adjacentColumns)
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(and(sql`${cursor} > ${currentCursor}`, eq(schema.entityStatus.type, "published")))
			.orderBy(asc(lower), asc(schema.events.id))
			.limit(1),
	]);

	return {
		prev: prevRows.at(0) ?? null,
		next: nextRows.at(0) ?? null,
	};
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

	const links = await getAdjacentEvents(db, { id, startDate: item.duration.start });

	return {
		...item,
		duration,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		links,
	};
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

	const [fields, links] = await Promise.all([
		getContentBlocks(db, item.id),
		getAdjacentEvents(db, { id: item.id, startDate: item.duration.start }),
	]);

	return {
		...item,
		duration,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
		links,
	};
}
