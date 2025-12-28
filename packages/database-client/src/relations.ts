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
			entity: r.one.entities({
				from: r.events.id,
				to: r.entities.id,
			}),
			image: r.one.assets({
				from: r.events.imageId,
				to: r.assets.id,
			}),
		},
		impactCaseStudies: {
			contributors: r.many.persons({
				from: r.impactCaseStudies.id.through(r.impactCaseStudiesToPersons.impactCaseStudyId),
				to: r.persons.id.through(r.impactCaseStudiesToPersons.personId),
			}),
			entity: r.one.entities({
				from: r.impactCaseStudies.id,
				to: r.entities.id,
			}),
			image: r.one.assets({
				from: r.impactCaseStudies.imageId,
				to: r.assets.id,
			}),
		},
		news: {
			entity: r.one.entities({
				from: r.news.id,
				to: r.entities.id,
			}),
			image: r.one.assets({
				from: r.news.imageId,
				to: r.assets.id,
			}),
		},
		pages: {
			entity: r.one.entities({
				from: r.pages.id,
				to: r.entities.id,
			}),
			image: r.one.assets({
				from: r.pages.imageId,
				to: r.assets.id,
			}),
		},
		persons: {
			entity: r.one.entities({
				from: r.persons.id,
				to: r.entities.id,
			}),
			image: r.one.assets({
				from: r.persons.imageId,
				to: r.assets.id,
			}),
		},
		spotlightArticles: {
			entity: r.one.entities({
				from: r.spotlightArticles.id,
				to: r.entities.id,
			}),
			image: r.one.assets({
				from: r.spotlightArticles.imageId,
				to: r.assets.id,
			}),
		},
	};
});
