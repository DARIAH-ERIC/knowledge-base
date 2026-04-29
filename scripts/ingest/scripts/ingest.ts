import * as path from "node:path";

import { assert, log, pick } from "@acdh-oeaw/lib";
import { createDariahCampusClient } from "@dariah-eric/client-campus";
import { createEpisciencesClient } from "@dariah-eric/client-episciences";
// import { createHalClient } from "@dariah-eric/client-hal";
// import { createOpenAireClient } from "@dariah-eric/client-openaire";
import { createSshocClient } from "@dariah-eric/client-sshoc";
// import { createZenodoClient } from "@dariah-eric/client-zenodo";
import { createZoteroClient } from "@dariah-eric/client-zotero";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { alias, and, eq, inArray, sql } from "@dariah-eric/database/sql";
import type { ResourceDocument, WebsiteDocument } from "@dariah-eric/search";
import { createSearchAdminService } from "@dariah-eric/search/admin";
import { Result } from "better-result";

import { env } from "../config/env.config.ts";
import { createCacheService } from "../lib/cache";
import { createCampusCurriculum, createCampusResource } from "../lib/campus";
import { createEpisciencesDocument } from "../lib/episciences";
import { toPlainText as jsonContentToPlainText } from "../lib/json-content/to-plain-text";
// import { createHalItem } from "../lib/hal";
// import { createOpenAirePublication } from "../lib/openaire";
import { createSshocItem } from "../lib/sshoc";
// import { createZenodoItem } from "../lib/zenodo";
import { createZoteroItem } from "../lib/zotero";

function formatNumber(n: number) {
	return new Intl.NumberFormat("en-GB").format(n);
}

function mergeDescription(...values: Array<string | null | undefined>): string {
	const parts = values
		.map((value) => {
			return value?.trim();
		})
		.filter((value): value is string => {
			return value != null && value.length > 0;
		});

	return [...new Set(parts)].join("\n\n");
}

async function getPlainTextFieldContentByEntityId(
	entityIds: Array<string>,
	fieldName: string,
): Promise<Map<string, string>> {
	if (entityIds.length === 0) {
		return new Map();
	}

	const rows = await db
		.select({
			entityId: schema.fields.entityId,
			content: schema.richTextContentBlocks.content,
			position: schema.contentBlocks.position,
		})
		.from(schema.fields)
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
		)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.fieldId, schema.fields.id))
		.innerJoin(
			schema.contentBlockTypes,
			eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
		)
		.innerJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.where(
			and(
				inArray(schema.fields.entityId, entityIds),
				eq(schema.entityTypesFieldsNames.fieldName, fieldName),
				eq(schema.contentBlockTypes.type, "rich_text"),
			),
		)
		.orderBy(schema.fields.entityId, schema.contentBlocks.position);

	const contentByEntityId = new Map<string, Array<string>>();

	for (const row of rows) {
		const content = jsonContentToPlainText(row.content);

		if (content.length === 0) {
			continue;
		}

		const existing = contentByEntityId.get(row.entityId) ?? [];
		existing.push(content);
		contentByEntityId.set(row.entityId, existing);
	}

	return new Map(
		[...contentByEntityId.entries()].map(([entityId, parts]) => {
			return [entityId, mergeDescription(...parts)];
		}),
	);
}

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		ssl: env.DATABASE_SSL_CONNECTION === "enabled",
		user: env.DATABASE_USER,
	},
	logger: true,
}).unwrap();

const search = createSearchAdminService({
	apiKey: env.TYPESENSE_ADMIN_API_KEY,
	collections: {
		resources: env.TYPESENSE_RESOURCE_COLLECTION_NAME,
		website: env.TYPESENSE_WEBSITE_COLLECTION_NAME,
	},
	nodes: [
		{
			host: env.TYPESENSE_HOST,
			port: env.TYPESENSE_PORT,
			protocol: env.TYPESENSE_PROTOCOL,
		},
	],
});

assert(env.CAMPUS_API_BASE_URL, "Missing environment variable: `CAMPUS_API_BASE_URL`.");

const campus = createDariahCampusClient({
	config: {
		baseUrl: env.CAMPUS_API_BASE_URL,
	},
});

assert(env.EPISCIENCES_API_BASE_URL, "Missing environment variable: `EPISCIENCES_API_BASE_URL`.");

