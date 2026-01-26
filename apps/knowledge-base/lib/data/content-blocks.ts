/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import type {
	ContentBlockInput,
	ContentBlockTypes,
} from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";

export async function getContentBlockTypes() {
	const contentBlockTypes = await db.query.contentBlockTypes.findMany({
		columns: {
			id: true,
			type: true,
		},
	});
	return contentBlockTypes;
}

export async function getContentBlockByType(type: ContentBlockTypes["type"]) {
	const contentBlockType = await db.query.contentBlockTypes.findFirst({
		where: {
			type,
		},
	});
	return contentBlockType;
}

interface CreateContentBlocksParams {
	data: Array<{
		fieldId: ContentBlockInput["fieldId"];
		typeId: ContentBlockInput["typeId"];
		position: ContentBlockInput["position"];
	}>;
}

export async function createContentBlocks(params: CreateContentBlocksParams) {
	const { data } = params;
	const contentBlockIds = await db.insert(schema.contentBlocks).values(data).returning({
		id: schema.contentBlocks.id,
		typeId: schema.contentBlocks.typeId,
	});
	return contentBlockIds;
}
