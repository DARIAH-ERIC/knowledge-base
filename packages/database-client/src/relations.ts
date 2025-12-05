import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => {
	return {
		events: {
			image: r.one.assets({
				from: r.events.imageId,
				to: r.assets.id,
			}),
		},
		news: {
			image: r.one.assets({
				from: r.news.imageId,
				to: r.assets.id,
			}),
		},
	};
});
