import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import type { DariahProject } from "@/routes/dariah-projects/schemas";
import { createTestClient } from "~/test/lib/create-test-client";
import { seedContentBlock } from "~/test/lib/seed-content-block";
import { withTransaction } from "~/test/lib/with-transaction";

function createProjectData() {
	const id = uuidv7();
	const documentId = uuidv7();
	const name = f.lorem.sentence();
	const slug = slugify(name);

	const entity = { id, slug, documentId };

	const project = {
		id,
		name,
		summary: f.lorem.paragraph(),
		call: f.lorem.word(),
		funders: f.company.name(),
		topic: f.lorem.word(),
		duration: {
			start: f.date.past({ years: 5 }),
		},
	};

	return { entity, project };
}

interface SeedResult {
	dariahItems: Array<ReturnType<typeof createProjectData>>;
	nonDariahItem: ReturnType<typeof createProjectData>;
	umbrellaUnitId: string;
	roleId: string;
}

async function seed(db: Database, count: number): Promise<SeedResult> {
	const [status, entityType, scope, unitEntityType, umbrellaType, otherType, projectRole] =
		await Promise.all([
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
			db.query.entityTypes.findFirst({ columns: { id: true }, where: { type: "projects" } }),
			db.query.projectScopes.findFirst({ columns: { id: true } }),
			db.query.entityTypes.findFirst({
				columns: { id: true },
				where: { type: "organisational_units" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "umbrella_consortium" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "consortium" },
			}),
			db.query.projectRoles.findFirst({ columns: { id: true } }),
		]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(scope, "No project scope in database.");
	assert(unitEntityType, "No organisational unit entity type in database.");
	assert(umbrellaType, "No umbrella_consortium type in database.");
	assert(otherType, "No consortium type in database.");
	assert(projectRole, "No project role in database.");

	const dariahItems = f.helpers.multiple(
		() => {
			return createProjectData();
		},
		{ count },
	);
	const nonDariahItem = createProjectData();
	const allItems = [...dariahItems, nonDariahItem];

	await db.insert(schema.entities).values(
		allItems.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: entityType.id };
		}),
	);

	await db.insert(schema.projects).values(
		allItems.map((item) => {
			return { ...item.project, scopeId: scope.id };
		}),
	);

	// Create umbrella_consortium unit (linked to DARIAH projects)
	const umbrellaUnitId = uuidv7();

	await db.insert(schema.entities).values({
		id: umbrellaUnitId,
		slug: `umbrella-${umbrellaUnitId}`,
		documentId: uuidv7(),
		statusId: status.id,
		typeId: unitEntityType.id,
	});

	await db.insert(schema.organisationalUnits).values({
		id: umbrellaUnitId,
		name: f.company.name(),
		summary: f.lorem.paragraph(),
		typeId: umbrellaType.id,
	});

	// Create non-umbrella unit (linked to the non-DARIAH project)
	const otherUnitId = uuidv7();

	await db.insert(schema.entities).values({
		id: otherUnitId,
		slug: `other-${otherUnitId}`,
		documentId: uuidv7(),
		statusId: status.id,
		typeId: unitEntityType.id,
	});

	await db.insert(schema.organisationalUnits).values({
		id: otherUnitId,
		name: f.company.name(),
		summary: f.lorem.paragraph(),
		typeId: otherType.id,
	});

	// Link DARIAH projects to umbrella_consortium unit
	await db.insert(schema.projectPartners).values(
		dariahItems.map((item) => {
			return {
				projectId: item.project.id,
				unitId: umbrellaUnitId,
				roleId: projectRole.id,
			};
		}),
	);

	// Link non-DARIAH project to a non-umbrella unit only
	await db.insert(schema.projectPartners).values({
		projectId: nonDariahItem.project.id,
		unitId: otherUnitId,
		roleId: projectRole.id,
	});

	await Promise.all(
		allItems.map((item) => {
			return seedContentBlock(db, item.entity.id, entityType.id, "description");
		}),
	);

	return { dariahItems, nonDariahItem, umbrellaUnitId, roleId: projectRole.id };
}

describe("dariah-projects", () => {
	describe("GET /api/dariah-projects", () => {
		it("should return paginated list of DARIAH projects", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const { dariahItems } = await seed(db, 3);

				const item = dariahItems.at(1)!;
				const name = item.project.name;

				const response = await client["dariah-projects"].$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(dariahItems.length);
				expect(data.data).toEqual(expect.arrayContaining([expect.objectContaining({ name })]));
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/dariah-projects/:id", () => {
		it("should return single DARIAH project with institutions including roleId", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const { dariahItems, roleId } = await seed(db, 3);

				const item = dariahItems.at(1)!;
				const id = item.entity.id;
				const name = item.project.name;

				const response = await client["dariah-projects"][":id"].$get({
					param: { id },
				});

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as DariahProject;

				expect(data).toMatchObject({ name });
				expect(data.institutions).toHaveLength(1);
				expect(data.institutions[0]).toMatchObject({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					name: expect.any(String),
					type: "umbrella_consortium",
					roleId,
				});
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 404 for a project not linked to umbrella_consortium", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const { nonDariahItem } = await seed(db, 3);

				const response = await client["dariah-projects"][":id"].$get({
					param: { id: nonDariahItem.entity.id },
				});

				expect(response.status).toBe(404);
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["dariah-projects"][":id"].$get({
					param: { id: "no-uuid" },
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["dariah-projects"][":id"].$get({
					param: { id: "019b75fd-6d6a-757c-acc2-c3c6266a0f31" },
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/dariah-projects/slugs", () => {
		it("should return paginated list of DARIAH project slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const { dariahItems } = await seed(db, 3);

				const item = dariahItems.at(1)!;
				const slug = item.entity.slug;

				const response = await client["dariah-projects"].slugs.$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(dariahItems.length);
				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ entity: { slug } })]),
				);
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/dariah-projects/slugs/:slug", () => {
		it("should return single DARIAH project", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const { dariahItems } = await seed(db, 3);

				const item = dariahItems.at(1)!;
				const slug = item.entity.slug;
				const name = item.project.name;

				const response = await client["dariah-projects"].slugs[":slug"].$get({
					param: { slug },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("description" in data);
				expect(data).toMatchObject({ name });
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 404 for a project not linked to umbrella_consortium", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const { nonDariahItem } = await seed(db, 3);

				const response = await client["dariah-projects"].slugs[":slug"].$get({
					param: { slug: nonDariahItem.entity.slug },
				});

				expect(response.status).toBe(404);
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["dariah-projects"].slugs[":slug"].$get({
					param: { slug: "non-existing-slug" },
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
