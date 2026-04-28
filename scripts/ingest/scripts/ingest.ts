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
import type { ResourceDocument, WebsiteDocument } from "@dariah-eric/search";
import { createSearchAdminService } from "@dariah-eric/search/admin";
import { Result } from "better-result";

import { env } from "../config/env.config.ts";
import { createCacheService } from "../lib/cache";
import { createCampusCurriculum, createCampusResource } from "../lib/campus";
import { createEpisciencesDocument } from "../lib/episciences";
// import { createHalItem } from "../lib/hal";
// import { createOpenAirePublication } from "../lib/openaire";
import { createSshocItem } from "../lib/sshoc";
// import { createZenodoItem } from "../lib/zenodo";
import { createZoteroItem } from "../lib/zotero";

function formatNumber(n: number) {
	return new Intl.NumberFormat("en-GB").format(n);
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
					description: item.summary,
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
					description: item.summary,
					link: `/events/${id}`,
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
					description: item.summary,
					link: `/about/impact-case-studies/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Members and partners.
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
					description: item.summary ?? "",
					link: `/network/members-and-partners/${id}`,
				};
			}),
		);
		// TODO: partner institutions / cooperating partners
		// TODO: national consortia

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
					description: item.summary,
					link: `/news/${id}`,
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
					description: item.summary,
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
					description: "",
					/** TODO: unclear where this should link to. */
					link: `/persons/${id}`,
				};
			}),
		);

		/**
		 * --------------------------------------------------------------------------------------------
		 * Projects.
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
					description: item.summary,
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
					description: item.summary,
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
					description: item.summary ?? "",
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
