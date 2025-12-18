import { groupBy, log } from "@acdh-oeaw/lib";
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
			return {
				username: f.internet.username(),
				email: f.internet.email(),
			};
		},
		{ count: 10 },
	);

	await db.insert(schema.users).values(users);

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
		{ count: 225 },
	);

	const assetIds = await db
		.insert(schema.assets)
		.values(assets)
		.returning({ id: schema.assets.id });

	const persons = f.helpers.multiple(
		() => {
			const name = f.person.fullName();

			return {
				name,
				description: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				slug: f.helpers.slugify(name),
			};
		},
		{ count: 10 },
	);

	const personIds = await db
		.insert(schema.persons)
		.values(persons)
		.returning({ id: schema.persons.id });

	const events = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();
			const startDate = f.date.past({ years: 5 });

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				location: f.location.city(),
				startDate,
				startTime: f.helpers.maybe(
					() => {
						return f.date
							.between({
								from: new Date(Date.UTC(2025, 0, 1, 0, 0, 0)),
								to: new Date(Date.UTC(2025, 0, 1, 23, 59, 59)),
							})
							.toTimeString()
							.slice(0, 8);
					},
					{ probability: 0.1 },
				),
				endDate: f.helpers.maybe(
					() => {
						return f.date.soon({ refDate: startDate, days: 7 });
					},
					{ probability: 0.25 },
				),
				endTime: f.helpers.maybe(
					() => {
						return f.date
							.between({
								from: new Date(Date.UTC(2025, 0, 1, 0, 0, 0)),
								to: new Date(Date.UTC(2025, 0, 1, 23, 59, 59)),
							})
							.toTimeString()
							.slice(0, 8);
					},
					{ probability: 0.05 },
				),
				website: f.helpers.maybe(
					() => {
						return f.internet.url();
					},
					{ probability: 0.75 },
				),
				slug: f.helpers.slugify(title),
			};
		},
		{ count: 25 },
	);

	const eventIds = await db
		.insert(schema.events)
		.values(events)
		.returning({ id: schema.events.id });

	const impactCaseStudies = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				slug: f.helpers.slugify(title),
			};
		},
		{ count: 25 },
	);

	const impactCaseStudiesIds = await db
		.insert(schema.impactCaseStudies)
		.values(impactCaseStudies)
		.returning({ id: schema.impactCaseStudies.id });

	const impactCaseStudiesToPersons = impactCaseStudiesIds.flatMap(({ id: impactCaseStudyId }) => {
		const persons = f.helpers.arrayElements(personIds, { min: 0, max: 3 });

		return persons.map(({ id: personId }) => {
			return { impactCaseStudyId, personId };
		});
	});

	await db.insert(schema.impactCaseStudiesToPersons).values(impactCaseStudiesToPersons);

	const news = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				slug: f.helpers.slugify(title),
			};
		},
		{ count: 25 },
	);

	const newsItemIds = await db.insert(schema.news).values(news).returning({ id: schema.news.id });

	const spotlightArticles = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				slug: f.helpers.slugify(title),
			};
		},
		{ count: 25 },
	);

	const spotlightArticlesIds = await db
		.insert(schema.spotlightArticles)
		.values(spotlightArticles)
		.returning({ id: schema.spotlightArticles.id });

	const entities = [
		...eventIds.map(({ id }) => {
			return {
				entityId: id,
				entityType: "events" as const,
				documentId: f.string.uuid(),
				status: "draft" as const,
			};
		}),
		...impactCaseStudiesIds.map(({ id }) => {
			return {
				entityId: id,
				entityType: "impact_case_studies" as const,
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
		...spotlightArticlesIds.map(({ id }) => {
			return {
				entityId: id,
				entityType: "spotlight_articles" as const,
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

	const contentBlocks = fieldIds.flatMap(({ id: fieldId }) => {
		return [
			{ fieldId, type: "image" as const, position: 1 },
			{ fieldId, type: "rich_text" as const, position: 2 },
		];
	});

	const contentBlockIds = await db
		.insert(schema.contentBlocks)
		.values(contentBlocks)
		.returning({ id: schema.contentBlocks.id, type: schema.contentBlocks.type });

	const contentBlockIdsByType = groupBy(contentBlockIds, ({ type }) => {
		return type;
	});

	const imageContentBlocks = contentBlockIdsByType.image.map(({ id }) => {
		return {
			id,
			imageId: f.helpers.arrayElement(assetIds).id,
			caption: f.helpers.maybe(
				() => {
					return f.lorem.sentence();
				},
				{ probability: 0.5 },
			),
		};
	});

	await db.insert(schema.imageContentBlocks).values(imageContentBlocks);

	const richTextContentBlocks = contentBlockIdsByType.rich_text.map(({ id }) => {
		return {
			id,
			content: JSON.stringify({ hello: "world" }),
		};
	});

	await db.insert(schema.richTextContentBlocks).values(richTextContentBlocks);

	const entitiesToResources = entityIds.flatMap(({ id: entityId }) => {
		return f.helpers.multiple(
			() => {
				return { entityId, resourceId: f.string.uuid() };
			},
			{ count: f.number.int({ min: 0, max: 5 }) },
		);
	});

	await db.insert(schema.entitiesToResources).values(entitiesToResources);

	const entitiesToEntities = entityIds.flatMap(({ id: entityId }) => {
		return f.helpers.arrayElements(entityIds, { min: 0, max: 5 }).map(({ id: relatedEntityId }) => {
			return { entityId, relatedEntityId };
		});
	});

	await db.insert(schema.entitiesToEntities).values(entitiesToEntities);

	log.success("Successfully seeded database.");
}

main().catch((error: unknown) => {
	log.error("Failed to seed database.\n", error);
	process.exitCode = 1;
});
