/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database/sql";
import * as schema from "@dariah-eric/database/schema";

import { getContentBlocks } from "@/lib/content-blocks";
import type { Database, Transaction } from "@/middlewares/db";

interface GetDocumentsPoliciesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getDocumentsPolicies(
	db: Database | Transaction,
	params: GetDocumentsPoliciesParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.documentsPolicies.findMany({
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
				url: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				group: {
					columns: {
						id: true,
						label: true,
						position: true,
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
			.from(schema.documentsPolicies)
			.innerJoin(schema.entities, eq(schema.documentsPolicies.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return { ...item, publishedAt: item.entity.updatedAt.toISOString() };
	});

	return { data, limit, offset, total };
}

//

interface GetDocumentOrPolicyByIdParams {
	id: schema.DocumentOrPolicy["id"];
}

export async function getDocumentOrPolicyById(
	db: Database | Transaction,
	params: GetDocumentOrPolicyByIdParams,
) {
	const { id } = params;

	const [item, fields] = await Promise.all([
		db.query.documentsPolicies.findFirst({
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
				url: true,
			},
			with: {
				entity: {
					columns: {
						slug: true,
						updatedAt: true,
					},
				},
				group: {
					columns: {
						id: true,
						label: true,
						position: true,
					},
				},
			},
		}),
		getContentBlocks(db, id),
	]);

	if (item == null) {
		return null;
	}

	return { ...item, publishedAt: item.entity.updatedAt.toISOString(), ...fields };
}

//

interface GetDocumentOrPolicySlugsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getDocumentOrPolicySlugs(
	db: Database | Transaction,
	params: GetDocumentOrPolicySlugsParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.documentsPolicies.findMany({
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
			.from(schema.documentsPolicies)
			.innerJoin(schema.entities, eq(schema.documentsPolicies.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	return { data: items, limit, offset, total };
}

//

interface GetDocumentOrPolicyDocumentParams {
	id: schema.DocumentOrPolicy["id"];
}

export async function getDocumentOrPolicyDocument(
	db: Database | Transaction,
	params: GetDocumentOrPolicyDocumentParams,
) {
	const { id } = params;

	const item = await db.query.documentsPolicies.findFirst({
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
		},
		with: {
			document: {
				columns: {
					key: true,
				},
			},
		},
	});

	return item ?? null;
}

//

interface GetDocumentOrPolicyBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getDocumentOrPolicyBySlug(
	db: Database | Transaction,
	params: GetDocumentOrPolicyBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.documentsPolicies.findFirst({
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
			url: true,
		},
		with: {
			entity: {
				columns: {
					slug: true,
					updatedAt: true,
				},
			},
			group: {
				columns: {
					id: true,
					label: true,
					position: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const fields = await getContentBlocks(db, item.id);

	return { ...item, publishedAt: item.entity.updatedAt.toISOString(), ...fields };
}
