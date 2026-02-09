import { groupBy, keyBy } from "@acdh-oeaw/lib";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { eq } from "drizzle-orm";

import * as schema from "../schema";
import type { Client } from "./admin-client";

interface SeedManifest {
	avatars: Array<{
		key: string;
	}>;
	images: Array<{
		key: string;
	}>;
}

export interface SeedConfig {
	/** @default "2025-01-01" */
	defaultRefDate?: Date;
	/** default 42 */
	seed?: number;
	seedManifest?: SeedManifest;
}

export async function seed(db: Client, config: SeedConfig = {}): Promise<void> {
	const { defaultRefDate = new Date(Date.UTC(2025, 0, 1)), seed = 42, seedManifest } = config;

	f.seed(seed);
	f.setDefaultRefDate(defaultRefDate);

	await db.transaction(async (db) => {
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

		const licenseIds = await db.select({ id: schema.licenses.id }).from(schema.licenses);

		const images: Array<schema.AssetInput> = f.helpers.multiple(
			() => {
				const key =
					seedManifest?.images != null
						? f.helpers.arrayElement(seedManifest.images).key
						: f.string.uuid();

				return {
					key,
					licenseId: f.helpers.arrayElement(licenseIds).id,
				};
			},
			{ count: 250 },
		);

		const imageIds = await db
			.insert(schema.assets)
			.values(images)
			.returning({ id: schema.assets.id });

		const avatars: Array<schema.AssetInput> = f.helpers.multiple(
			() => {
				const key =
					seedManifest?.avatars != null
						? f.helpers.arrayElement(seedManifest.avatars).key
						: f.string.uuid();

				return {
					key,
					licenseId: f.helpers.arrayElement(licenseIds).id,
				};
			},
			{ count: 25 },
		);

		const avatarIds = await db
			.insert(schema.assets)
			.values(avatars)
			.returning({ id: schema.assets.id });

		const entityTypeIds = await db
			.select({ id: schema.entityTypes.id, type: schema.entityTypes.type })
			.from(schema.entityTypes);

		const entityTypesByType = keyBy(entityTypeIds, ({ type }) => {
			return type;
		});

		const entityStatusIds = await db
			.select({ id: schema.entityStatus.id, type: schema.entityStatus.type })
			.from(schema.entityStatus);

		const entityStatusByType = keyBy(entityStatusIds, ({ type }) => {
			return type;
		});

		const fieldNameIds = await db
			.select({
				id: schema.entityTypesFieldsNames.id,
				entityTypeId: schema.entityTypes.id,
				entityType: schema.entityTypes.type,
			})
			.from(schema.entityTypesFieldsNames)
			.innerJoin(
				schema.entityTypes,
				eq(schema.entityTypesFieldsNames.entityTypeId, schema.entityTypes.id),
			);

		const fieldNamesByEntityTypeId = groupBy(fieldNameIds, ({ entityTypeId }) => {
			return entityTypeId;
		});

		const persons: Array<Omit<schema.PersonInput, "id">> = f.helpers.multiple(
			() => {
				const firstName = f.person.firstName();
				const lastName = f.person.lastName();
				const name = f.person.fullName({ firstName, lastName });

				return {
					name,
					sortName: [lastName, firstName].join(" "),
					description: f.lorem.paragraph(),
					imageId: f.helpers.arrayElement(avatarIds).id,
				};
			},
			{ count: 25 },
		);

		const personEntities: Array<schema.EntityInput> = persons.map((person) => {
			return {
				typeId: entityTypesByType.persons.id,
				documentId: f.string.uuid(),
				statusId: entityStatusByType.published.id,
				slug: slugify(person.sortName),
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

		const events: Array<Omit<schema.EventInput, "id">> = f.helpers.multiple(
			() => {
				const title = f.lorem.sentence();
				const start = f.date.past({ years: 5 });
				const end = f.helpers.maybe(
					() => {
						return f.date.soon({ refDate: start, days: 7 });
					},
					{ probability: 0.25 },
				);
				const isFullDay = f.datatype.boolean({ probability: 0.5 });
				if (isFullDay) {
					start.setUTCHours(0, 0, 0, 0);
					end?.setUTCHours(23, 59, 59, 999);
				}

				return {
					title,
					summary: f.lorem.paragraph(),
					imageId: f.helpers.arrayElement(imageIds).id,
					location: f.location.city(),
					duration: {
						start,
						end,
					},
					isFullDay,
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
				statusId: entityStatusByType.published.id,
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

		const impactCaseStudies: Array<Omit<schema.ImpactCaseStudyInput, "id">> = f.helpers.multiple(
			() => {
				const title = f.lorem.sentence();

				return {
					title,
					summary: f.lorem.paragraph(),
					imageId: f.helpers.arrayElement(imageIds).id,
				};
			},
			{ count: 25 },
		);

		const impactCaseStudyEntities: Array<schema.EntityInput> = impactCaseStudies.map(
			(impactCaseStudy) => {
				return {
					typeId: entityTypesByType.impact_case_studies.id,
					documentId: f.string.uuid(),
					statusId: entityStatusByType.published.id,
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

		const news: Array<Omit<schema.NewsItemInput, "id">> = f.helpers.multiple(
			() => {
				const title = f.lorem.sentence();

				return {
					title,
					summary: f.lorem.paragraph(),
					imageId: f.helpers.arrayElement(imageIds).id,
				};
			},
			{ count: 25 },
		);

		const newsItemEntities: Array<schema.EntityInput> = news.map((newsItem) => {
			return {
				typeId: entityTypesByType.news.id,
				documentId: f.string.uuid(),
				statusId: entityStatusByType.published.id,
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

		const pages: Array<Omit<schema.PageInput, "id">> = f.helpers.multiple(
			() => {
				const title = f.lorem.sentence();

				return {
					title,
					summary: f.lorem.paragraph(),
					imageId: f.helpers.arrayElement(imageIds).id,
				};
			},
			{ count: 25 },
		);

		const pageEntities: Array<schema.EntityInput> = pages.map((page) => {
			return {
				typeId: entityTypesByType.pages.id,
				documentId: f.string.uuid(),
				statusId: entityStatusByType.published.id,
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

		const spotlightArticles: Array<Omit<schema.SpotlightArticleInput, "id">> = f.helpers.multiple(
			() => {
				const title = f.lorem.sentence();

				return {
					title,
					summary: f.lorem.paragraph(),
					imageId: f.helpers.arrayElement(imageIds).id,
				};
			},
			{ count: 25 },
		);

		const spotlightArticleEntities: Array<schema.EntityInput> = spotlightArticles.map(
			(spotlightArticle) => {
				return {
					typeId: entityTypesByType.spotlight_articles.id,
					documentId: f.string.uuid(),
					statusId: entityStatusByType.published.id,
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

		const entityIds = await db
			.select({ id: schema.entities.id, typeId: schema.entities.typeId })
			.from(schema.entities);

		const fields: Array<schema.FieldInput> = entityIds.flatMap(({ id, typeId }) => {
			return fieldNamesByEntityTypeId[typeId]!.map((fieldName) => {
				return { entityId: id, fieldNameId: fieldName.id };
			});
		});

		const fieldIds = await db
			.insert(schema.fields)
			.values(fields)
			.returning({ id: schema.fields.id });

		const contentBlockTypeIds = await db
			.select({ id: schema.contentBlockTypes.id, type: schema.contentBlockTypes.type })
			.from(schema.contentBlockTypes);

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

		const imageContentBlocks: Array<schema.ImageContentBlockInput> =
			contentBlockIdsByType.image.map(({ id }) => {
				return {
					id,
					imageId: f.helpers.arrayElement(imageIds).id,
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
		}) satisfies Array<schema.RichTextContentBlockInput>; // FIXME: type regression

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
			return f.helpers
				.arrayElements(entityIds, { min: 0, max: 5 })
				.map(({ id: relatedEntityId }) => {
					return { entityId, relatedEntityId };
				});
		});

		await db.insert(schema.entitiesToEntities).values(entitiesToEntities);

		const organisationalUnitTypeIds = await db
			.select({ id: schema.organisationalUnitTypes.id, type: schema.organisationalUnitTypes.type })
			.from(schema.organisationalUnitTypes);

		const organisationalUnitsTypesByType = keyBy(organisationalUnitTypeIds, ({ type }) => {
			return type;
		});

		const organisationalUnitsAllowedRelationsValues = await db
			.select({
				relatedUnitTypeId: schema.organisationalUnitsAllowedRelations.relatedUnitTypeId,
				relationTypeId: schema.organisationalUnitsAllowedRelations.relationTypeId,
				unitTypeId: schema.organisationalUnitsAllowedRelations.unitTypeId,
			})
			.from(schema.organisationalUnitsAllowedRelations);

		const { umbrella_consortium, ...rest } = organisationalUnitsTypesByType;

		const organisationalUnits: Array<Omit<schema.OrganisationalUnitInput, "id">> =
			f.helpers.multiple(
				(_, i) => {
					const name = f.commerce.productName();

					return {
						name,
						metadata: { country: f.location.country() },
						summary: f.lorem.paragraph(),
						imageId: f.helpers.maybe(
							() => {
								return f.helpers.arrayElement(imageIds).id;
							},
							{ probability: 0.5 },
						),
						typeId:
							i === 0
								? umbrella_consortium.id
								: Object.values(rest).map((type) => {
										return type.id;
									})[i % Object.values(rest).length]!,
					};
				},
				{ count: 25 },
			);

		const organisationalUnitsEntities: Array<schema.EntityInput> = organisationalUnits.map(
			(organisationalUnit) => {
				return {
					typeId: entityTypesByType.organisational_units.id,
					documentId: f.string.uuid(),
					statusId: entityStatusByType.published.id,
					slug: slugify(organisationalUnit.name),
				};
			},
		);

		const organisationalUnitIds = await db
			.insert(schema.entities)
			.values(organisationalUnitsEntities)
			.returning({ id: schema.entities.id });

		const organisationalUnitsIds = await db
			.insert(schema.organisationalUnits)
			.values(
				organisationalUnitIds.map(({ id }, index) => {
					return { ...organisationalUnits[index]!, id };
				}),
			)
			.returning({ id: schema.organisationalUnits.id, typeId: schema.organisationalUnits.typeId });

		const unitsToUnits: Array<schema.OrganisationalUnitRelationInput> = f.helpers
			.multiple(
				() => {
					return f.helpers.arrayElement(organisationalUnitsAllowedRelationsValues);
				},
				{ count: 25 },
			)
			.map((organisationalUnitsAllowedRelation) => {
				const unit = f.helpers.arrayElement(
					organisationalUnitsIds.filter((organisationalUnit) => {
						return organisationalUnit.typeId === organisationalUnitsAllowedRelation.unitTypeId;
					}),
				);

				const relatedUnit = f.helpers.arrayElement(
					organisationalUnitsIds.filter((organisationalUnit) => {
						return (
							organisationalUnit.typeId === organisationalUnitsAllowedRelation.relatedUnitTypeId
						);
					}),
				);

				const start = f.date.past({ years: 5 });
				const yesterday = new Date();
				yesterday.setDate(yesterday.getDate() - 1);
				const minEndDate = new Date(start);
				minEndDate.setFullYear(start.getFullYear() + 1);

				return {
					unitId: unit.id,
					relatedUnitId: relatedUnit.id,
					status: organisationalUnitsAllowedRelation.relationTypeId,
					duration: {
						start,
						end:
							minEndDate < yesterday
								? f.helpers.maybe(
										() => {
											return f.date.between({ from: minEndDate, to: yesterday });
										},
										{ probability: 0.25 },
									)
								: undefined,
					},
				};
			});

		await db.insert(schema.organisationalUnitsRelations).values(unitsToUnits);

		const personsToOrganisationalUnitsAllowedRelations = await db
			.select()
			.from(schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations);

		const personsToOrganisationalUnits = f.helpers.multiple(
			() => {
				const { roleTypeId, unitTypeId } = f.helpers.arrayElement(
					personsToOrganisationalUnitsAllowedRelations,
				);
				const organisationalUnit = f.helpers.arrayElement(
					organisationalUnitsIds.filter((organisationalUnit) => {
						return organisationalUnit.typeId === unitTypeId;
					}),
				);

				const start = f.date.past({ years: 5 });
				const end = f.helpers.maybe(
					() => {
						return f.date.soon({ refDate: start, days: 7 });
					},
					{ probability: 0.25 },
				);
				const isFullDay = f.datatype.boolean({ probability: 0.5 });
				if (isFullDay) {
					start.setUTCHours(0, 0, 0, 0);
					end?.setUTCHours(23, 59, 59, 999);
				}

				return {
					personId: f.helpers.arrayElement(personIds).id,
					roleTypeId,
					organisationalUnitId: organisationalUnit.id,
					duration: {
						start,
						end,
					},
				};
			},
			{ count: 10 },
		);

		await db.insert(schema.personsToOrganisationalUnits).values(personsToOrganisationalUnits);
	});
}
