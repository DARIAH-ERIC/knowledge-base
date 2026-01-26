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
				optional: false,
			}),
			type: r.one.contentBlockTypes({
				from: r.contentBlocks.typeId,
				to: r.contentBlockTypes.id,
				optional: false,
			}),
		},
		dataContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.dataContentBlocks.id,
				to: r.contentBlocks.id,
				optional: false,
			}),
			type: r.one.dataContentBlockTypes({
				from: r.dataContentBlocks.typeId,
				to: r.dataContentBlockTypes.id,
				optional: false,
			}),
		},
		embedContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.embedContentBlocks.id,
				to: r.contentBlocks.id,
				optional: false,
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
				optional: false,
			}),
			type: r.one.entityTypes({
				from: r.entities.typeId,
				to: r.entityTypes.id,
				optional: false,
			}),
		},
		events: {
			entity: r.one.entities({
				from: r.events.id,
				to: r.entities.id,
				optional: false,
			}),
			image: r.one.assets({
				from: r.events.imageId,
				to: r.assets.id,
				optional: false,
			}),
		},
		entityTypesFieldsNames: {
			entityType: r.one.entityTypes({
				from: r.entityTypesFieldsNames.entityTypeId,
				to: r.entityTypes.id,
			}),
		},
		fields: {
			entity: r.one.entities({
				from: r.fields.entityId,
				to: r.entities.id,
				optional: false,
			}),
			name: r.one.entityTypesFieldsNames({
				from: r.fields.fieldNameId,
				to: r.entityTypesFieldsNames.id,
				optional: false,
			}),
		},
		imageContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.imageContentBlocks.id,
				to: r.contentBlocks.id,
				optional: false,
			}),
			image: r.one.assets({
				from: r.imageContentBlocks.imageId,
				to: r.assets.id,
				optional: false,
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
				optional: false,
			}),
			image: r.one.assets({
				from: r.impactCaseStudies.imageId,
				to: r.assets.id,
				optional: false,
			}),
		},
		news: {
			entity: r.one.entities({
				from: r.news.id,
				to: r.entities.id,
				optional: false,
			}),
			image: r.one.assets({
				from: r.news.imageId,
				to: r.assets.id,
				optional: false,
			}),
		},
		organisationalUnits: {
			image: r.one.assets({
				from: r.organisationalUnits.imageId,
				to: r.assets.id,
			}),
			entity: r.one.entities({
				from: r.organisationalUnits.id,
				to: r.entities.id,
				optional: false,
			}),
			organisationalUnits: r.many.organisationalUnits({
				from: r.organisationalUnits.id.through(r.organisationalUnitsRelations.unitId),
				to: r.organisationalUnits.id.through(r.organisationalUnitsRelations.relatedUnitId),
			}),
			type: r.one.organisationalUnitTypes({
				from: r.organisationalUnits.typeId,
				to: r.organisationalUnitTypes.id,
				optional: false,
			}),
		},
		pages: {
			entity: r.one.entities({
				from: r.pages.id,
				to: r.entities.id,
				optional: false,
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
				optional: false,
			}),
			image: r.one.assets({
				from: r.persons.imageId,
				to: r.assets.id,
				optional: false,
			}),
		},
		richTextContentBlocks: {
			contentBlock: r.one.contentBlocks({
				from: r.richTextContentBlocks.id,
				to: r.contentBlocks.id,
				optional: false,
			}),
		},
		spotlightArticles: {
			entity: r.one.entities({
				from: r.spotlightArticles.id,
				to: r.entities.id,
				optional: false,
			}),
			image: r.one.assets({
				from: r.spotlightArticles.imageId,
				to: r.assets.id,
				optional: false,
			}),
		},
	};
});
