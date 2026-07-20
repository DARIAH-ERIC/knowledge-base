import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";

import { type Image, generateImageUrl, toImageAsset } from "@/lib/images";
import { resolveDocumentId } from "@/lib/relations";
import type { Database, Transaction } from "@/middlewares/db";
import { alias, and, eq, inArray, sql } from "@/services/db/sql";
import { imageWidth } from "~/config/api.config";

export interface PersonPosition {
	role: (typeof schema.personRoleTypesEnum)[number];
	name: string;
	/** Slug of the related organisational unit, for constructing urls to its details page. */
	slug: string;
	type: (typeof schema.organisationalUnitTypesEnum)[number];
	/** Optional free-text note describing the person↔org relation. */
	description: string | null;
}

// Positions are surfaced in a fixed hierarchy of relation types so the order is consistent across
// endpoints: national-consortium roles first, then governance-body roles by seniority, affiliation
// last. The org-unit name is the tiebreaker within a role.
const positionRolePriority: Record<(typeof schema.personRoleTypesEnum)[number], number> = {
	national_coordinator: 0,
	national_coordinator_deputy: 1,
	national_coordination_staff: 2,
	national_representative: 3,
	national_representative_deputy: 4,
	is_chair_of: 5,
	is_vice_chair_of: 6,
	is_member_of: 7,
	is_contact_for: 8,
	is_affiliated_with: 9,
};

function comparePositions(a: PersonPosition, b: PersonPosition): number {
	const byRole = positionRolePriority[a.role] - positionRolePriority[b.role];
	if (byRole !== 0) {
		return byRole;
	}
	return a.name.localeCompare(b.name);
}

