import { assert, log } from "@acdh-oeaw/lib";
import { faker as f } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/node-postgres";
import { reset } from "drizzle-seed";

import { env } from "../config/env.config";
import * as schema from "../src/schema";

async function main() {
	f.seed(42);
	f.setDefaultRefDate(new Date(Date.UTC(2025, 0, 1)));

	const db = drizzle({
		casing: "snake_case",
		connection: {
			database: env.DATABASE_NAME,
			host: env.DATABASE_HOST,
			password: env.DATABASE_PASSWORD,
			port: env.DATABASE_PORT,
			ssl: env.DATABASE_SSL_CONNECTION === "enabled",
			user: env.DATABASE_USER,
		},
		logger: true,
	});

	await reset(db, schema);

	const users = f.helpers.multiple(
		() => {
			return { username: f.internet.username(), email: f.internet.email() };
		},
		{ count: 10 },
	);

	const _userIds = await db.insert(schema.users).values(users).returning({ id: schema.users.id });

	const licenses = [
		{ name: "CC0-1.0", url: "https://choosealicense.com/licenses/cc0-1.0/" },
		{ name: "CC-BY-4.0", url: "https://choosealicense.com/licenses/cc-by-4.0/" },
		{ name: "CC-BY-SA-4.0", url: "https://choosealicense.com/licenses/cc-by-sa-4.0/" },
	];

	const licenseIds = await db
		.insert(schema.licenses)
		.values(licenses)
		.returning({ id: schema.licenses.id });

	const assets = f.helpers.multiple(
		() => {
			return {
				// TODO: should use actual s3 object keys from our object store.
				key: f.string.alphanumeric(12),
				licenseId: f.helpers.arrayElement(licenseIds).id,
			};
		},
		{ count: 100 },
	);

	const assetIds = await db
		.insert(schema.assets)
		.values(assets)
		.returning({ id: schema.assets.id });

	const events = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				location: f.location.city(),
				startDate: f.date.past({ years: 5 }),
				endDate: f.helpers.maybe(
					() => {
						return f.date.past();
					},
					{ probability: 0.25 },
				),
				website: f.helpers.maybe(
					() => {
						return f.internet.url();
					},
					{ probability: 0.75 },
				),
				slug: f.helpers.slugify(title),
				// FIXME:
				documentId: f.string.uuid(),
			};
		},
		{ count: 25 },
	);

	const eventIds = await db
		.insert(schema.events)
		.values(events)
		.returning({ id: schema.events.id });

	const news = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				slug: f.helpers.slugify(title),
				// FIXME:
				documentId: f.string.uuid(),
			};
		},
		{ count: 25 },
	);

	const newsItemIds = await db.insert(schema.news).values(news).returning({ id: schema.news.id });

	const entities = [
		...eventIds.map(({ id }) => {
			return {
				entityId: id,
				entityType: "events" as const,
				documentId: f.string.uuid(),
				status: "draft" as const,
			};
		}),
		...newsItemIds.map(({ id }) => {
			return {
				entityId: id,
				entityType: "news" as const,
				documentId: f.string.uuid(),
				status: "draft" as const,
			};
		}),
	];

	// TODO: this should work automatically via database trigger
	const entityIds = await db
		.insert(schema.entities)
		.values(entities)
		.returning({ id: schema.entities.id });

	const fields = entityIds.map(({ id }) => {
		return { entityId: id, name: "content" };
	});

	const fieldIds = await db
		.insert(schema.fields)
		.values(fields)
		.returning({ id: schema.fields.id });

	const imageContentBlocks = f.helpers.multiple(
		() => {
			return {
				imageId: f.helpers.arrayElement(assetIds).id,
				caption: f.helpers.maybe(
					() => {
						return f.lorem.sentence();
					},
					{ probability: 0.5 },
				),
			};
		},
		{ count: 50 },
	);

	const imageContentBlockIds = await db
		.insert(schema.imageContentBlocks)
		.values(imageContentBlocks)
		.returning({ id: schema.imageContentBlocks.id });

	const richTextContentBlocks = f.helpers.multiple(
		() => {
			return {
				content: JSON.stringify({ hello: "world" }),
			};
		},
		{ count: 50 },
	);

	const richTextContentBlockIds = await db
		.insert(schema.richTextContentBlocks)
		.values(richTextContentBlocks)
		.returning({ id: schema.richTextContentBlocks.id });

	const contentBlocks = fieldIds.flatMap(({ id }, index) => {
		const imageContentBlock = imageContentBlockIds[index];
		assert(imageContentBlock, "Missing image content block.");

		const richTextContentBlock = richTextContentBlockIds[index];
		assert(richTextContentBlock, "Missing rich-text content block.");

		return [
			{
				id: imageContentBlock.id,
				fieldId: id,
				position: 1,
				type: "image" as const,
			},
			{
				id: richTextContentBlock.id,
				fieldId: id,
				position: 2,
				type: "rich_text" as const,
			},
		];
	});

	const _contentBlockIds = await db
		.insert(schema.contentBlocks)
		.values(contentBlocks)
		.returning({ id: schema.contentBlocks.id });

	log.success("Successfully seeded database.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed database.\n", error);
	process.exitCode = 1;
});
