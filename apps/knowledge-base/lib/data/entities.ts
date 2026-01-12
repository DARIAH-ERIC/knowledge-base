/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type {
	EntityInput,
	FieldInput,
} from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

import type { DBContext } from "@/lib/data/types";

interface CreateEntitiesParams extends DBContext {
	data: Array<{
		documentId: EntityInput["documentId"];
		slug: EntityInput["slug"];
		statusId: EntityInput["statusId"];
		typeId: EntityInput["typeId"];
	}>;
}

export async function createEntities(params: CreateEntitiesParams) {
	const { ctx, data } = params;
	const entityIds = await ctx.insert(schema.entities).values(data).returning({
		id: schema.entities.id,
	});
	return entityIds;
}

interface CreateFieldsParams extends DBContext {
	data: Array<{
		entityId: FieldInput["entityId"];
		name: FieldInput["name"];
	}>;
}

export async function createFields(params: CreateFieldsParams) {
	const { ctx, data } = params;
	const fieldIds = await ctx.insert(schema.fields).values(data).returning({
		id: schema.fields.id,
		typeId: schema.fields.name,
	});
	return fieldIds;
}
