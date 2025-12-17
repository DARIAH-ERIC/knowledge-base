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
		events: {
			image: r.one.assets({
				from: r.events.imageId,
				to: r.assets.id,
			}),
		},
		impactCaseStudies: {
			image: r.one.assets({
				from: r.impactCaseStudies.imageId,
				to: r.assets.id,
			}),
		},
		news: {
			image: r.one.assets({
				from: r.news.imageId,
				to: r.assets.id,
			}),
		},
		pages: {
			image: r.one.assets({
				from: r.pages.imageId,
				to: r.assets.id,
			}),
		},
		spotlightArticles: {
			image: r.one.assets({
				from: r.spotlightArticles.imageId,
				to: r.assets.id,
			}),
		},
	};
});
