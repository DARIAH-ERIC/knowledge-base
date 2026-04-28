/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { imageAssetWidth } from "@/config/assets.config";
import { db } from "@/lib/db";
import { count, desc, eq, ilike } from "@/lib/db/sql";
import { images } from "@/lib/images";

export type EventsSort = "title" | "updatedAt";

interface GetEventsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	q?: string;
	sort?: EventsSort;
	dir?: "asc" | "desc";
}

export async function getEvents(params: GetEventsParams) {
	const { limit = 10, offset = 0, q, sort = "updatedAt", dir = "desc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.events.title, `%${query}%`) : undefined;
	const orderBy =
		sort === "title"
			? dir === "asc"
				? schema.events.title
				: desc(schema.events.title)
			: dir === "asc"
				? schema.entities.updatedAt
				: desc(schema.entities.updatedAt);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				duration: schema.events.duration,
				id: schema.events.id,
				location: schema.events.location,
				slug: schema.entities.slug,
				summary: schema.events.summary,
				title: schema.events.title,
				updatedAt: schema.entities.updatedAt,
				website: schema.events.website,
			})
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.events)
			.innerJoin(schema.entities, eq(schema.events.id, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id))
			.where(where),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		return {
			duration: item.duration,
			id: item.id,
			location: item.location,
			entity: { slug: item.slug },
			summary: item.summary,
			title: item.title,
			updatedAt: item.updatedAt,
			website: item.website,
		};
	});

	return { data, limit, offset, total };
}

interface GetEventByIdParams {
	id: schema.Event["id"];
}

export async function getEventById(params: GetEventByIdParams) {
	const { id } = params;

	const item = await db.query.events.findFirst({
		where: {
			id,
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

	const image = images.generateSignedImageUrl({
		key: item.image.key,
		options: { width: imageAssetWidth.featured },
	});

	const data = { ...item, image };

	return data;
}

interface CreateEventParams extends schema.EventInput {
	slug: schema.EntityInput["slug"];
}

export async function createEvent(params: CreateEventParams) {
	const { duration, imageId, isFullDay, location, slug, summary, title, website } = params;

	const entityType = await db.query.entityTypes.findFirst({
		columns: {
			id: true,
		},
		where: { type: "events" },
	});

	if (entityType == null) {
		return null;
	}

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (entityStatus == null) {
		return null;
	}

	const entityId = await db.transaction(async (tx) => {
		const [item] = await tx
			.insert(schema.entities)
			.values({
				typeId: entityType.id,
				statusId: entityStatus.id,
				slug,
			})
			.returning({
				id: schema.entities.id,
			});

		if (item == null) {
			return tx.rollback();
		}

		const { id } = item;

		const event = {
			id,
			title,
			summary,
			imageId,
			location,
			duration,
			isFullDay,
			website,
		};

		await tx.insert(schema.events).values(event);

		const fieldNamesIds = await tx.query.entityTypesFieldsNames.findMany({
			where: {
				entityTypeId: entityType.id,
			},
		});

		const fields = fieldNamesIds.map(({ id: fieldNameId }) => {
			return { entityId: id, fieldNameId };
		});

		await tx.insert(schema.fields).values(fields).returning({
			id: schema.fields.id,
		});

		return id;
	});

	return {
		entityId,
	};
}

export type EventsWithEntities = Awaited<ReturnType<typeof getEvents>>;
export type EventWithEntities = Awaited<ReturnType<typeof getEventById>>;
