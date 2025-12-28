import { groupBy } from "@acdh-oeaw/lib";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import type { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

interface SeedConfig {
	/** @default "2025-01-01" */
	defaultRefDate?: Date;
	/** default 42 */
	seed?: number;
}

export async function seed(db: ReturnType<typeof drizzle>, config: SeedConfig = {}): Promise<void> {
	const { defaultRefDate = new Date(Date.UTC(2025, 0, 1)), seed = 42 } = config;

	f.seed(seed);
	f.setDefaultRefDate(defaultRefDate);

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
				key: f.string.uuid(),
				licenseId: f.helpers.arrayElement(licenseIds).id,
			};
		},
		{ count: 275 },
	);

	const assetIds = await db
		.insert(schema.assets)
		.values(assets)
		.returning({ id: schema.assets.id });

	const persons = f.helpers.multiple(
		() => {
			const firstName = f.person.firstName();
			const lastName = f.person.lastName();

			return {
				firstName,
				lastName,
				description: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
			};
		},
		{ count: 10 },
	);

	const personEntities = persons.map((person) => {
		return {
			type: "persons" as const,
			documentId: f.string.uuid(),
			status: "draft" as const,
			slug: slugify([person.lastName, person.firstName].join(", ")),
		};
	});

	const personIds = await db
		.insert(schema.entities)
		.values(personEntities)
		.returning({ id: schema.entities.id });

	await db.insert(schema.persons).values(
		personIds.map(({ id }, index) => {
			return { ...persons[index]!, id };
		}),
	);

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
			};
		},
		{ count: 25 },
	);

	const eventEntities = events.map((event) => {
		return {
			type: "events" as const,
			documentId: f.string.uuid(),
			status: "draft" as const,
			slug: slugify(event.title),
		};
	});

	const eventIds = await db
		.insert(schema.entities)
		.values(eventEntities)
		.returning({ id: schema.entities.id });

	await db.insert(schema.events).values(
		eventIds.map(({ id }, index) => {
			return { ...events[index]!, id };
		}),
	);

	const impactCaseStudies = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
			};
		},
		{ count: 25 },
	);

	const impactCaseStudyEntities = impactCaseStudies.map((impactCaseStudy) => {
		return {
			type: "impact_case_studies" as const,
			documentId: f.string.uuid(),
			status: "draft" as const,
			slug: slugify(impactCaseStudy.title),
		};
	});

	const impactCaseStudyIds = await db
		.insert(schema.entities)
		.values(impactCaseStudyEntities)
		.returning({ id: schema.entities.id });

	await db.insert(schema.impactCaseStudies).values(
		impactCaseStudyIds.map(({ id }, index) => {
			return { ...impactCaseStudies[index]!, id };
		}),
	);

	const impactCaseStudiesToPersons = impactCaseStudyIds.flatMap(({ id: impactCaseStudyId }) => {
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
			};
		},
		{ count: 25 },
	);

	const newsItemEntities = news.map((newsItem) => {
		return {
			type: "news" as const,
			documentId: f.string.uuid(),
			status: "draft" as const,
			slug: slugify(newsItem.title),
		};
	});

	const newsItemIds = await db
		.insert(schema.entities)
		.values(newsItemEntities)
		.returning({ id: schema.entities.id });

	await db.insert(schema.news).values(
		newsItemIds.map(({ id }, index) => {
			return { ...news[index]!, id };
		}),
	);

	const pages = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
			};
		},
		{ count: 25 },
	);

	const pageEntities = pages.map((page) => {
		return {
			type: "pages" as const,
			documentId: f.string.uuid(),
			status: "draft" as const,
			slug: slugify(page.title),
		};
	});

	const pageIds = await db
		.insert(schema.entities)
		.values(pageEntities)
		.returning({ id: schema.entities.id });

	await db.insert(schema.pages).values(
		pageIds.map(({ id }, index) => {
			return { ...pages[index]!, id };
		}),
	);

	const spotlightArticles = f.helpers.multiple(
		() => {
			const title = f.lorem.sentence();

			return {
				title,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
			};
		},
		{ count: 25 },
	);

	const spotlightArticleEntities = spotlightArticles.map((spotlightArticle) => {
		return {
			type: "spotlight_articles" as const,
			documentId: f.string.uuid(),
			status: "draft" as const,
			slug: slugify(spotlightArticle.title),
		};
	});

	const spotlightArticleIds = await db
		.insert(schema.entities)
		.values(spotlightArticleEntities)
		.returning({ id: schema.entities.id });

	await db.insert(schema.spotlightArticles).values(
		spotlightArticleIds.map(({ id }, index) => {
			return { ...spotlightArticles[index]!, id };
		}),
	);

	const entityIds = await db.select({ id: schema.entities.id }).from(schema.entities);

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
}
