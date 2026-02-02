/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { client } from "@dariah-eric/images/client";

import type { Database, Transaction } from "@/middlewares/db";
import { imageWidth } from "~/config/api.config";

interface GetMembersAndPartnersParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getMembersAndPartners(
	db: Database | Transaction,
	params: GetMembersAndPartnersParams,
) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.membersAndPartners.findMany({
			columns: {
				id: true,
				metadata: true,
				name: true,
				summary: true,
				status: true,
				type: true,
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
			.from(schema.membersAndPartners)
			.innerJoin(schema.entities, eq(schema.membersAndPartners.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(eq(schema.entityStatus.type, "published")),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image =
			item.image != null
				? client.urls.generateSignedImageUrl({
						key: item.image.key,
						options: { width: imageWidth.preview },
					})
				: null;

		return { ...item, image };
	});

	return { data, limit, offset, total };
}

//

interface GetMemberOrPartnerByIdParams {
	id: schema.OrganisationalUnit["id"];
}

export async function getMemberOrPartnerById(
	db: Database | Transaction,
	params: GetMemberOrPartnerByIdParams,
) {
	const { id } = params;

	const item = await db.query.membersAndPartners.findFirst({
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
			metadata: true,
			name: true,
			summary: true,
			status: true,
			type: true,
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

	if (item == null) {
		return null;
	}

	const image =
		item.image != null
			? client.urls.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.featured },
				})
			: null;

	const data = { ...item, image };

	return data;
}

//

interface GetMemberOrPartnerBySlugParams {
	slug: schema.Entity["slug"];
}

export async function getMemberOrPartnerBySlug(
	db: Database | Transaction,
	params: GetMemberOrPartnerBySlugParams,
) {
	const { slug } = params;

	const item = await db.query.membersAndPartners.findFirst({
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
			metadata: true,
			name: true,
			summary: true,
			status: true,
			type: true,
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

	if (item == null) {
		return null;
	}

	const image =
		item.image != null
			? client.urls.generateSignedImageUrl({
					key: item.image.key,
					options: { width: imageWidth.featured },
				})
			: null;

	const data = { ...item, image };

	return data;
}
