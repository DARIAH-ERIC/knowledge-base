/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import type { EntityInput } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

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
