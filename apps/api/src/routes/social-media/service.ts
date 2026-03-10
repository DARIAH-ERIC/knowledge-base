/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";

interface GetSocialMediaListParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getSocialMediaList(
	db: Database | Transaction,
	params: GetSocialMediaListParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.socialMedia.findMany({
			columns: {
				id: true,
				name: true,
				url: true,
				duration: true,
			},
			with: {
				type: {
					columns: {
						id: true,
						type: true,
					},
				},
			},
			limit,
			offset,
		}),
		db.select({ total: count() }).from(schema.socialMedia),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			...item,
			duration: {
				start: item.duration.start.toISOString(),
				end: item.duration.end?.toISOString() ?? null,
			},
		};
	});

	return { data, limit, offset, total };
}

interface GetSocialMediaByIdParams {
	id: schema.SocialMedia["id"];
}

export async function getSocialMediaById(
	db: Database | Transaction,
	params: GetSocialMediaByIdParams,
) {
	const { id } = params;

	const item = await db.query.socialMedia.findFirst({
		where: { id },
		columns: {
			id: true,
			name: true,
			url: true,
			duration: true,
		},
		with: {
			type: {
				columns: {
					id: true,
					type: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	return {
		...item,
		duration: {
			start: item.duration.start.toISOString(),
			end: item.duration.end?.toISOString() ?? null,
		},
	};
}
