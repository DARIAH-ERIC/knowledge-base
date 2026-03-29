import { defineRelations } from "drizzle-orm";
import { type RelationsFilter, relationsFilterToSQL } from "drizzle-orm/relations";

import * as schema from "./schema";

export { type RelationsFilter, relationsFilterToSQL };

export const relations = defineRelations(schema, (r) => {
	return {
		assets: {
			license: r.one.licenses({
				from: r.assets.licenseId,
				to: r.licenses.id,
			}),
		},
		documentsPolicies: {
			entity: r.one.entities({
				from: r.documentsPolicies.id,
				to: r.entities.id,
				optional: false,
			}),
			document: r.one.assets({
				from: r.documentsPolicies.documentId,
				to: r.assets.id,
				optional: false,
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
			dataContentBlock: r.one.dataContentBlocks({
				from: r.contentBlocks.id,
				to: r.dataContentBlocks.id,
				optional: true,
			}),
			embedContentBlock: r.one.embedContentBlocks({
				from: r.contentBlocks.id,
				to: r.embedContentBlocks.id,
				optional: true,
			}),
			imageContentBlock: r.one.imageContentBlocks({
				from: r.contentBlocks.id,
				to: r.imageContentBlocks.id,
				optional: true,
			}),
			richTextContentBlock: r.one.richTextContentBlocks({
				from: r.contentBlocks.id,
				to: r.richTextContentBlocks.id,
				optional: true,
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
			fields: r.many.fields({
				from: r.entities.id,
				to: r.fields.entityId,
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
			contentBlocks: r.many.contentBlocks({
				from: r.fields.id,
				to: r.contentBlocks.fieldId,
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
		dariahProjects: {
			entity: r.one.entities({
				from: r.dariahProjects.id,
				to: r.entities.id,
				optional: false,
			}),
			image: r.one.assets({
				from: r.dariahProjects.imageId,
				to: r.assets.id,
			}),
			partners: r.many.projectPartners({
				from: r.dariahProjects.id,
				to: r.projectPartners.projectId,
			}),
			scope: r.one.projectScopes({
				from: r.dariahProjects.scopeId,
				to: r.projectScopes.id,
				optional: false,
			}),
			socialMedia: r.many.socialMedia({
				from: r.dariahProjects.id.through(r.projectsToSocialMedia.projectId),
				to: r.socialMedia.id.through(r.projectsToSocialMedia.socialMediaId),
			}),
		},
		membersAndPartners: {
			image: r.one.assets({
				from: r.membersAndPartners.imageId,
				to: r.assets.id,
			}),
			entity: r.one.entities({
				from: r.membersAndPartners.id,
				to: r.entities.id,
				optional: false,
			}),
			socialMedia: r.many.socialMedia({
				from: r.membersAndPartners.id.through(
					r.organisationalUnitsToSocialMedia.organisationalUnitId,
				),
				to: r.socialMedia.id.through(r.organisationalUnitsToSocialMedia.socialMediaId),
			}),
		},
		workingGroups: {
			image: r.one.assets({
				from: r.workingGroups.imageId,
				to: r.assets.id,
			}),
			entity: r.one.entities({
				from: r.workingGroups.id,
				to: r.entities.id,
				optional: false,
			}),
			socialMedia: r.many.socialMedia({
				from: r.workingGroups.id.through(r.organisationalUnitsToSocialMedia.organisationalUnitId),
				to: r.socialMedia.id.through(r.organisationalUnitsToSocialMedia.socialMediaId),
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
			socialMedia: r.many.socialMedia({
				from: r.organisationalUnits.id.through(
					r.organisationalUnitsToSocialMedia.organisationalUnitId,
				),
				to: r.socialMedia.id.through(r.organisationalUnitsToSocialMedia.socialMediaId),
			}),
			type: r.one.organisationalUnitTypes({
				from: r.organisationalUnits.typeId,
				to: r.organisationalUnitTypes.id,
				optional: false,
			}),
		},
		projects: {
			entity: r.one.entities({
				from: r.projects.id,
				to: r.entities.id,
				optional: false,
			}),
			image: r.one.assets({
				from: r.projects.imageId,
				to: r.assets.id,
			}),
			institutions: r.many.organisationalUnits({
				from: r.projects.id.through(r.projectPartners.projectId),
				to: r.organisationalUnits.id.through(r.projectPartners.unitId),
			}),
			partners: r.many.projectPartners({
				from: r.projects.id,
				to: r.projectPartners.projectId,
			}),
			scope: r.one.projectScopes({
				from: r.projects.scopeId,
				to: r.projectScopes.id,
				optional: false,
			}),
			socialMedia: r.many.socialMedia({
				from: r.projects.id.through(r.projectsToSocialMedia.projectId),
				to: r.socialMedia.id.through(r.projectsToSocialMedia.socialMediaId),
			}),
		},
		projectPartners: {
			project: r.one.projects({
				from: r.projectPartners.projectId,
				to: r.projects.id,
				optional: false,
			}),
			unit: r.one.organisationalUnits({
				from: r.projectPartners.unitId,
				to: r.organisationalUnits.id,
				optional: false,
			}),
			role: r.one.projectRoles({
				from: r.projectPartners.roleId,
				to: r.projectRoles.id,
				optional: false,
			}),
		},
		projectsContributions: {
			projectPartner: r.one.projectPartners({
				from: r.projectsContributions.projectPartnerId,
				to: r.projectPartners.id,
			}),
			report: r.one.reports({
				from: r.projectsContributions.reportId,
				to: r.reports.id,
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
		socialMedia: {
			type: r.one.socialMediaTypes({
				from: r.socialMedia.typeId,
				to: r.socialMediaTypes.id,
				optional: false,
			}),
			organisationalUnits: r.many.organisationalUnits({
				from: r.socialMedia.id.through(r.organisationalUnitsToSocialMedia.socialMediaId),
				to: r.organisationalUnits.id.through(
					r.organisationalUnitsToSocialMedia.organisationalUnitId,
				),
			}),
			projects: r.many.projects({
				from: r.socialMedia.id.through(r.projectsToSocialMedia.socialMediaId),
				to: r.projects.id.through(r.projectsToSocialMedia.projectId),
			}),
		},
		projectsToSocialMedia: {
			project: r.one.projects({
				from: r.projectsToSocialMedia.projectId,
				to: r.projects.id,
				optional: false,
			}),
			socialMedia: r.one.socialMedia({
				from: r.projectsToSocialMedia.socialMediaId,
				to: r.socialMedia.id,
				optional: false,
			}),
		},
		organisationalUnitsToSocialMedia: {
			organisationalUnit: r.one.organisationalUnits({
				from: r.organisationalUnitsToSocialMedia.organisationalUnitId,
				to: r.organisationalUnits.id,
				optional: false,
			}),
			socialMedia: r.one.socialMedia({
				from: r.organisationalUnitsToSocialMedia.socialMediaId,
				to: r.socialMedia.id,
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
