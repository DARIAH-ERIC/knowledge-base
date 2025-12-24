/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

interface GetEventsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getEvents(params: GetEventsParams) {
	const { limit = 10, offset = 0 } = params;

	const [data, total] = await Promise.all([
		db.query.events.findMany({
			where: {
				entity: {
					status: "published",
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
		db.$count(schema.events),
	]);

	return { data, limit, offset, total };
}

//

interface GetEventByIdParams {
	id: schema.Event["id"];
}

export async function getEventById(params: GetEventByIdParams) {
	const { id } = params;

	const data = await db.query.events.findFirst({
		where: {
			id,
			entity: {
				status: "published",
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

export async function getEventBySlug(params: GetEventBySlugParams) {
	const { slug } = params;

	const data = await db.query.events.findFirst({
		where: {
			entity: {
				slug,
				status: "published",
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
