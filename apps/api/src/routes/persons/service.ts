/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@/services/db/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import { getPersonPositions } from "@/lib/persons";
import type { Database, Transaction } from "@/middlewares/db";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

interface GetPersonsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getPersons(db: Database | Transaction, params: GetPersonsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.persons.findMany({
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			columns: {
				id: true,
				name: true,
				sortName: true,
				email: true,
				orcid: true,
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
			.from(schema.persons)
			.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;
	const positions = await getPersonPositions(
		db,
		items.map((item) => {
			return item.id;
		}),
	);

	const data = items.map((item) => {
		const image = images.generateSignedImageUrl({
			key: item.image.key,
			options: { width: imageWidth.avatar },
		});

		return {
			...item,
			position: positions.get(item.id) ?? null,
			image,
			publishedAt: item.entity.updatedAt.toISOString(),
		};
	});

	return { data, limit, offset, total };
}

//

interface GetPersonByIdParams {
	id: schema.Person["id"];
}

export async function getPersonById(db: Database | Transaction, params: GetPersonByIdParams) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.persons.findFirst({
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
				name: true,
				sortName: true,
				email: true,
				orcid: true,
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

	const positions = await getPersonPositions(db, [item.id]);

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	return {
		...item,
		position: positions.get(item.id) ?? null,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}

//

interface GetPersonSlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getPersonSlugs(db: Database | Transaction, params: GetPersonSlugsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.persons.findMany({
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
			},
			orderBy(t, { desc, sql }) {
				return [desc(sql`"entity"."r" ->> 'updatedAt'`)];
			},
			limit,
			offset,
		}),
		db
			.select({ total: count() })
			.from(schema.persons)
			.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items;

	return { data, limit, offset, total };
}

//

interface GetPersonBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getPersonBySlug(db: Database | Transaction, params: GetPersonBySlugParams) {
	const { slug } = params;

	const item = await db.query.persons.findFirst({
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
			name: true,
			sortName: true,
			email: true,
			orcid: true,
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

	const positions = await getPersonPositions(db, [item.id]);

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageWidth.featured },
	});

	const fields = await getContentBlocks(db, item.id);

	return {
		...item,
		position: positions.get(item.id) ?? null,
		image,
		publishedAt: item.entity.updatedAt.toISOString(),
		...fields,
	};
}