const episciences = createEpisciencesClient({
	config: {
		baseUrl: env.EPISCIENCES_API_BASE_URL,
	},
});

// assert(env.OPENAIRE_API_BASE_URL, "Missing environment variable: `OPENAIRE_API_BASE_URL`.");

// const openaire = createOpenAireClient({
// 	config: {
// 		baseUrl: env.OPENAIRE_API_BASE_URL,
// 	},
// });

// assert(env.HAL_API_BASE_URL, "Missing environment variable: `HAL_API_BASE_URL`.");

// const hal = createHalClient({
// 	baseUrl: env.HAL_API_BASE_URL,
// });

assert(
	env.SSHOC_MARKETPLACE_API_BASE_URL,
	"Missing environment variable: `SSHOC_MARKETPLACE_API_BASE_URL`.",
);
assert(
	env.SSHOC_MARKETPLACE_BASE_URL,
	"Missing environment variable: `SSHOC_MARKETPLACE_BASE_URL`.",
);

const sshoc = createSshocClient({
	config: {
		baseUrl: env.SSHOC_MARKETPLACE_API_BASE_URL,
	},
});

// assert(env.ZENODO_API_BASE_URL, "Missing environment variable: `ZENODO_API_BASE_URL`.");

// const zenodo = createZenodoClient({
// 	baseUrl: env.ZENODO_API_BASE_URL,
// });

assert(env.ZOTERO_API_BASE_URL, "Missing environment variable: `ZOTERO_API_BASE_URL`.");
// assert(env.ZOTERO_API_KEY, "Missing environment variable: `ZOTERO_API_KEY`.");
assert(env.ZOTERO_GROUP_ID, "Missing environment variable: `ZOTERO_GROUP_ID`.");

const zotero = createZoteroClient({
	config: {
		apiKey: env.ZOTERO_API_KEY,
		baseUrl: env.ZOTERO_API_BASE_URL,
	},
});

const cache = createCacheService({
	cacheDir: path.join(process.cwd(), ".cache"),
});

