import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => {
	return {
		events: {
			content: r.one.contents({
				from: r.events.contentId,
				to: r.contents.id,
			}),
			image: r.one.assets({
				from: r.events.imageId,
				to: r.assets.id,
			}),
		},
		news: {
			content: r.one.contents({
				from: r.news.contentId,
				to: r.contents.id,
			}),
			image: r.one.assets({
				from: r.news.imageId,
				to: r.assets.id,
			}),
		},
	};
});
