import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => {
	return {
		assets: {
			license: r.one.licenses({
				from: r.assets.licenseId,
				to: r.licenses.id,
			}),
		},
		contentBlocks: {
			field: r.one.contentBlocksFields({
				from: r.contentBlocks.fieldId,
				to: r.contentBlocksFields.id,
			}),
		},
		events: {
			content: r.one.contentBlocksFields({
				from: r.events.contentId,
				to: r.contentBlocksFields.id,
			}),
			image: r.one.assets({
				from: r.events.imageId,
				to: r.assets.id,
			}),
		},
		news: {
			content: r.one.contentBlocksFields({
				from: r.news.contentId,
				to: r.contentBlocksFields.id,
			}),
			image: r.one.assets({
				from: r.news.imageId,
				to: r.assets.id,
			}),
		},
	};
});