async function main() {
	const result = await Result.gen(async function* () {
		/**
		 * ============================================================================================
		 * Search index: resources collection.
		 * ============================================================================================
		 */

		const resources: Array<ResourceDocument> = [];

		/**
		 * --------------------------------------------------------------------------------------------
		 * OpenAIRE.
		 * --------------------------------------------------------------------------------------------
		 */

		// log.info("Fetching OpenAIRE research products...");

		// const openaireProducts = yield* Result.await(
		// 	cache.getOrFetch("openaire/research-products", () =>
		// 		openaire.researchProducts.listAll({ relCommunityId: "dariah", type: "publication" }),
		// 	),
		// );

		// resources.push(...openaireProducts.map((item) => createOpenAirePublication(item)))

		// log.success(`Fetched ${formatNumber(openaireProducts.length)} OpenAIRE research products.`);

		/**
		 * --------------------------------------------------------------------------------------------
		 * SSHOC Marketplace.
		 * --------------------------------------------------------------------------------------------
		 */

		log.info("Fetching SSHOC Marketplace items...");

		const sshocItems = yield* Result.await(
			cache.getOrFetch("sshoc/items", () => {
				return sshoc.items.searchAll({
					"f.keyword": ["DARIAH Resource"],
					categories: ["tool-or-service", "training-material", "workflow"],
					order: ["label"],
				});
			}),
		);

		resources.push(
			...sshocItems.map((item) => {
				return createSshocItem(item, env.SSHOC_MARKETPLACE_BASE_URL!);
			}),
		);

		log.success(`Fetched ${formatNumber(sshocItems.length)} SSHOC Marketplace items.`);

		/**
		 * --------------------------------------------------------------------------------------------
		 * DARIAH-Campus.
		 * --------------------------------------------------------------------------------------------
		 */

		log.info("Fetching DARIAH-Campus resources...");

		const campusResources = yield* Result.await(
			cache.getOrFetch("campus/resources", () => {
				return campus.resources.listAll();
			}),
		);

		resources.push(
			...campusResources.map((item) => {
				return createCampusResource(item);
			}),
		);

		log.success(`Fetched ${formatNumber(campusResources.length)} DARIAH-Campus resources.`);

		log.info("Fetching DARIAH-Campus curricula...");

		const campusCurricula = yield* Result.await(
			cache.getOrFetch("campus/curricula", () => {
				return campus.curricula.listAll();
			}),
		);

		resources.push(
			...campusCurricula.map((item) => {
				return createCampusCurriculum(item);
			}),
		);

		log.success(`Fetched ${formatNumber(campusCurricula.length)} DARIAH-Campus curricula.`);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Episciences (Transformations).
		 * --------------------------------------------------------------------------------------------
		 */

		log.info("Fetching Episciences (Transformations) documents...");

		const episciencesDocuments = yield* Result.await(
			cache.getOrFetch("episciences/documents", () => {
				return episciences.search.listAll();
			}),
		);

		resources.push(
			...episciencesDocuments.map((item) => {
				return createEpisciencesDocument(item);
			}),
		);

		log.success(
			`Fetched ${formatNumber(episciencesDocuments.length)} Episciences (Transformations) documents.`,
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * HAL.
		 * --------------------------------------------------------------------------------------------
		 */

		// log.info("Fetching HAL documents...");

		// const halDocuments = yield* Result.await(
		// 	cache.getOrFetch("hal/documents", () => hal.documents.listAll()),
		// );

		// resources.push(...halDocuments.map((item) => createHalItem(item)))

		// log.success(`Fetched ${formatNumber(halDocuments.length)} HAL documents.`);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Zenodo.
		 * --------------------------------------------------------------------------------------------
		 */

		// log.info("Fetching Zenodo records...");

		// const zenodoRecords = yield* Result.await(
		// 	cache.getOrFetch("zenodo/records", () => zenodo.records.listAll()),
		// );

		// resources.push(...zenodoRecords.map((item) => {return createZenodoItem(item)}))

		// log.success(`Fetched ${formatNumber(zenodoRecords.length)} Zenodo records.`);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Zotero.
		 * --------------------------------------------------------------------------------------------
		 */

		log.info("Fetching Zotero items...");

		const zoteroItems = yield* Result.await(
			cache.getOrFetch("zotero/items", () => {
				return zotero.items.listAll({ groupId: env.ZOTERO_GROUP_ID! });
			}),
		);

		resources.push(
			...zoteroItems.map((item) => {
				return createZoteroItem(item);
			}),
		);

		log.success(`Fetched ${formatNumber(zoteroItems.length)} Zotero items.`);

		/**
		 * ============================================================================================
		 * Website.
		 * ============================================================================================
		 */

		const website: Array<WebsiteDocument> = [];

		website.push(
			...resources.map((resource) => {
				return Object.assign(
					{ kind: `resource` as const },
					pick(resource, [
						`id`,
						`source`,
						`source_id`,
						`imported_at`,
						`type`,
						`label`,
						`description`,
					]),
					{ link: resource.links[0] },
				);
			}),
		);

		const importedAt = Date.now();

		/**
		 * --------------------------------------------------------------------------------------------
		 * Documents and policies.
		 * --------------------------------------------------------------------------------------------
		 */

		const documentsPolicies = await db.query.documentsPolicies.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const documentsPoliciesContentById = await getPlainTextFieldContentByEntityId(
			documentsPolicies.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...documentsPolicies.map((item): WebsiteDocument => {
				const type = "document-or-policy";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, documentsPoliciesContentById.get(item.id)),
					/** All documents are listed on the same page. */
					link: `/about/documents`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Events.
		 * --------------------------------------------------------------------------------------------
		 */

		const events = await db.query.events.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const eventsContentById = await getPlainTextFieldContentByEntityId(
			events.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...events.map((item): WebsiteDocument => {
				const type = "event";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, eventsContentById.get(item.id)),
					link: `/events/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Funding calls.
		 * --------------------------------------------------------------------------------------------
		 */

		const fundingCalls = await db.query.fundingCalls.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const fundingCallsContentById = await getPlainTextFieldContentByEntityId(
			fundingCalls.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...fundingCalls.map((item): WebsiteDocument => {
				const type = "funding-call";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, fundingCallsContentById.get(item.id)),
					link: `/funding-calls/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Impact case studies.
		 * --------------------------------------------------------------------------------------------
		 */

		const impactCaseStudies = await db.query.impactCaseStudies.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const impactCaseStudiesContentById = await getPlainTextFieldContentByEntityId(
			impactCaseStudies.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...impactCaseStudies.map((item): WebsiteDocument => {
				const type = "impact-case-study";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, impactCaseStudiesContentById.get(item.id)),
					link: `/about/impact-case-studies/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Member and partner countries.
		 * --------------------------------------------------------------------------------------------
		 */

		const membersAndPartners = await db.query.membersAndPartners.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const membersAndPartnersDescriptionById = await getPlainTextFieldContentByEntityId(
			membersAndPartners.map((item) => {
				return item.id;
			}),
			"description",
		);

		website.push(
			...membersAndPartners.map((item): WebsiteDocument => {
				const type = "country";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.name,
					description: mergeDescription(
						item.summary,
						membersAndPartnersDescriptionById.get(item.id),
					),
					link: `/network/members-and-partners/${id}`,
				};
			}),
		);

		const countryEntities = alias(schema.entities, "country_entities");
		const itemEntities = alias(schema.entities, "item_entities");
		const organisationalRelationStatus = alias(
			schema.organisationalUnitStatus,
			"organisational_relation_status",
		);
		const organisationalUnitType = alias(
			schema.organisationalUnitTypes,
			"organisational_unit_type",
		);
		const publishedEntityStatus = alias(schema.entityStatus, "published_entity_status");

		const nationalConsortia = await db
			.select({
				entityId: schema.organisationalUnits.id,
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.organisationalUnits.name,
				description: schema.organisationalUnits.summary,
				sourceUpdatedAt: schema.organisationalUnits.updatedAt,
			})
			.from(schema.organisationalUnits)
			.innerJoin(itemEntities, eq(schema.organisationalUnits.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				organisationalUnitType,
				eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
			)
			.innerJoin(
				schema.organisationalUnitsRelations,
				eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				organisationalRelationStatus,
				eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					eq(organisationalUnitType.type, "national_consortium"),
					eq(organisationalRelationStatus.status, "is_national_consortium_of"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
				),
			);

		const nationalConsortiaDescriptionById = await getPlainTextFieldContentByEntityId(
			nationalConsortia.map((item) => {
				return item.entityId;
			}),
			"description",
		);

		website.push(
			...nationalConsortia.map((item): WebsiteDocument => {
				const type = "national-consortium";
				const id = `${item.countrySlug}:${item.itemSlug}`;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: item.itemSlug,
					source_updated_at: item.sourceUpdatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.label,
					description: mergeDescription(
						item.description,
						nationalConsortiaDescriptionById.get(item.entityId),
					),
					link: `/network/members-and-partners/${item.countrySlug}`,
				};
			}),
		);

		const partnerInstitutions = await db
			.select({
				entityId: schema.organisationalUnits.id,
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.organisationalUnits.name,
				description: schema.organisationalUnits.summary,
				sourceUpdatedAt: schema.organisationalUnits.updatedAt,
			})
			.from(schema.organisationalUnits)
			.innerJoin(itemEntities, eq(schema.organisationalUnits.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				organisationalUnitType,
				eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
			)
			.innerJoin(
				schema.organisationalUnitsRelations,
				eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				organisationalRelationStatus,
				eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					eq(organisationalUnitType.type, "institution"),
					eq(organisationalRelationStatus.status, "is_located_in"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
					sql`
						EXISTS (
							SELECT
								1
							FROM
								${schema.organisationalUnitsRelations} partner_relations
								INNER JOIN ${schema.organisationalUnitStatus} partner_relation_status ON partner_relations.status = partner_relation_status.id
								INNER JOIN ${schema.organisationalUnits} related_units ON partner_relations.related_unit_id = related_units.id
								INNER JOIN ${schema.organisationalUnitTypes} related_unit_types ON related_units.type_id = related_unit_types.id
							WHERE
								partner_relations.unit_id = ${schema.organisationalUnits.id}
								AND partner_relation_status.status = 'is_partner_institution_of'
								AND related_unit_types.type = 'eric'
								AND partner_relations.duration @> NOW()::TIMESTAMPTZ
						)
					`,
				),
			);

		const partnerInstitutionsDescriptionById = await getPlainTextFieldContentByEntityId(
			partnerInstitutions.map((item) => {
				return item.entityId;
			}),
			"description",
		);

		website.push(
			...partnerInstitutions.map((item): WebsiteDocument => {
				const type = "institution";
				const id = `${item.countrySlug}:${item.itemSlug}`;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: item.itemSlug,
					source_updated_at: item.sourceUpdatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.label,
					description: mergeDescription(
						item.description,
						partnerInstitutionsDescriptionById.get(item.entityId),
					),
					link: `/network/members-and-partners/${item.countrySlug}`,
				};
			}),
		);

		const cooperatingPartnerInstitutions = await db
			.select({
				entityId: schema.organisationalUnits.id,
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.organisationalUnits.name,
				description: schema.organisationalUnits.summary,
				sourceUpdatedAt: schema.organisationalUnits.updatedAt,
			})
			.from(schema.organisationalUnits)
			.innerJoin(itemEntities, eq(schema.organisationalUnits.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				organisationalUnitType,
				eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
			)
			.innerJoin(
				schema.organisationalUnitsRelations,
				eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				organisationalRelationStatus,
				eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					eq(organisationalUnitType.type, "institution"),
					eq(organisationalRelationStatus.status, "is_located_in"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
					sql`
						EXISTS (
							SELECT
								1
							FROM
								${schema.organisationalUnitsRelations} cooperating_relations
								INNER JOIN ${schema.organisationalUnitStatus} cooperating_relation_status ON cooperating_relations.status = cooperating_relation_status.id
								INNER JOIN ${schema.organisationalUnits} related_units ON cooperating_relations.related_unit_id = related_units.id
								INNER JOIN ${schema.organisationalUnitTypes} related_unit_types ON related_units.type_id = related_unit_types.id
							WHERE
								cooperating_relations.unit_id = ${schema.organisationalUnits.id}
								AND cooperating_relation_status.status = 'is_cooperating_partner_of'
								AND related_unit_types.type = 'eric'
								AND cooperating_relations.duration @> NOW()::TIMESTAMPTZ
						)
					`,
				),
			);

		const cooperatingPartnerInstitutionsDescriptionById = await getPlainTextFieldContentByEntityId(
			cooperatingPartnerInstitutions.map((item) => {
				return item.entityId;
			}),
			"description",
		);

		website.push(
			...cooperatingPartnerInstitutions.map((item): WebsiteDocument => {
				const type = "institution";
				const id = `${item.countrySlug}:${item.itemSlug}`;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: item.itemSlug,
					source_updated_at: item.sourceUpdatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.label,
					description: mergeDescription(
						item.description,
						cooperatingPartnerInstitutionsDescriptionById.get(item.entityId),
					),
					link: `/network/members-and-partners/${item.countrySlug}`,
				};
			}),
		);

		const personRoleType = alias(schema.personRoleTypes, "person_role_type");

		const countryContributors = await db
			.select({
				entityId: schema.persons.id,
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.persons.name,
				sourceUpdatedAt: schema.persons.updatedAt,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.persons,
				eq(schema.personsToOrganisationalUnits.personId, schema.persons.id),
			)
			.innerJoin(itemEntities, eq(schema.persons.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				personRoleType,
				eq(schema.personsToOrganisationalUnits.roleTypeId, personRoleType.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.personsToOrganisationalUnits.organisationalUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					inArray(personRoleType.type, [
						"national_coordinator",
						"national_coordinator_deputy",
						"national_representative",
						"national_representative_deputy",
					]),
					sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
				),
			);

		const countryContributorsBiographyById = await getPlainTextFieldContentByEntityId(
			countryContributors.map((item) => {
				return item.entityId;
			}),
			"biography",
		);

		const contributorDocumentsById = new Map<string, WebsiteDocument>();

		for (const item of countryContributors) {
			const type = "person";
			const id = `${item.countrySlug}:${item.itemSlug}`;

			/**
			 * FIXME: These persons are also ingested from the persons table below.
			 * We still need to decide whether person search matches should link to the country page,
			 * the person page, or both.
			 */
			contributorDocumentsById.set(id, {
				kind: "entity",
				source: "dariah-knowledge-base",
				source_id: item.itemSlug,
				source_updated_at: item.sourceUpdatedAt.getTime(),
				imported_at: importedAt,
				type,
				id: [type, id].join(":"),
				label: item.label,
				description: mergeDescription(countryContributorsBiographyById.get(item.entityId)),
				link: `/network/members-and-partners/${item.countrySlug}`,
			});
		}

		website.push(...contributorDocumentsById.values());

		/**
		 * --------------------------------------------------------------------------------------------
		 * News.
		 * --------------------------------------------------------------------------------------------
		 */

		const news = await db.query.news.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const newsContentById = await getPlainTextFieldContentByEntityId(
			news.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...news.map((item): WebsiteDocument => {
				const type = "news-item";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, newsContentById.get(item.id)),
					link: `/news/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Opportunities.
		 * --------------------------------------------------------------------------------------------
		 */

		const opportunities = await db.query.opportunities.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const opportunitiesContentById = await getPlainTextFieldContentByEntityId(
			opportunities.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...opportunities.map((item): WebsiteDocument => {
				const type = "opportunity";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, opportunitiesContentById.get(item.id)),
					link: `/opportunities/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Pages.
		 * --------------------------------------------------------------------------------------------
		 */

		const pages = await db.query.pages.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const pagesContentById = await getPlainTextFieldContentByEntityId(
			pages.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...pages.map((item): WebsiteDocument => {
				const type = "page";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, pagesContentById.get(item.id)),
					link: `/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Persons.
		 * --------------------------------------------------------------------------------------------
		 */

		const persons = await db.query.persons.findMany({
			columns: {
				id: true,
				name: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const personsBiographyById = await getPlainTextFieldContentByEntityId(
			persons.map((item) => {
				return item.id;
			}),
			"biography",
		);

		website.push(
			...persons.map((item): WebsiteDocument => {
				const type = "person";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.name,
					description: mergeDescription(personsBiographyById.get(item.id)),
					/** FIXME: unclear where this should link to. */
					link: `/persons/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Projects (DARIAH).
		 * --------------------------------------------------------------------------------------------
		 */

		const dariahProjects = await db.query.dariahProjects.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const dariahProjectsDescriptionById = await getPlainTextFieldContentByEntityId(
			dariahProjects.map((item) => {
				return item.id;
			}),
			"description",
		);

		website.push(
			...dariahProjects.map((item): WebsiteDocument => {
				const type = "project";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.name,
					description: mergeDescription(item.summary, dariahProjectsDescriptionById.get(item.id)),
					link: `/projects/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Spotlight articles.
		 * --------------------------------------------------------------------------------------------
		 */

		const spotlightArticles = await db.query.spotlightArticles.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const spotlightArticlesContentById = await getPlainTextFieldContentByEntityId(
			spotlightArticles.map((item) => {
				return item.id;
			}),
			"content",
		);

		website.push(
			...spotlightArticles.map((item): WebsiteDocument => {
				const type = "spotlight-article";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.title,
					description: mergeDescription(item.summary, spotlightArticlesContentById.get(item.id)),
					link: `/spotlights/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Working groups.
		 * --------------------------------------------------------------------------------------------
		 */

		const workingGroups = await db.query.workingGroups.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		const workingGroupsDescriptionById = await getPlainTextFieldContentByEntityId(
			workingGroups.map((item) => {
				return item.id;
			}),
			"description",
		);

		website.push(
			...workingGroups.map((item): WebsiteDocument => {
				const type = "working-group";
				const id = item.entity.slug;

				return {
					kind: "entity",
					source: "dariah-knowledge-base",
					source_id: id,
					source_updated_at: item.updatedAt.getTime(),
					imported_at: importedAt,
					type,
					id: [type, id].join(":"),
					label: item.name,
					description: mergeDescription(item.summary, workingGroupsDescriptionById.get(item.id)),
					link: `/network/working-groups/${id}`,
				};
			}),
		);

		/**
		 * ============================================================================================
		 * Typesense ingest.
		 * ============================================================================================
		 */

		log.info(`Ingesting ${formatNumber(resources.length)} resources into search index...`);

		yield* Result.await(search.collections.resources.ingest(resources));

		log.success(`Ingested ${formatNumber(resources.length)} resources into search index.`);

		log.info(`Ingesting ${formatNumber(website.length)} resources into website search index...`);

		yield* Result.await(search.collections.website.ingest(website));

		log.success(`Ingested ${formatNumber(website.length)} resources into website search index.`);

		return Result.ok();
	});

	if (result.isErr()) {
		throw result.error;
	}

	log.success("Successfully ingested data.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to ingest data.\n", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end();
	});
