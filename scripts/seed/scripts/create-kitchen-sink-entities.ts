import { createHash } from "node:crypto";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService, type Database, type Transaction } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq, inArray } from "@dariah-eric/database/sql";
import { type ResourceDocument, resourceSources, resourceTypes } from "@dariah-eric/search";
import { createSearchAdminService } from "@dariah-eric/search/admin";

import { env } from "../config/env.config";

type Db = Database | Transaction;

function createId(name: string): string {
	const hex = createHash("sha256").update(`kitchen-sink:${name}`).digest("hex");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function createTimestampRange(start: string, end?: string | null) {
	return {
		start: new Date(start),
		end: end != null ? new Date(end) : undefined,
	};
}

function assertLookupId(value: string | undefined, message: string): string {
	if (value == null) {
		throw new Error(message);
	}

	return value;
}

/* eslint-disable
	@typescript-eslint/no-explicit-any,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-member-access
*/
async function upsertById(
	db: Db,
	table: any,
	row: Record<string, unknown> & { id: string },
): Promise<void> {
	const { id: _id, ...set } = row;
	const _table = table;

	await db
		.insert(_table)
		.values(row as never)
		.onConflictDoUpdate({
			target: _table.id,
			set: set as never,
		});
}
/* eslint-enable
	@typescript-eslint/no-explicit-any,
	@typescript-eslint/no-unsafe-assignment,
	@typescript-eslint/no-unsafe-member-access
*/

async function ensureRelatedResources() {
	const search = createSearchAdminService({
		apiKey: env.TYPESENSE_ADMIN_API_KEY,
		nodes: [
			{
				host: env.TYPESENSE_HOST,
				port: env.TYPESENSE_PORT,
				protocol: env.TYPESENSE_PROTOCOL,
			},
		],
		collections: {
			resources: env.TYPESENSE_RESOURCE_COLLECTION_NAME,
			website: env.TYPESENSE_WEBSITE_COLLECTION_NAME,
		},
	});

	const createResult = await search.collections.resources.create();
	if (createResult.isErr()) {
		throw createResult.error;
	}

	const now = Math.floor(Date.now() / 1000);

	const documents: Array<ResourceDocument> = [
		{
			id: "kitchen-sink-resource-publication",
			source: resourceSources[2],
			source_id: "kitchen-sink-publication",
			source_updated_at: now,
			source_actor_ids: null,
			upstream_sources: ["kitchen-sink-source"],
			imported_at: now,
			type: resourceTypes[0],
			label: "Kitchen Sink Publication",
			description: "A seeded publication resource for API integration testing.",
			keywords: ["kitchen-sink", "publication"],
			kind: "article",
			links: ["https://example.org/resources/kitchen-sink-publication"],
			authors: ["Kitchen Sink Author"],
			year: 2026,
			pid: "10.1234/kitchen-sink-publication",
		},
		{
			id: "kitchen-sink-resource-training-material",
			source: resourceSources[0],
			source_id: "kitchen-sink-training",
			source_updated_at: now,
			source_actor_ids: ["9001"],
			upstream_sources: ["kitchen-sink-upstream"],
			imported_at: now,
			type: resourceTypes[3],
			label: "Kitchen Sink Training Material",
			description: "A seeded training material resource for API integration testing.",
			keywords: ["kitchen-sink", "training"],
			kind: null,
			links: ["https://example.org/resources/kitchen-sink-training"],
			authors: ["Kitchen Sink Trainer"],
			year: 2026,
			pid: null,
		},
	];

	for (const document of documents) {
		const result = await search.collections.resources.upsert(document);
		if (result.isErr()) {
			throw result.error;
		}
	}

	return documents.map((document) => {
		return document.id;
	});
}

async function main() {
	const db = createDatabaseService({
		connection: {
			database: env.DATABASE_NAME,
			host: env.DATABASE_HOST,
			password: env.DATABASE_PASSWORD,
			port: env.DATABASE_PORT,
			ssl: env.DATABASE_SSL_CONNECTION === "enabled",
			user: env.DATABASE_USER,
			max: 1,
		},
		logger: true,
	}).unwrap();

	try {
		const resourceIds = await ensureRelatedResources();

		await db.transaction(async (tx) => {
			const [
				entityTypeRows,
				entityStatusRows,
				unitTypeRows,
				unitStatusRows,
				personRoleRows,
				projectRoleRows,
				projectScopeRows,
				socialMediaTypeRows,
				contentBlockTypeRows,
				dataContentBlockTypeRows,
				licenseRows,
				fieldNameRows,
			] = await Promise.all([
				tx.select().from(schema.entityTypes),
				tx.select().from(schema.entityStatus),
				tx.select().from(schema.organisationalUnitTypes),
				tx.select().from(schema.organisationalUnitStatus),
				tx.select().from(schema.personRoleTypes),
				tx.select().from(schema.projectRoles),
				tx.select().from(schema.projectScopes),
				tx.select().from(schema.socialMediaTypes),
				tx.select().from(schema.contentBlockTypes),
				tx.select().from(schema.dataContentBlockTypes),
				tx.select().from(schema.licenses),
				tx
					.select({
						id: schema.entityTypesFieldsNames.id,
						entityTypeId: schema.entityTypesFieldsNames.entityTypeId,
						fieldName: schema.entityTypesFieldsNames.fieldName,
					})
					.from(schema.entityTypesFieldsNames),
			]);

			const entityTypeIds = new Map(
				entityTypeRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const entityStatusIds = new Map(
				entityStatusRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const unitTypeIds = new Map(
				unitTypeRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const unitStatusIds = new Map(
				unitStatusRows.map((row) => {
					return [row.status, row.id];
				}),
			);
			const personRoleIds = new Map(
				personRoleRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const projectRoleIds = new Map(
				projectRoleRows.map((row) => {
					return [row.role, row.id];
				}),
			);
			const projectScopeIds = new Map(
				projectScopeRows.map((row) => {
					return [row.scope, row.id];
				}),
			);
			const socialMediaTypeIds = new Map(
				socialMediaTypeRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const contentBlockTypeIds = new Map(
				contentBlockTypeRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const dataContentBlockTypeIds = new Map(
				dataContentBlockTypeRows.map((row) => {
					return [row.type, row.id];
				}),
			);
			const licenseId = licenseRows[0]?.id;

			if (licenseId == null) {
				throw new Error("No license rows found. Seed lookup data before running this script.");
			}

			const publishedStatusId = assertLookupId(
				entityStatusIds.get("published"),
				'Missing entity status "published".',
			);

			const entityTypeFieldNames = new Map<string, Array<{ id: string; fieldName: string }>>();
			for (const row of fieldNameRows) {
				const items = entityTypeFieldNames.get(row.entityTypeId) ?? [];
				items.push({ id: row.id, fieldName: row.fieldName });
				entityTypeFieldNames.set(row.entityTypeId, items);
			}

			const assets = [
				{
					id: createId("asset:image"),
					key: "kitchen-sink/featured-image.png",
					label: "Kitchen Sink Featured Image",
					filename: "featured-image.png",
					mimeType: "image/png",
					caption: "Kitchen sink featured image.",
					alt: "Kitchen sink featured illustration",
					licenseId,
				},
				{
					id: createId("asset:hero-image"),
					key: "kitchen-sink/hero-image.png",
					label: "Kitchen Sink Hero Image",
					filename: "hero-image.png",
					mimeType: "image/png",
					caption: "Kitchen sink hero image.",
					alt: "Kitchen sink hero illustration",
					licenseId,
				},
				{
					id: createId("asset:avatar"),
					key: "kitchen-sink/avatar.png",
					label: "Kitchen Sink Avatar",
					filename: "avatar.png",
					mimeType: "image/png",
					caption: "Kitchen sink avatar.",
					alt: "Kitchen sink avatar portrait",
					licenseId,
				},
				{
					id: createId("asset:document"),
					key: "kitchen-sink/document.pdf",
					label: "Kitchen Sink Document",
					filename: "document.pdf",
					mimeType: "application/pdf",
					caption: "Kitchen sink policy PDF.",
					alt: "Kitchen sink policy PDF",
					licenseId,
				},
			];

			for (const asset of assets) {
				await upsertById(tx, schema.assets, asset);
			}

			await upsertById(tx, schema.documentPolicyGroups, {
				id: createId("document-policy-group"),
				label: "Kitchen Sink Policies",
				position: 1,
			});

			const projectEntityId = createId("entity:project");
			const dariahEricEntityId = createId("entity:eric");
			const workingGroupEntityId = createId("entity:working-group");
			const governanceBodyEntityId = createId("entity:governance-body");
			const memberCountryEntityId = createId("entity:country");
			const institutionEntityId = createId("entity:institution");
			const consortiumEntityId = createId("entity:national-consortium");
			const kitchenSinkPersonEntityId = createId("entity:person:kitchen-sink");
			const relatedPersonEntityId = createId("entity:person:related");
			const eventEntityId = createId("entity:event:kitchen-sink");
			const prevEventEntityId = createId("entity:event:previous");
			const nextEventEntityId = createId("entity:event:next");
			const pageEntityId = createId("entity:page");
			const newsEntityId = createId("entity:news");
			const spotlightEntityId = createId("entity:spotlight");
			const impactEntityId = createId("entity:impact");
			const documentPolicyEntityId = createId("entity:document-policy");

			const entities = [
				{
					id: projectEntityId,
					typeId: assertLookupId(entityTypeIds.get("projects"), 'Missing entity type "projects".'),
					documentId: createId("document:project"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: dariahEricEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("organisational_units"),
						'Missing entity type "organisational_units".',
					),
					documentId: createId("document:eric"),
					statusId: publishedStatusId,
					slug: "kitchen-sink-eric",
				},
				{
					id: workingGroupEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("organisational_units"),
						'Missing entity type "organisational_units".',
					),
					documentId: createId("document:working-group"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: governanceBodyEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("organisational_units"),
						'Missing entity type "organisational_units".',
					),
					documentId: createId("document:governance-body"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: memberCountryEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("organisational_units"),
						'Missing entity type "organisational_units".',
					),
					documentId: createId("document:country"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: institutionEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("organisational_units"),
						'Missing entity type "organisational_units".',
					),
					documentId: createId("document:institution"),
					statusId: publishedStatusId,
					slug: "kitchen-sink-institution",
				},
				{
					id: consortiumEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("organisational_units"),
						'Missing entity type "organisational_units".',
					),
					documentId: createId("document:national-consortium"),
					statusId: publishedStatusId,
					slug: "kitchen-sink-national-consortium",
				},
				{
					id: kitchenSinkPersonEntityId,
					typeId: assertLookupId(entityTypeIds.get("persons"), 'Missing entity type "persons".'),
					documentId: createId("document:person:kitchen-sink"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: relatedPersonEntityId,
					typeId: assertLookupId(entityTypeIds.get("persons"), 'Missing entity type "persons".'),
					documentId: createId("document:person:related"),
					statusId: publishedStatusId,
					slug: "kitchen-sink-related-person",
				},
				{
					id: eventEntityId,
					typeId: assertLookupId(entityTypeIds.get("events"), 'Missing entity type "events".'),
					documentId: createId("document:event:kitchen-sink"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: prevEventEntityId,
					typeId: assertLookupId(entityTypeIds.get("events"), 'Missing entity type "events".'),
					documentId: createId("document:event:previous"),
					statusId: publishedStatusId,
					slug: "kitchen-sink-previous",
				},
				{
					id: nextEventEntityId,
					typeId: assertLookupId(entityTypeIds.get("events"), 'Missing entity type "events".'),
					documentId: createId("document:event:next"),
					statusId: publishedStatusId,
					slug: "kitchen-sink-next",
				},
				{
					id: pageEntityId,
					typeId: assertLookupId(entityTypeIds.get("pages"), 'Missing entity type "pages".'),
					documentId: createId("document:page"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: newsEntityId,
					typeId: assertLookupId(entityTypeIds.get("news"), 'Missing entity type "news".'),
					documentId: createId("document:news"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: spotlightEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("spotlight_articles"),
						'Missing entity type "spotlight_articles".',
					),
					documentId: createId("document:spotlight"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: impactEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("impact_case_studies"),
						'Missing entity type "impact_case_studies".',
					),
					documentId: createId("document:impact"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
				{
					id: documentPolicyEntityId,
					typeId: assertLookupId(
						entityTypeIds.get("documents_policies"),
						'Missing entity type "documents_policies".',
					),
					documentId: createId("document:document-policy"),
					statusId: publishedStatusId,
					slug: "kitchen-sink",
				},
			];

			for (const entity of entities) {
				await upsertById(tx, schema.entities, entity);
			}

			await upsertById(tx, schema.persons, {
				id: kitchenSinkPersonEntityId,
				name: "Kitchen Sink Person",
				sortName: "Person, Kitchen Sink",
				email: "kitchen.sink.person@example.org",
				orcid: "0000-0002-1825-0097",
				position: "Senior Integration Tester",
				imageId: createId("asset:avatar"),
			});
			await upsertById(tx, schema.persons, {
				id: relatedPersonEntityId,
				name: "Related Kitchen Sink Person",
				sortName: "Person, Related Kitchen Sink",
				email: "related.person@example.org",
				orcid: "0000-0002-1694-233X",
				position: "Research Infrastructure Coordinator",
				imageId: createId("asset:avatar"),
			});

			await upsertById(tx, schema.events, {
				id: prevEventEntityId,
				title: "Kitchen Sink Previous Event",
				summary: "A previous event so the by-slug endpoint exposes `links.prev`.",
				imageId: createId("asset:image"),
				location: "Vienna",
				duration: createTimestampRange("2026-03-01T09:00:00.000Z", "2026-03-01T17:00:00.000Z"),
				isFullDay: false,
				website: "https://example.org/events/kitchen-sink-previous",
			});
			await upsertById(tx, schema.events, {
				id: eventEntityId,
				title: "Kitchen Sink Event",
				summary: "An event with every exposed API field populated.",
				imageId: createId("asset:image"),
				location: "Vienna",
				duration: createTimestampRange("2026-04-15T09:00:00.000Z", "2026-04-17T17:00:00.000Z"),
				isFullDay: false,
				website: "https://example.org/events/kitchen-sink",
			});
			await upsertById(tx, schema.events, {
				id: nextEventEntityId,
				title: "Kitchen Sink Next Event",
				summary: "A later event so the by-slug endpoint exposes `links.next`.",
				imageId: createId("asset:image"),
				location: "Berlin",
				duration: createTimestampRange("2026-05-10T09:00:00.000Z", "2026-05-10T17:00:00.000Z"),
				isFullDay: false,
				website: "https://example.org/events/kitchen-sink-next",
			});

			await upsertById(tx, schema.pages, {
				id: pageEntityId,
				title: "Kitchen Sink Page",
				summary: "A page seeded for API contract testing.",
				imageId: createId("asset:image"),
			});
			await upsertById(tx, schema.news, {
				id: newsEntityId,
				title: "Kitchen Sink News",
				summary: "A news item seeded for API contract testing.",
				imageId: createId("asset:image"),
			});
			await upsertById(tx, schema.spotlightArticles, {
				id: spotlightEntityId,
				title: "Kitchen Sink Spotlight Article",
				summary: "A spotlight article seeded for API contract testing.",
				imageId: createId("asset:image"),
			});
			await upsertById(tx, schema.impactCaseStudies, {
				id: impactEntityId,
				title: "Kitchen Sink Impact Case Study",
				summary: "An impact case study seeded for API contract testing.",
				imageId: createId("asset:image"),
			});
			await upsertById(tx, schema.documentsPolicies, {
				id: documentPolicyEntityId,
				title: "Kitchen Sink Policy",
				summary: "A document or policy seeded for API contract testing.",
				url: "https://example.org/documents/kitchen-sink-policy",
				documentId: createId("asset:document"),
				groupId: createId("document-policy-group"),
				position: 1,
			});

			await upsertById(tx, schema.organisationalUnits, {
				id: dariahEricEntityId,
				name: "Kitchen Sink ERIC",
				acronym: "KS-ERIC",
				summary:
					"Support organisational unit for DARIAH project, working group, and membership relations.",
				metadata: { region: "Europe" },
				imageId: createId("asset:image"),
				typeId: assertLookupId(unitTypeIds.get("eric"), 'Missing organisational unit type "eric".'),
				sshocMarketplaceActorId: 9001,
			});
			await upsertById(tx, schema.organisationalUnits, {
				id: workingGroupEntityId,
				name: "Kitchen Sink Working Group",
				acronym: "KSWG",
				summary: "A working group with all fields, chairs, relations, and resources populated.",
				metadata: {
					activities: "Testing and validation",
					disciplines: "Digital humanities",
					memberTracking: "https://example.org/member-tracking",
					mailingList: "kitchen-sink-working-group@example.org",
					contactEmail: "kitchen-sink-working-group@example.org",
				},
				imageId: createId("asset:image"),
				typeId: assertLookupId(
					unitTypeIds.get("working_group"),
					'Missing organisational unit type "working_group".',
				),
				sshocMarketplaceActorId: 9002,
			});
			await upsertById(tx, schema.organisationalUnits, {
				id: governanceBodyEntityId,
				name: "Kitchen Sink Governance Body",
				acronym: "KSGB",
				summary: "A governance body with persons, relations, and social media populated.",
				metadata: { mandate: "Integration oversight" },
				imageId: createId("asset:image"),
				typeId: assertLookupId(
					unitTypeIds.get("governance_body"),
					'Missing organisational unit type "governance_body".',
				),
				sshocMarketplaceActorId: 9003,
			});
			await upsertById(tx, schema.organisationalUnits, {
				id: memberCountryEntityId,
				name: "Kitchen Sink Country",
				acronym: "KSC",
				summary: "A member country with contributors, institutions, and consortium populated.",
				metadata: { isoCode: "KS", continent: "Europe" },
				imageId: createId("asset:image"),
				typeId: assertLookupId(
					unitTypeIds.get("country"),
					'Missing organisational unit type "country".',
				),
				sshocMarketplaceActorId: 9004,
			});
			await upsertById(tx, schema.organisationalUnits, {
				id: institutionEntityId,
				name: "Kitchen Sink Institution",
				acronym: "KSI",
				summary: "An institution linked to the member country and ERIC for endpoint hydration.",
				metadata: { city: "Vienna" },
				imageId: createId("asset:image"),
				typeId: assertLookupId(
					unitTypeIds.get("institution"),
					'Missing organisational unit type "institution".',
				),
				sshocMarketplaceActorId: 9005,
			});
			await upsertById(tx, schema.organisationalUnits, {
				id: consortiumEntityId,
				name: "Kitchen Sink National Consortium",
				acronym: "KSNC",
				summary: "A national consortium linked to the member country.",
				metadata: { scope: "National coordination" },
				imageId: createId("asset:image"),
				typeId: assertLookupId(
					unitTypeIds.get("national_consortium"),
					'Missing organisational unit type "national_consortium".',
				),
				sshocMarketplaceActorId: 9006,
			});

			await upsertById(tx, schema.projects, {
				id: projectEntityId,
				metadata: { programme: "Horizon Europe", contract: "KS-2026-001" },
				name: "Kitchen Sink Project",
				acronym: "KSP",
				duration: createTimestampRange("2025-01-01T00:00:00.000Z", "2027-12-31T23:59:59.000Z"),
				funding: 1_234_567.89,
				summary:
					"A project that also qualifies as a DARIAH project and exercises all API relations.",
				call: "HORIZON-INFRA-2025",
				topic: "Interoperability and integration testing",
				imageId: createId("asset:image"),
				scopeId: assertLookupId(projectScopeIds.get("eu"), 'Missing project scope "eu".'),
			});

			const socialMediaRows = [
				{
					id: createId("social-media:website"),
					name: "Kitchen Sink Website",
					url: "https://example.org/kitchen-sink",
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
					typeId: assertLookupId(
						socialMediaTypeIds.get("website"),
						'Missing social media type "website".',
					),
				},
				{
					id: createId("social-media:linkedin"),
					name: "Kitchen Sink LinkedIn",
					url: "https://www.linkedin.com/company/kitchen-sink",
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
					typeId: assertLookupId(
						socialMediaTypeIds.get("linkedin"),
						'Missing social media type "linkedin".',
					),
				},
				{
					id: createId("social-media:mastodon"),
					name: "Kitchen Sink Mastodon",
					url: "https://social.example/@kitchen-sink",
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
					typeId: assertLookupId(
						socialMediaTypeIds.get("mastodon"),
						'Missing social media type "mastodon".',
					),
				},
			];

			for (const row of socialMediaRows) {
				await upsertById(tx, schema.socialMedia, row);
			}

			await upsertById(tx, schema.projectsToSocialMedia, {
				id: createId("project-social:website"),
				projectId: projectEntityId,
				socialMediaId: createId("social-media:website"),
			});
			await upsertById(tx, schema.projectsToSocialMedia, {
				id: createId("project-social:linkedin"),
				projectId: projectEntityId,
				socialMediaId: createId("social-media:linkedin"),
			});

			const organisationalUnitSocialLinks = [
				[dariahEricEntityId, createId("social-media:website")],
				[workingGroupEntityId, createId("social-media:website")],
				[workingGroupEntityId, createId("social-media:mastodon")],
				[governanceBodyEntityId, createId("social-media:website")],
				[governanceBodyEntityId, createId("social-media:linkedin")],
				[memberCountryEntityId, createId("social-media:website")],
				[memberCountryEntityId, createId("social-media:linkedin")],
				[institutionEntityId, createId("social-media:website")],
				[consortiumEntityId, createId("social-media:website")],
			] as const;

			for (const [organisationalUnitId, socialMediaId] of organisationalUnitSocialLinks) {
				await upsertById(tx, schema.organisationalUnitsToSocialMedia, {
					id: createId(`org-social:${organisationalUnitId}:${socialMediaId}`),
					organisationalUnitId,
					socialMediaId,
				});
			}

			await tx
				.delete(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectId, projectEntityId));
			await tx
				.delete(schema.personsToOrganisationalUnits)
				.where(
					inArray(schema.personsToOrganisationalUnits.personId, [
						kitchenSinkPersonEntityId,
						relatedPersonEntityId,
					]),
				);
			await tx
				.delete(schema.organisationalUnitsRelations)
				.where(
					inArray(schema.organisationalUnitsRelations.unitId, [
						workingGroupEntityId,
						memberCountryEntityId,
						institutionEntityId,
						consortiumEntityId,
					]),
				);

			await tx.insert(schema.organisationalUnitsRelations).values([
				{
					id: createId("relation:working-group-to-eric"),
					unitId: workingGroupEntityId,
					relatedUnitId: dariahEricEntityId,
					status: assertLookupId(
						unitStatusIds.get("is_part_of"),
						'Missing organisational unit status "is_part_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("relation:country-to-eric"),
					unitId: memberCountryEntityId,
					relatedUnitId: dariahEricEntityId,
					status: assertLookupId(
						unitStatusIds.get("is_member_of"),
						'Missing organisational unit status "is_member_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("relation:institution-to-eric"),
					unitId: institutionEntityId,
					relatedUnitId: dariahEricEntityId,
					status: assertLookupId(
						unitStatusIds.get("is_partner_institution_of"),
						'Missing organisational unit status "is_partner_institution_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("relation:institution-to-country"),
					unitId: institutionEntityId,
					relatedUnitId: memberCountryEntityId,
					status: assertLookupId(
						unitStatusIds.get("is_located_in"),
						'Missing organisational unit status "is_located_in".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("relation:consortium-to-country"),
					unitId: consortiumEntityId,
					relatedUnitId: memberCountryEntityId,
					status: assertLookupId(
						unitStatusIds.get("is_national_consortium_of"),
						'Missing organisational unit status "is_national_consortium_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
			]);

			await tx.insert(schema.personsToOrganisationalUnits).values([
				{
					id: createId("person-org:wg-chair"),
					personId: kitchenSinkPersonEntityId,
					organisationalUnitId: workingGroupEntityId,
					roleTypeId: assertLookupId(
						personRoleIds.get("is_chair_of"),
						'Missing person role type "is_chair_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("person-org:governance-president"),
					personId: kitchenSinkPersonEntityId,
					organisationalUnitId: governanceBodyEntityId,
					roleTypeId: assertLookupId(
						personRoleIds.get("is_president_of"),
						'Missing person role type "is_president_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("person-org:governance-member"),
					personId: relatedPersonEntityId,
					organisationalUnitId: governanceBodyEntityId,
					roleTypeId: assertLookupId(
						personRoleIds.get("is_member_of"),
						'Missing person role type "is_member_of".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("person-org:country-national-coordinator"),
					personId: kitchenSinkPersonEntityId,
					organisationalUnitId: memberCountryEntityId,
					roleTypeId: assertLookupId(
						personRoleIds.get("national_coordinator"),
						'Missing person role type "national_coordinator".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("person-org:country-national-representative"),
					personId: relatedPersonEntityId,
					organisationalUnitId: memberCountryEntityId,
					roleTypeId: assertLookupId(
						personRoleIds.get("national_representative"),
						'Missing person role type "national_representative".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
			]);

			await tx.insert(schema.projectsToOrganisationalUnits).values([
				{
					id: createId("project-org:coordinator-eric"),
					projectId: projectEntityId,
					unitId: dariahEricEntityId,
					roleId: assertLookupId(
						projectRoleIds.get("coordinator"),
						'Missing project role "coordinator".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("project-org:participant-institution"),
					projectId: projectEntityId,
					unitId: institutionEntityId,
					roleId: assertLookupId(
						projectRoleIds.get("participant"),
						'Missing project role "participant".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("project-org:funder-country"),
					projectId: projectEntityId,
					unitId: memberCountryEntityId,
					roleId: assertLookupId(projectRoleIds.get("funder"), 'Missing project role "funder".'),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
				{
					id: createId("project-org:participant-governance"),
					projectId: projectEntityId,
					unitId: governanceBodyEntityId,
					roleId: assertLookupId(
						projectRoleIds.get("participant"),
						'Missing project role "participant".',
					),
					duration: createTimestampRange("2025-01-01T00:00:00.000Z", null),
				},
			]);

			await tx
				.delete(schema.spotlightArticlesToPersons)
				.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, spotlightEntityId));
			await tx
				.delete(schema.impactCaseStudiesToPersons)
				.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, impactEntityId));

			await tx.insert(schema.spotlightArticlesToPersons).values([
				{
					spotlightArticleId: spotlightEntityId,
					personId: kitchenSinkPersonEntityId,
					role: "author",
				},
				{
					spotlightArticleId: spotlightEntityId,
					personId: relatedPersonEntityId,
					role: "editor",
				},
			]);
			await tx.insert(schema.impactCaseStudiesToPersons).values([
				{
					impactCaseStudyId: impactEntityId,
					personId: kitchenSinkPersonEntityId,
					role: "author",
				},
				{
					impactCaseStudyId: impactEntityId,
					personId: relatedPersonEntityId,
					role: "contributor",
				},
			]);

			const contentEntityIdsByType = new Map<
				(typeof schema.entityTypesEnum)[number],
				Array<string>
			>([
				["projects", [projectEntityId]],
				["events", [eventEntityId]],
				["pages", [pageEntityId]],
				["news", [newsEntityId]],
				["spotlight_articles", [spotlightEntityId]],
				["impact_case_studies", [impactEntityId]],
				["documents_policies", [documentPolicyEntityId]],
				["persons", [kitchenSinkPersonEntityId]],
				[
					"organisational_units",
					[workingGroupEntityId, governanceBodyEntityId, memberCountryEntityId],
				],
			]);

			const fieldsToCreate = [...contentEntityIdsByType.entries()].flatMap(
				([entityType, entityIds]) => {
					const entityTypeId = assertLookupId(
						entityTypeIds.get(entityType),
						`Missing entity type "${entityType}".`,
					);
					const fieldDefinitions = entityTypeFieldNames.get(entityTypeId) ?? [];

					return entityIds.flatMap((entityId) => {
						return fieldDefinitions.map((fieldDefinition) => {
							return {
								id: createId(`field:${entityId}:${fieldDefinition.fieldName}`),
								entityId,
								fieldNameId: fieldDefinition.id,
								fieldName: fieldDefinition.fieldName,
							};
						});
					});
				},
			);

			for (const field of fieldsToCreate) {
				await upsertById(tx, schema.fields, {
					id: field.id,
					entityId: field.entityId,
					fieldNameId: field.fieldNameId,
				});
			}

			const fieldIds = fieldsToCreate.map((field) => {
				return field.id;
			});

			if (fieldIds.length > 0) {
				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
			}

			const contentBlocks = fieldsToCreate.flatMap((field) => {
				return [
					{
						id: createId(`block:${field.id}:hero`),
						fieldId: field.id,
						typeId: assertLookupId(
							contentBlockTypeIds.get("hero"),
							'Missing content block type "hero".',
						),
						position: 1,
					},
					{
						id: createId(`block:${field.id}:image`),
						fieldId: field.id,
						typeId: assertLookupId(
							contentBlockTypeIds.get("image"),
							'Missing content block type "image".',
						),
						position: 2,
					},
					{
						id: createId(`block:${field.id}:embed`),
						fieldId: field.id,
						typeId: assertLookupId(
							contentBlockTypeIds.get("embed"),
							'Missing content block type "embed".',
						),
						position: 3,
					},
					{
						id: createId(`block:${field.id}:data`),
						fieldId: field.id,
						typeId: assertLookupId(
							contentBlockTypeIds.get("data"),
							'Missing content block type "data".',
						),
						position: 4,
					},
					{
						id: createId(`block:${field.id}:accordion`),
						fieldId: field.id,
						typeId: assertLookupId(
							contentBlockTypeIds.get("accordion"),
							'Missing content block type "accordion".',
						),
						position: 5,
					},
					{
						id: createId(`block:${field.id}:rich-text`),
						fieldId: field.id,
						typeId: assertLookupId(
							contentBlockTypeIds.get("rich_text"),
							'Missing content block type "rich_text".',
						),
						position: 6,
					},
				];
			});

			if (contentBlocks.length > 0) {
				await tx.insert(schema.contentBlocks).values(contentBlocks);
			}

			for (const field of fieldsToCreate) {
				const heroBlockId = createId(`block:${field.id}:hero`);
				const imageBlockId = createId(`block:${field.id}:image`);
				const embedBlockId = createId(`block:${field.id}:embed`);
				const dataBlockId = createId(`block:${field.id}:data`);
				const accordionBlockId = createId(`block:${field.id}:accordion`);
				const richTextBlockId = createId(`block:${field.id}:rich-text`);

				await upsertById(tx, schema.heroContentBlocks, {
					id: heroBlockId,
					title: `Kitchen Sink ${field.fieldName} Hero`,
					eyebrow: "Kitchen Sink",
					imageId: createId("asset:hero-image"),
					ctas: [
						{ label: "Primary CTA", url: "https://example.org/kitchen-sink/primary" },
						{ label: "Secondary CTA", url: "https://example.org/kitchen-sink/secondary" },
					],
				});
				await upsertById(tx, schema.imageContentBlocks, {
					id: imageBlockId,
					imageId: createId("asset:image"),
					caption: `Kitchen sink image block for ${field.fieldName}.`,
				});
				await upsertById(tx, schema.embedContentBlocks, {
					id: embedBlockId,
					url: "https://example.org/embeds/kitchen-sink",
					title: `Kitchen Sink ${field.fieldName} Embed`,
					caption: `Embedded content for ${field.fieldName}.`,
				});
				await upsertById(tx, schema.dataContentBlocks, {
					id: dataBlockId,
					typeId: assertLookupId(
						dataContentBlockTypeIds.get("events"),
						'Missing data content block type "events".',
					),
					limit: 3,
					selectedIds: null,
				});
				await upsertById(tx, schema.accordionContentBlocks, {
					id: accordionBlockId,
					items: [
						{
							title: `${field.fieldName} Question`,
							content: {
								type: "doc",
								content: [
									{
										type: "paragraph",
										content: [
											{
												type: "text",
												text: `Accordion answer for ${field.fieldName}.`,
											},
										],
									},
								],
							},
						},
					],
				});
				await upsertById(tx, schema.richTextContentBlocks, {
					id: richTextBlockId,
					content: {
						type: "doc",
						content: [
							{
								type: "heading",
								attrs: { level: 2 },
								content: [{ type: "text", text: `${field.fieldName} Heading` }],
							},
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: `Rich text content seeded for ${field.fieldName}.`,
									},
								],
							},
						],
					},
				});
			}

			const relatedEntityOwners = [
				projectEntityId,
				workingGroupEntityId,
				governanceBodyEntityId,
				memberCountryEntityId,
				eventEntityId,
				pageEntityId,
				newsEntityId,
				spotlightEntityId,
				impactEntityId,
			];

			await tx
				.delete(schema.entitiesToEntities)
				.where(inArray(schema.entitiesToEntities.entityId, relatedEntityOwners));
			await tx
				.delete(schema.entitiesToResources)
				.where(inArray(schema.entitiesToResources.entityId, relatedEntityOwners));

			await tx.insert(schema.entitiesToEntities).values(
				relatedEntityOwners.flatMap((entityId) => {
					const relatedIds = [kitchenSinkPersonEntityId, pageEntityId].filter((relatedEntityId) => {
						return relatedEntityId !== entityId;
					});

					return relatedIds.map((relatedEntityId) => {
						return { entityId, relatedEntityId };
					});
				}),
			);

			if (resourceIds.length > 0) {
				await tx.insert(schema.entitiesToResources).values(
					relatedEntityOwners.flatMap((entityId) => {
						return resourceIds.map((resourceId) => {
							return { entityId, resourceId };
						});
					}),
				);
			}
		});

		log.success('Successfully created kitchen-sink entities for slug "kitchen-sink".');
	} finally {
		await db.$client.end();
	}
}

main().catch((error: unknown) => {
	log.error("Failed to create kitchen-sink entities.\n", error);
	process.exitCode = 1;
});
