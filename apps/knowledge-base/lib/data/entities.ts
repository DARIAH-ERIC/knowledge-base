/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

interface CreateEntitiesParams {
	data: Array<schema.EntityInput>;
}

export async function createEntities(params: CreateEntitiesParams) {
	const { data } = params;

	const entityIds = await db.insert(schema.entities).values(data).returning({
		id: schema.entities.id,
	});

	return entityIds;
}
