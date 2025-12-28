import { groupBy, keyBy } from "@acdh-oeaw/lib";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import type { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

interface SeedManifest {
	assets: Array<{
		key: string;
	}>;
}

interface SeedConfig {
	/** @default "2025-01-01" */
	defaultRefDate?: Date;
	/** default 42 */
	seed?: number;
	seedManifest?: SeedManifest;
}

export async function seed(db: ReturnType<typeof drizzle>, config: SeedConfig = {}): Promise<void> {
	const { defaultRefDate = new Date(Date.UTC(2025, 0, 1)), seed = 42, seedManifest } = config;

	f.seed(seed);
	f.setDefaultRefDate(defaultRefDate);

	const users: Array<schema.UserInput> = f.helpers.multiple(
		() => {
			return {
				username: f.internet.username(),
				email: f.internet.email(),
			};
		},
		{ count: 10 },
	);

	await db.insert(schema.users).values(users);

	const licenses: Array<schema.LicenseInput> = [
		{ name: "CC0-1.0", url: "https://choosealicense.com/licenses/cc0-1.0/" },
		{ name: "CC-BY-4.0", url: "https://choosealicense.com/licenses/cc-by-4.0/" },
		{ name: "CC-BY-SA-4.0", url: "https://choosealicense.com/licenses/cc-by-sa-4.0/" },
	];

	const licenseIds = await db
		.insert(schema.licenses)
		.values(licenses)
		.returning({ id: schema.licenses.id });

	const assets: Array<schema.AssetInput> = f.helpers.multiple(
		() => {
			const key =
				seedManifest?.assets != null
					? f.helpers.arrayElement(seedManifest.assets).key
					: f.string.uuid();

			return {
				key,
				licenseId: f.helpers.arrayElement(licenseIds).id,
			};
		},
		{ count: 275 },
	);

	const assetIds = await db
		.insert(schema.assets)
		.values(assets)
		.returning({ id: schema.assets.id });

	const entityTypes: Array<schema.EntityTypeInput> = schema.entityTypesEnum.map((type) => {
		return { type };
	});

	const entityTypeIds = await db
		.insert(schema.entityTypes)
		.values(entityTypes)
		.returning({ id: schema.entityTypes.id, type: schema.entityTypes.type });

	const entityTypesByType = keyBy(entityTypeIds, ({ type }) => {
		return type;
	});

	const entityStatus: Array<schema.EntityStatusInput> = schema.entityStatusEnum.map((type) => {
		return { type };
	});

	const entityStatusIds = await db
		.insert(schema.entityStatus)
		.values(entityStatus)
		.returning({ id: schema.entityStatus.id, type: schema.entityStatus.type });

	const entityStatusByType = keyBy(entityStatusIds, ({ type }) => {
		return type;
	});

	const persons: Array<schema.PersonInput> = f.helpers.multiple(
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

	const personEntities: Array<schema.EntityInput> = persons.map((person) => {
		return {
			typeId: entityTypesByType.persons.id,
			documentId: f.string.uuid(),
			statusId: entityStatusByType.draft.id,
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

	const events: Array<schema.EventInput> = f.helpers.multiple(
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

	const eventEntities: Array<schema.EntityInput> = events.map((event) => {
		return {
			typeId: entityTypesByType.events.id,
			documentId: f.string.uuid(),
			statusId: entityStatusByType.draft.id,
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

	const impactCaseStudies: Array<schema.ImpactCaseStudyInput> = f.helpers.multiple(
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

	const impactCaseStudyEntities: Array<schema.EntityInput> = impactCaseStudies.map(
		(impactCaseStudy) => {
			return {
				typeId: entityTypesByType.impact_case_studies.id,
				documentId: f.string.uuid(),
				statusId: entityStatusByType.draft.id,
				slug: slugify(impactCaseStudy.title),
			};
		},
	);

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

	const news: Array<schema.NewsItemInput> = f.helpers.multiple(
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

	const newsItemEntities: Array<schema.EntityInput> = news.map((newsItem) => {
		return {
			typeId: entityTypesByType.news.id,
			documentId: f.string.uuid(),
			statusId: entityStatusByType.draft.id,
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

	const pages: Array<schema.PageInput> = f.helpers.multiple(
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

	const pageEntities: Array<schema.EntityInput> = pages.map((page) => {
		return {
			typeId: entityTypesByType.pages.id,
			documentId: f.string.uuid(),
			statusId: entityStatusByType.draft.id,
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

	const spotlightArticles: Array<schema.SpotlightArticleInput> = f.helpers.multiple(
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

	const spotlightArticleEntities: Array<schema.EntityInput> = spotlightArticles.map(
		(spotlightArticle) => {
			return {
				typeId: entityTypesByType.spotlight_articles.id,
				documentId: f.string.uuid(),
				statusId: entityStatusByType.draft.id,
				slug: slugify(spotlightArticle.title),
			};
		},
	);

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

	const fields: Array<schema.FieldInput> = entityIds.map(({ id }) => {
		return { entityId: id, name: "content" };
	});

	const fieldIds = await db
		.insert(schema.fields)
		.values(fields)
		.returning({ id: schema.fields.id });

	const contentBlockTypes: Array<schema.ContentBlockTypesInput> = schema.contentBlockTypesEnum.map(
		(type) => {
			return { type };
		},
	);

	const contentBlockTypeIds = await db
		.insert(schema.contentBlockTypes)
		.values(contentBlockTypes)
		.returning({ id: schema.contentBlockTypes.id, type: schema.contentBlockTypes.type });

	const contentBlockTypesById = keyBy(contentBlockTypeIds, ({ id }) => {
		return id;
	});
	const contentBlockTypesByType = keyBy(contentBlockTypeIds, ({ type }) => {
		return type;
	});

	const contentBlocks: Array<schema.ContentBlockInput> = fieldIds.flatMap(({ id: fieldId }) => {
		return [
			{ fieldId, typeId: contentBlockTypesByType.image.id, position: 1 },
			{ fieldId, typeId: contentBlockTypesByType.rich_text.id, position: 2 },
		];
	});

	const contentBlockIds = await db
		.insert(schema.contentBlocks)
		.values(contentBlocks)
		.returning({ id: schema.contentBlocks.id, typeId: schema.contentBlocks.typeId });

	const contentBlockIdsByType = groupBy(contentBlockIds, ({ typeId }) => {
		return contentBlockTypesById[typeId]!.type;
	});

	const imageContentBlocks: Array<schema.ImageContentBlockInput> = contentBlockIdsByType.image.map(
		({ id }) => {
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
		},
	);

	await db.insert(schema.imageContentBlocks).values(imageContentBlocks);

	const richTextContentBlocks: Array<schema.RichTextContentBlockInput> =
		contentBlockIdsByType.rich_text.map(({ id }) => {
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
