/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import { db as _db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

interface GetEventsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getEvents(params: GetEventsParams, db = _db) {
	const { limit = 10, offset = 0 } = params;

	const [data, rows] = await Promise.all([
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
				title: true,
				summary: true,
				location: true,
				startDate: true,
				endDate: true,
				startTime: true,
				endTime: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
					orderBy: {
						updatedAt: "desc",
					},
				},
				image: {
					columns: {
						key: true,
					},
				},
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

	const total = rows.at(0)?.total ?? 0;

	return { data, limit, offset, total };
}

//

interface GetEventByIdParams {
	id: schema.Event["id"];
}

export async function getEventById(params: GetEventByIdParams, db = _db) {
	const { id } = params;

	const data = await db.query.events.findFirst({
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
			startDate: true,
			endDate: true,
			startTime: true,
			endTime: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
				},
			},
			image: {
				columns: {
					key: true,
				},
			},
		},
	});

	if (data == null) {
		return null;
	}

	return data;
}

//

interface GetEventBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getEventBySlug(params: GetEventBySlugParams, db = _db) {
	const { slug } = params;

	const data = await db.query.events.findFirst({
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
			startDate: true,
			endDate: true,
			startTime: true,
			endTime: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
				},
			},
			image: {
				columns: {
					key: true,
				},
			},
		},
	});

	if (data == null) {
		return null;
	}

	return data;
}
