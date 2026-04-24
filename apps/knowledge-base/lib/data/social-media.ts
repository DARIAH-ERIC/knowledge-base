/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq, ilike, inArray, or } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

export interface SocialMediaOption {
	id: string;
	name: string;
	description: string;
}

interface GetSocialMediaOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
}

export async function getSocialMediaOptions(
	params: GetSocialMediaOptionsParams = {},
): Promise<{ items: Array<SocialMediaOption>; total: number }> {
	const { limit = 20, offset = 0, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(
					ilike(schema.socialMedia.name, `%${query}%`),
					ilike(schema.socialMedia.url, `%${query}%`),
				)
			: undefined;

	const [rows, aggregate] = await Promise.all([
		db
			.select({
				id: schema.socialMedia.id,
				name: schema.socialMedia.name,
				type: schema.socialMediaTypes.type,
				url: schema.socialMedia.url,
			})
			.from(schema.socialMedia)
			.innerJoin(schema.socialMediaTypes, eq(schema.socialMedia.typeId, schema.socialMediaTypes.id))
			.where(where)
			.orderBy(schema.socialMedia.name)
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.socialMedia).where(where),
	]);

	return {
		items: rows.map((row) => {
			return {
				description: `${row.type} · ${row.url}`,
				id: row.id,
				name: row.name,
			};
		}),
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getSocialMediaOptionsByIds(ids: ReadonlyArray<string>) {
	if (ids.length === 0) {
		return [];
	}

	const rows = await db
		.select({
			id: schema.socialMedia.id,
			name: schema.socialMedia.name,
			type: schema.socialMediaTypes.type,
			url: schema.socialMedia.url,
		})
		.from(schema.socialMedia)
		.innerJoin(schema.socialMediaTypes, eq(schema.socialMedia.typeId, schema.socialMediaTypes.id))
		.where(inArray(schema.socialMedia.id, [...ids]));

	const itemById = new Map(
		rows.map((row) => {
			return [
				row.id,
				{
					description: `${row.type} · ${row.url}`,
					id: row.id,
					name: row.name,
				},
			] as const;
		}),
	);

	return ids.flatMap((id) => {
		const item = itemById.get(id);
		return item != null ? [item] : [];
	});
}