export async function getPersonPositions(
	db: Database | Transaction,
	personIds: Array<string>,
): Promise<Map<string, Array<PersonPosition> | null>> {
	const positions = new Map<string, Array<PersonPosition> | null>();

	for (const personId of personIds) {
		positions.set(personId, null);
	}

	if (personIds.length === 0) {
		return positions;
	}

	// person↔org relations are document-level. `personIds` are published version ids; re-key the
	// relation join through each endpoint's document and resolve the org to its published version.
	const personEntityVersions = alias(schema.entityVersions, "person_entity_versions");
	const organisationalUnitDocumentLifecycle = alias(
		schema.documentLifecycle,
		"organisational_unit_document_lifecycle",
	);

	const rows = await db
		.select({
			personId: personEntityVersions.id,
			role: schema.personRoleTypes.type,
			name: schema.organisationalUnits.name,
			slug: schema.entities.slug,
			type: schema.organisationalUnitTypes.type,
			description: schema.personsToOrganisationalUnits.description,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			personEntityVersions,
			eq(personEntityVersions.entityId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.innerJoin(
			organisationalUnitDocumentLifecycle,
			eq(
				organisationalUnitDocumentLifecycle.documentId,
				schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
			),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, organisationalUnitDocumentLifecycle.publishedId),
		)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, organisationalUnitDocumentLifecycle.documentId),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.where(
			and(
				inArray(personEntityVersions.id, personIds),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const rowsByPerson = new Map<string, Array<PersonPosition>>();

	for (const row of rows) {
		const items = rowsByPerson.get(row.personId) ?? [];
		items.push({
			role: row.role,
			name: row.name,
			slug: row.slug,
			type: row.type,
			description: row.description,
		});
		rowsByPerson.set(row.personId, items);
	}

	for (const personId of personIds) {
		const personRows = rowsByPerson.get(personId) ?? [];
		const sorted = personRows.toSorted(comparePositions);

		positions.set(personId, sorted.length > 0 ? sorted : null);
	}

	return positions;
}

//

export type PersonContributionType = "impact_case_study" | "spotlight_article";

export interface PersonContribution {
	type: PersonContributionType;
	id: string;
	title: string;
	summary: string;
	image: Image;
	entity: { slug: string };
	publishedAt: string;
	role: schema.ArticleContributorRole;
}

interface ContributionRow {
	id: string;
	title: string;
	summary: string;
	publicationDate: Date;
	slug: string;
	imageKey: string;
	imageAlt: string | null;
	imageCaption: JSONContent | null;
	licenseName: string | null;
	licenseUrl: string | null;
	role: schema.ArticleContributorRole;
}

function toContribution(type: PersonContributionType, row: ContributionRow): PersonContribution {
	const {
		imageKey,
		imageAlt,
		imageCaption,
		licenseName,
		licenseUrl,
		publicationDate,
		slug,
		...rest
	} = row;

	return {
		type,
		...rest,
		image: generateImageUrl(
			toImageAsset({
				key: imageKey,
				alt: imageAlt,
				caption: imageCaption,
				licenseName,
				licenseUrl,
			}),
			imageWidth.preview,
		),
		entity: { slug },
		publishedAt: publicationDate.toISOString(),
	};
}

/**
 * Articles a person is credited on, newest first. The contributor tables are document-level, so the
 * person version id is resolved to its document once, and each article document is resolved to its
 * published version — unpublished articles never surface.
 */
export async function getPersonContributions(
	db: Database | Transaction,
	personId: string,
): Promise<Array<PersonContribution>> {
	const personDocumentId = await resolveDocumentId(db, personId);

	const spotlightArticleDocumentLifecycle = alias(
		schema.documentLifecycle,
		"spotlight_article_document_lifecycle",
	);
	const impactCaseStudyDocumentLifecycle = alias(
		schema.documentLifecycle,
		"impact_case_study_document_lifecycle",
	);
	const spotlightArticleAssets = alias(schema.assets, "spotlight_article_assets");
	const impactCaseStudyAssets = alias(schema.assets, "impact_case_study_assets");
	const spotlightArticleLicenses = alias(schema.licenses, "spotlight_article_licenses");
	const impactCaseStudyLicenses = alias(schema.licenses, "impact_case_study_licenses");
	const spotlightArticleEntities = alias(schema.entities, "spotlight_article_entities");
	const impactCaseStudyEntities = alias(schema.entities, "impact_case_study_entities");

	const [spotlightArticles, impactCaseStudies] = await Promise.all([
		db
			.select({
				id: schema.spotlightArticles.id,
				title: schema.spotlightArticles.title,
				summary: schema.spotlightArticles.summary,
				publicationDate: schema.spotlightArticles.publicationDate,
				slug: spotlightArticleEntities.slug,
				imageKey: spotlightArticleAssets.key,
				imageAlt: spotlightArticleAssets.alt,
				imageCaption: spotlightArticleAssets.caption,
				licenseName: spotlightArticleLicenses.name,
				licenseUrl: spotlightArticleLicenses.url,
				role: schema.spotlightArticlesToPersons.role,
			})
			.from(schema.spotlightArticlesToPersons)
			.innerJoin(
				spotlightArticleEntities,
				eq(
					spotlightArticleEntities.id,
					schema.spotlightArticlesToPersons.spotlightArticleDocumentId,
				),
			)
			.innerJoin(
				spotlightArticleDocumentLifecycle,
				eq(spotlightArticleDocumentLifecycle.documentId, spotlightArticleEntities.id),
			)
			.innerJoin(
				schema.spotlightArticles,
				eq(schema.spotlightArticles.id, spotlightArticleDocumentLifecycle.publishedId),
			)
			.innerJoin(
				spotlightArticleAssets,
				eq(spotlightArticleAssets.id, schema.spotlightArticles.imageId),
			)
			.leftJoin(
				spotlightArticleLicenses,
				eq(spotlightArticleLicenses.id, spotlightArticleAssets.licenseId),
			)
			.where(eq(schema.spotlightArticlesToPersons.personDocumentId, personDocumentId)),
		db
			.select({
				id: schema.impactCaseStudies.id,
				title: schema.impactCaseStudies.title,
				summary: schema.impactCaseStudies.summary,
				publicationDate: schema.impactCaseStudies.publicationDate,
				slug: impactCaseStudyEntities.slug,
				imageKey: impactCaseStudyAssets.key,
				imageAlt: impactCaseStudyAssets.alt,
				imageCaption: impactCaseStudyAssets.caption,
				licenseName: impactCaseStudyLicenses.name,
				licenseUrl: impactCaseStudyLicenses.url,
				role: schema.impactCaseStudiesToPersons.role,
			})
			.from(schema.impactCaseStudiesToPersons)
			.innerJoin(
				impactCaseStudyEntities,
				eq(impactCaseStudyEntities.id, schema.impactCaseStudiesToPersons.impactCaseStudyDocumentId),
			)
			.innerJoin(
				impactCaseStudyDocumentLifecycle,
				eq(impactCaseStudyDocumentLifecycle.documentId, impactCaseStudyEntities.id),
			)
			.innerJoin(
				schema.impactCaseStudies,
				eq(schema.impactCaseStudies.id, impactCaseStudyDocumentLifecycle.publishedId),
			)
			.innerJoin(
				impactCaseStudyAssets,
				eq(impactCaseStudyAssets.id, schema.impactCaseStudies.imageId),
			)
			.leftJoin(
				impactCaseStudyLicenses,
				eq(impactCaseStudyLicenses.id, impactCaseStudyAssets.licenseId),
			)
			.where(eq(schema.impactCaseStudiesToPersons.personDocumentId, personDocumentId)),
	]);

	const contributions = [
		...spotlightArticles.map((row) => toContribution("spotlight_article", row)),
		...impactCaseStudies.map((row) => toContribution("impact_case_study", row)),
	];

	return contributions.toSorted((a, b) => {
		const byDate = b.publishedAt.localeCompare(a.publishedAt);
		if (byDate !== 0) {
			return byDate;
		}
		return a.title.localeCompare(b.title);
	});
}
