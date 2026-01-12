/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { count, eq } from "@dariah-eric/dariah-knowledge-base-database-client";
import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { client } from "@dariah-eric/dariah-knowledge-base-image-service/client";

import { imageAssetWidth } from "@/config/assets.config";
import { config as fieldsConfig } from "@/config/fields.config";
import { createEntities, createFields } from "@/lib/data/entities";

interface GetEventsParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getEvents(params: GetEventsParams) {
	const { limit = 10, offset = 0 } = params;

	const [items, aggregate] = await Promise.all([
		db.query.events.findMany({
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
			.innerJoin(schema.entityStatus, eq(schema.entities.statusId, schema.entityStatus.id)),
	]);

	const total = aggregate.at(0)?.total ?? 0;

	const data = items.map((item) => {
		const image = client.urls.generate(item.image.key, { width: imageAssetWidth.preview });

		return { ...item, image };
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

	const image = client.urls.generate(item.image.key, { width: imageAssetWidth.featured });

	const data = { ...item, image };

	return data;
}

interface CreateEventParams extends Omit<schema.EventInput, "id" | "createdAt" | "updatedAt"> {
	slug: string;
	resourceIds?: Array<string>;
}
export async function createEvent(params: CreateEventParams) {
	const {
		endDate,
		endTime,
		imageId,
		location,
		slug,
		startDate,
		startTime,
		summary,
		title,
		website,
	} = params;

	const entityType =
		(await db.query.entityTypes.findFirst({
			columns: {
				id: true,
			},
			where: { type: "events" },
		})) ?? undefined;

	if (!entityType) return;

	const entityStatus = await db.query.entityStatus.findFirst({
		columns: {
			id: true,
		},
		where: { type: "draft" },
	});

	if (!entityStatus) return;

	const entityId = await db.transaction(async (tx) => {
		const entityIds = await createEntities({
			ctx: tx,
			data: [
				{
					typeId: entityType.id,
					documentId: undefined,
					statusId: entityStatus.id,
					slug,
				},
			],
		});

		if (!entityIds[0]) return tx.rollback();

		const { id } = entityIds[0];

		const event = {
			id,
			title,
			summary,
			imageId,
			location,
			startDate,
			startTime,
			endDate,
			endTime,
			website,
		};
		await tx.insert(schema.events).values(event);

		const fields = fieldsConfig.events.map((fieldName) => {
			return { entityId: id, name: fieldName };
		});

		await createFields({ ctx: tx, data: fields });
		return id;
	});

	// decide, what we need to return here
	return {
		entityId,
	};
}

export type EventsWithEntities = Awaited<ReturnType<typeof getEvents>>;
export type EventWithEntities = Awaited<ReturnType<typeof getEventById>>;
