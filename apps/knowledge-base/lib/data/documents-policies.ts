/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import { imageGridOptions } from "@/config/assets.config";
import { images } from "@/lib/images";

interface GetDocumentsPoliciesParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getDocumentsPolicies(params: GetDocumentsPoliciesParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.documentsPolicies.findMany({
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
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	return { data: items, limit, offset, total };
}

interface GetDocumentOrPolicyByIdParams {
	id: schema.DocumentOrPolicy["id"];
}

export async function getDocumentOrPolicyById(params: GetDocumentOrPolicyByIdParams) {
	const { id } = params;

	const item = await db.query.documentsPolicies.findFirst({
		where: {
			id,
		},
		with: {
			entity: {
				columns: {
					slug: true,
				},
			},
			document: {
				columns: {
					key: true,
					label: true,
				},
			},
		},
	});

	if (item == null) {
		return null;
	}

	const document = images.generateSignedImageUrl({
		key: item.document.key,
		options: imageGridOptions,
	});

	const data = { ...item, document: { ...item.document, url: document.url } };

	return data;
}

export type DocumentsPoliciesWithEntities = Awaited<ReturnType<typeof getDocumentsPolicies>>;
export type DocumentOrPolicyWithEntities = Awaited<ReturnType<typeof getDocumentOrPolicyById>>;
