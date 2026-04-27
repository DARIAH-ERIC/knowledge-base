import * as path from "node:path";

import { assert, log, pick } from "@acdh-oeaw/lib";
import { createDariahCampusClient } from "@dariah-eric/client-campus";
import { createEpisciencesClient } from "@dariah-eric/client-episciences";
// import { createHalClient } from "@dariah-eric/client-hal";
// import { createOpenAireClient } from "@dariah-eric/client-openaire";
import { createSshocClient } from "@dariah-eric/client-sshoc";
// import { createStorageAdminService } from "@dariah-eric/storage/admin";
// import { createZenodoClient } from "@dariah-eric/client-zenodo";
import { createZoteroClient } from "@dariah-eric/client-zotero";
// import { createDatabaseService } from "@dariah-eric/db";
import type { ResourceDocument, WebsiteDocument } from "@dariah-eric/search";
import { createSearchAdminService } from "@dariah-eric/search/admin";
import { Result } from "better-result";

import { env } from "../config/env.config";
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

// const db = createDatabaseService({
// 	connection: {
// 		database: env.DATABASE_NAME,
// 		host: env.DATABASE_HOST,
// 		password: env.DATABASE_PASSWORD,
// 		port: env.DATABASE_PORT,
// 		ssl: env.DATABASE_SSL_CONNECTION === "enabled",
// 		user: env.DATABASE_USER,
// 	},
// 	logger: true,
// });

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

// const storage = createStorageAdminService({
// 	config: {
// 		accessKey: env.S3_ACCESS_KEY,
// 		bucketName: env.S3_BUCKET_NAME,
// 		endpoint: `${env.S3_PROTOCOL}://${env.S3_HOST}:${env.S3_PORT}`,
// 		secretKey: env.S3_SECRET_KEY,
// 	},
// });

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
		 * OpenAIRE.
		 * ============================================================================================
		 */

		// log.info("Fetching OpenAIRE research products...");

		// const openaireProducts = yield* Result.await(
		// 	cache.getOrFetch("openaire/research-products", () =>
		// 		openaire.researchProducts.listAll({ relCommunityId: "dariah", type: "publication" }),
		// 	),
		// );

		// log.success(`Fetched ${formatNumber(openaireProducts.length)} OpenAIRE research products.`);

		/**
		 * ============================================================================================
		 * SSHOC Marketplace.
		 * ============================================================================================
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

		log.success(`Fetched ${formatNumber(sshocItems.length)} SSHOC Marketplace items.`);

		/**
		 * ============================================================================================
		 * DARIAH-Campus.
		 * ============================================================================================
		 */

		log.info("Fetching DARIAH-Campus resources...");

		const campusResources = yield* Result.await(
			cache.getOrFetch("campus/resources", () => {
				return campus.resources.listAll();
			}),
		);

		log.success(`Fetched ${formatNumber(campusResources.length)} DARIAH-Campus resources.`);

		log.info("Fetching DARIAH-Campus curricula...");

		const campusCurricula = yield* Result.await(
			cache.getOrFetch("campus/curricula", () => {
				return campus.curricula.listAll();
			}),
		);

		log.success(`Fetched ${formatNumber(campusCurricula.length)} DARIAH-Campus curricula.`);

		/**
		 * ============================================================================================
		 * Episciences (Transformations).
		 * ============================================================================================
		 */

		log.info("Fetching Episciences (Transformations) documents...");

		const episciencesDocuments = yield* Result.await(
			cache.getOrFetch("episciences/documents", () => {
				return episciences.search.listAll();
			}),
		);

		log.success(
			`Fetched ${formatNumber(episciencesDocuments.length)} Episciences (Transformations) documents.`,
		);

		/**
		 * ============================================================================================
		 * HAL.
		 * ============================================================================================
		 */

		// log.info("Fetching HAL documents...");

		// const halDocuments = yield* Result.await(
		// 	cache.getOrFetch("hal/documents", () => hal.documents.listAll()),
		// );

		// log.success(`Fetched ${formatNumber(halDocuments.length)} HAL documents.`);

		/**
		 * ============================================================================================
		 * Zenodo.
		 * ============================================================================================
		 */

		// log.info("Fetching Zenodo records...");

		// const zenodoRecords = yield* Result.await(
		// 	cache.getOrFetch("zenodo/records", () => zenodo.records.listAll()),
		// );

		// log.success(`Fetched ${formatNumber(zenodoRecords.length)} Zenodo records.`);

		/**
		 * ============================================================================================
		 * Zotero.
		 * ============================================================================================
		 */

		log.info("Fetching Zotero items...");

		const zoteroItems = yield* Result.await(
			cache.getOrFetch("zotero/items", () => {
				return zotero.items.csljson.listAll({ groupId: env.ZOTERO_GROUP_ID! });
			}),
		);

		log.success(`Fetched ${formatNumber(zoteroItems.length)} Zotero items.`);

		/**
		 * ============================================================================================
		 * Typesense ingest.
		 * ============================================================================================
		 */

		const resources: Array<ResourceDocument> = [
			...campusResources.map((item) => {
				return createCampusResource(item);
			}),
			...campusCurricula.map((item) => {
				return createCampusCurriculum(item);
			}),
			...episciencesDocuments.map((item) => {
				return createEpisciencesDocument(item);
			}),
			// ...halDocuments.map((item) => createHalItem(item)),
			// ...openaireProducts.map((item) => createOpenAirePublication(item)),
			...sshocItems.map((item) => {
				return createSshocItem(item, env.SSHOC_MARKETPLACE_BASE_URL!);
			}),
			// ...zenodoRecords.map((item) => createZenodoItem(item)),
			...zoteroItems.map((item) => {
				return createZoteroItem(item);
			}),
		];

		log.info(`Ingesting ${formatNumber(resources.length)} resources into search index...`);

		yield* Result.await(search.collections.resources.ingest(resources));

		log.success(`Ingested ${formatNumber(resources.length)} resources into search index.`);

		const website: Array<WebsiteDocument> = resources.map((resource) => {
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
		});

		log.info(`Ingesting ${formatNumber(website.length)} resources into website search index...`);

		yield* Result.await(search.collections.website.ingest(website));

		log.success(`Ingested ${formatNumber(website.length)} resources into website search index.`);

		/**
		 * ============================================================================================
		 * Database ingest.
		 * ============================================================================================
		 */

		// TODO:

		/**
		 * ============================================================================================
		 * Storage ingest.
		 * ============================================================================================
		 */

		// TODO:

		return Result.ok();
	});

	if (result.isErr()) {
		throw result.error;
	}

	log.success("Successfully ingested data.");
}

main().catch((error: unknown) => {
	log.error("Failed to ingest data.\n", error);
	process.exitCode = 1;
});
// // oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
// .finally(() => db.$client.close());
