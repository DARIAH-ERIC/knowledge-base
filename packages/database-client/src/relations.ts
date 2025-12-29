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
			field: r.one.fields({
				from: r.contentBlocks.fieldId,
				to: r.fields.id,
			}),
			type: r.one.contentBlockTypes({
				from: r.contentBlocks.typeId,
				to: r.contentBlockTypes.id,
			}),
		},
		dataContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.dataContentBlocks.id,
				to: r.contentBlocks.id,
			}),
			type: r.one.dataContentBlockTypes({
				from: r.dataContentBlocks.typeId,
				to: r.dataContentBlockTypes.id,
			}),
		},
		embedContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.embedContentBlocks.id,
				to: r.contentBlocks.id,
			}),
		},
		entities: {
			entities: r.many.entities({
				from: r.entities.id.through(r.entitiesToEntities.entityId),
				to: r.entities.id.through(r.entitiesToEntities.relatedEntityId),
			}),
			status: r.one.entityStatus({
				from: r.entities.statusId,
				to: r.entityStatus.id,
			}),
			type: r.one.entityTypes({
				from: r.entities.typeId,
				to: r.entityTypes.id,
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
		fields: {
			entity: r.one.entities({
				from: r.fields.entityId,
				to: r.entities.id,
			}),
		},
		imageContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.imageContentBlocks.id,
				to: r.contentBlocks.id,
			}),
			image: r.one.assets({
				from: r.imageContentBlocks.imageId,
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
		richTextContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.richTextContentBlocks.id,
				to: r.contentBlocks.id,
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
