/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/database/client";
import type { EntityInput } from "@dariah-eric/database/schema";
import * as schema from "@dariah-eric/database/schema";

interface CreateEntitiesParams {
	data: Array<{
		documentId: EntityInput["documentId"];
		slug: EntityInput["slug"];
		statusId: EntityInput["statusId"];
		typeId: EntityInput["typeId"];
	}>;
}

export async function createEntities(params: CreateEntitiesParams) {
	const { data } = params;
	const entityIds = await db.insert(schema.entities).values(data).returning({
		id: schema.entities.id,
	});
	return entityIds;
}
