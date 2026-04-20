import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { createTestClient } from "~/test/lib/create-test-client";
import { seedContentBlock } from "~/test/lib/seed-content-block";
import { withTransaction } from "~/test/lib/with-transaction";

function createItems(count: number) {
	const items = f.helpers.multiple(
		() => {
			const id = uuidv7();
			const documentId = uuidv7();
			const title = f.lorem.sentence();
			const slug = slugify(title);

			const entity = {
				id,
				slug,
				documentId,
			};

			const impactCaseStudy = {
				id,
				title,
				summary: f.lorem.paragraph(),
			};

			return { entity, impactCaseStudy };
		},
		{ count },
	);

	return items;
}

function createContributor() {
	const id = uuidv7();
	const documentId = uuidv7();
	const assetId = uuidv7();
	const name = f.person.fullName();
	const slug = slugify(name);

	return {
		entity: {
			id,
			slug,
			documentId,
		},
		asset: {
			id: assetId,
			key: `persons/${assetId}.jpg`,
			label: name,
			mimeType: "image/jpeg",
		},
		person: {
			id,
			name,
			position: f.person.jobTitle(),
			sortName: f.person.lastName(),
			email: f.internet.email(),
			orcid: `0000-000${String(f.number.int({ min: 1, max: 9 }))}-${String(f.number.int({ min: 1000, max: 9999 }))}-${String(f.number.int({ min: 1000, max: 9999 }))}`,
			imageId: assetId,
		},
	};
}

async function seed(
	db: Database,
	items: ReturnType<typeof createItems>,
	contributor = createContributor(),
) {
	const [status, type, personType, asset] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "impact_case_studies" },
		}),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "persons" },
		}),
		db.query.assets.findFirst({ columns: { id: true } }),
	]);

	assert(status, "No entity status in database.");
	assert(type, "No entity type in database.");
	assert(personType, "No person entity type in database.");
	assert(asset, "No assets in database.");

	await db.insert(schema.entities).values(
		items.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: type.id };
		}),
	);

	await db.insert(schema.impactCaseStudies).values(
		items.map((item) => {
			return { ...item.impactCaseStudy, imageId: asset.id };
		}),
	);

	await Promise.all(
		items.map((item) => {
			return seedContentBlock(db, item.entity.id, type.id, "content");
		}),
	);

	await db.insert(schema.assets).values(contributor.asset);

	await db.insert(schema.entities).values({
		...contributor.entity,
		statusId: status.id,
		typeId: personType.id,
	});

	await db.insert(schema.persons).values(contributor.person);

	await db.insert(schema.impactCaseStudiesToPersons).values(
		items.map((item) => {
			return {
				impactCaseStudyId: item.entity.id,
				personId: contributor.person.id,
			};
		}),
	);
}

describe("impact-case-studies", () => {
	describe("GET /api/impact-case-studies", () => {
		it("should return paginated list of impact case studies", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const title = item.impactCaseStudy.title;

				const response = await client["impact-case-studies"].$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(items.length);
				expect(data.data).toEqual(expect.arrayContaining([expect.objectContaining({ title })]));
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/impact-case-studies/:id", () => {
		it("should return single impact case study", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				const contributor = createContributor();
				await seed(db, items, contributor);

				const item = items.at(1)!;
				const id = item.entity.id;
				const title = item.impactCaseStudy.title;
				const contributorName = contributor.person.name;
				const contributorPosition = contributor.person.position;

				const response = await client["impact-case-studies"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("content" in data);
				expect(data).toMatchObject({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					contributors: expect.arrayContaining([
						expect.objectContaining({
							name: contributorName,
							position: contributorPosition,
						}),
					]),
					title,
				});
				expect(data.content).toHaveLength(1);
				expect(data.content[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const id = "no-uuid";

				const response = await client["impact-case-studies"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const id = "019b75fd-6d6a-757c-acc2-c3c6266a0f31";

				const response = await client["impact-case-studies"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/impact-case-studies/slugs", () => {
		it("should return paginated list of slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client["impact-case-studies"].slugs.$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(items.length);
				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ entity: { slug } })]),
				);
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/impact-case-studies/slugs/:slug", () => {
		it("should return single impact case study", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				const contributor = createContributor();
				await seed(db, items, contributor);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const title = item.impactCaseStudy.title;
				const contributorName = contributor.person.name;
				const contributorPosition = contributor.person.position;

				const response = await client["impact-case-studies"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("content" in data);
				expect(data).toMatchObject({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					contributors: expect.arrayContaining([
						expect.objectContaining({
							name: contributorName,
							position: contributorPosition,
						}),
					]),
					title,
				});
				expect(data.content).toHaveLength(1);
				expect(data.content[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const slug = "non-existing-slug";

				const response = await client["impact-case-studies"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
