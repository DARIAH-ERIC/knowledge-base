import { assert, log } from "@acdh-oeaw/lib";
import { faker } from "@faker-js/faker";
import { Client } from "typesense";

import { env } from "../config/env.config";
import { collection, type CollectionDocument } from "../src/schema";

function createClient() {
	const apiKey = env.TYPESENSE_ADMIN_API_KEY;
	assert(apiKey, "Missing `TYPESENSE_ADMIN_API_KEY` environment variable.");

	const client = new Client({
		apiKey,
		connectionTimeoutSeconds: 3,
		nodes: [
			{
				host: env.NEXT_PUBLIC_TYPESENSE_HOST,
				port: env.NEXT_PUBLIC_TYPESENSE_PORT,
				protocol: env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
			},
		],
	});

	return client;
}

function generateDocuments() {
	faker.seed(42);
	faker.setDefaultRefDate(new Date(Date.UTC(2025, 0, 1)));

	const kinds = ["publication", "tool-or-service", "training-material", "workflow"] as const;

	const documents = faker.helpers.multiple<CollectionDocument>(
		() => {
			const kind = faker.helpers.arrayElement(kinds);

			const document = {
				id: faker.string.uuid(),
				imported_at: faker.date.past().getTime(),
				label: faker.lorem.sentence(),
				description: faker.lorem.paragraphs(2, "\n\n"),
				keywords: faker.helpers.multiple(
					() => {
						return faker.lorem.word();
					},
					{ count: { min: 3, max: 8 } },
				),
				links: faker.helpers.multiple(
					() => {
						return faker.internet.url();
					},
					{ count: { min: 1, max: 3 } },
				),
			} satisfies Partial<CollectionDocument>;

			switch (kind) {
				case "publication": {
					return {
						...document,
						kind,
						source: faker.helpers.arrayElement(["open-aire", "zotero"]),
						source_id: faker.string.alphanumeric(12),
						type: faker.helpers.arrayElement(["article", "book", "conference", "thesis", null]),
						authors: faker.helpers.multiple(
							() => {
								return faker.person.fullName();
							},
							{ count: { min: 1, max: 5 } },
						),
						year: faker.number.int({ min: 1990, max: 2024 }),
						pid:
							faker.helpers.maybe(
								() => {
									return faker.string.alphanumeric(10);
								},
								{ probability: 0.7 },
							) ?? null,
					};
				}

				case "tool-or-service": {
					return {
						...document,
						kind,
						source: "ssh-open-marketplace",
						source_id: faker.string.alphanumeric(12),
						type: faker.helpers.arrayElement(["community", "core"]),
					};
				}

				case "training-material": {
					return {
						...document,
						kind,
						source: "ssh-open-marketplace",
						source_id: faker.string.alphanumeric(12),
					};
				}

				case "workflow": {
					return {
						...document,
						kind,
						source: "ssh-open-marketplace",
						source_id: faker.string.alphanumeric(12),
					};
				}
			}
		},
		{ count: 100 },
	);

	return documents;
}

async function seed() {
	const client = createClient();

	const documents = generateDocuments();

	await client.collections(collection.name).documents().delete({ truncate: true });

	await client.collections(collection.name).documents().import(documents);
}

async function main() {
	await seed();

	log.success("Successfully seeded documents into typesense search index.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed documents into typesense search index.\n", error);
	process.exitCode = 1;
});
