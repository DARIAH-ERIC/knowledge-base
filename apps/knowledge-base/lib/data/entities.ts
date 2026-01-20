/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import type {
	EntityInput,
	FieldInput,
} from "@dariah-eric/dariah-knowledge-base-database-client/schema";
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

interface CreateFieldsParams {
	data: Array<{
		entityId: FieldInput["entityId"];
		name: FieldInput["name"];
	}>;
}

export async function createFields(params: CreateFieldsParams) {
	const { data } = params;
	const fieldIds = await db.insert(schema.fields).values(data).returning({
		id: schema.fields.id,
		typeId: schema.fields.name,
	});
	return fieldIds;
}
