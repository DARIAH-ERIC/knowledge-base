import { assert, log } from "@acdh-oeaw/lib";
import { faker as f } from "@faker-js/faker";
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
	f.seed(42);
	f.setDefaultRefDate(new Date(Date.UTC(2025, 0, 1)));

	const kinds = ["publication", "tool-or-service", "training-material", "workflow"] as const;

	const documents = f.helpers.multiple<CollectionDocument>(
		() => {
			const kind = f.helpers.arrayElement(kinds);

			const document = {
				id: f.string.uuid(),
				imported_at: f.date.past().getTime(),
				label: f.lorem.sentence(),
				description: f.lorem.paragraphs(2, "\n\n"),
				keywords: f.helpers.multiple(
					() => {
						return f.lorem.word();
					},
					{ count: { min: 3, max: 8 } },
				),
				links: f.helpers.multiple(
					() => {
						return f.internet.url();
					},
					{ count: { min: 1, max: 3 } },
				),
			} satisfies Partial<CollectionDocument>;

			switch (kind) {
				case "publication": {
					return {
						...document,
						kind,
						source: f.helpers.arrayElement(["open-aire", "zotero"]),
						source_id: f.string.alphanumeric(12),
						type: f.helpers.arrayElement(["article", "book", "conference", "thesis", null]),
						authors: f.helpers.multiple(
							() => {
								return f.person.fullName();
							},
							{ count: { min: 1, max: 5 } },
						),
						year: f.number.int({ min: 1990, max: 2024 }),
						pid:
							f.helpers.maybe(
								() => {
									return f.string.alphanumeric(10);
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
						source_id: f.string.alphanumeric(12),
						type: f.helpers.arrayElement(["community", "core"]),
						actor_ids: f.helpers.multiple(
							() => {
								return f.string.alphanumeric(12);
							},
							{ count: { min: 1, max: 3 } },
						),
					};
				}

				case "training-material": {
					return {
						...document,
						kind,
						source: "ssh-open-marketplace",
						source_id: f.string.alphanumeric(12),
						actor_ids: f.helpers.multiple(
							() => {
								return f.string.alphanumeric(12);
							},
							{ count: { min: 1, max: 3 } },
						),
					};
				}

				case "workflow": {
					return {
						...document,
						kind,
						source: "ssh-open-marketplace",
						source_id: f.string.alphanumeric(12),
						actor_ids: f.helpers.multiple(
							() => {
								return f.string.alphanumeric(12);
							},
							{ count: { min: 1, max: 3 } },
						),
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
