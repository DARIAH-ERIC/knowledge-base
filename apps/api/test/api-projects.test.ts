import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import type { Project } from "@/routes/projects/schemas";
import { createTestClient } from "~/test/lib/create-test-client";
import { seedContentBlock } from "~/test/lib/seed-content-block";
import { withTransaction } from "~/test/lib/with-transaction";

function createItems(count: number) {
	const items = f.helpers.multiple(
		() => {
			const id = uuidv7();
			const documentId = uuidv7();
			const name = f.lorem.sentence();
			const slug = slugify(name);

			const entity = {
				id,
				slug,
				documentId,
			};

			const project = {
				id,
				name,
				summary: f.lorem.paragraph(),
				call: f.lorem.word(),
				topic: f.lorem.word(),
				duration: {
					start: f.date.past({ years: 5 }),
				},
			};

			return { entity, project };
		},
		{ count },
	);

	return items;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [status, entityType, scope, unitEntityType, unitType, projectRole] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({ columns: { id: true }, where: { type: "projects" } }),
		db.query.projectScopes.findFirst({ columns: { id: true } }),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "organisational_units" },
		}),
		db.query.organisationalUnitTypes.findFirst({ columns: { id: true } }),
		db.query.projectRoles.findFirst({ columns: { id: true } }),
	]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(scope, "No project scope in database.");
	assert(unitEntityType, "No organisational unit entity type in database.");
	assert(unitType, "No organisational unit type in database.");
	assert(projectRole, "No project role in database.");

	await db.insert(schema.entities).values(
		items.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: entityType.id };
		}),
	);

	await db.insert(schema.projects).values(
		items.map((item) => {
			return { ...item.project, scopeId: scope.id };
		}),
	);

	const unitId = uuidv7();

	await db.insert(schema.entities).values({
		id: unitId,
		slug: `unit-${unitId}`,
		documentId: uuidv7(),
		statusId: status.id,
		typeId: unitEntityType.id,
	});

	await db.insert(schema.organisationalUnits).values({
		id: unitId,
		name: f.company.name(),
		summary: f.lorem.paragraph(),
		typeId: unitType.id,
	});

	await db.insert(schema.projectsToOrganisationalUnits).values(
		items.map((item) => {
			return {
				projectId: item.project.id,
				unitId,
				roleId: projectRole.id,
			};
		}),
	);

	await Promise.all(
		items.map((item) => {
			return seedContentBlock(db, item.entity.id, entityType.id, "description");
		}),
	);
}

async function seedSocialMedia(db: Database, projectId: string) {
	const type = await db.query.socialMediaTypes.findFirst({
		columns: { id: true },
		where: { type: "mastodon" },
	});

	assert(type, "No social media type in database.");

	const [socialMedia] = await db
		.insert(schema.socialMedia)
		.values({
			name: f.internet.displayName(),
			url: f.internet.url(),
			duration: { start: f.date.past() },
			typeId: type.id,
		})
		.returning({
			id: schema.socialMedia.id,
			url: schema.socialMedia.url,
		});

	assert(socialMedia);

	await db
		.insert(schema.projectsToSocialMedia)
		.values({ projectId, socialMediaId: socialMedia.id });

	return socialMedia;
}

describe("projects", () => {
	describe("GET /api/projects", () => {
		it("should return paginated list of projects", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const name = item.project.name;

				const response = await client.projects.$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(items.length);
				expect(data.data).toEqual(expect.arrayContaining([expect.objectContaining({ name })]));
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});

		it("should return social media in response", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(1);
				await seed(db, items);

				const item = items.at(0)!;
				const id = item.entity.id;

				const sm = await seedSocialMedia(db, id);

				const response = await client.projects[":id"].$get({
					param: { id },
				});

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as Project;

				expect(data.socialMedia).toHaveLength(1);
				expect(data.socialMedia).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							url: sm.url,
							type: "mastodon",
						}),
					]),
				);
			});
		});
	});

	describe("GET /api/projects/:id", () => {
		it("should return single project with institutions", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const name = item.project.name;

				const response = await client.projects[":id"].$get({
					param: { id },
				});

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as Project;

				expect(data).toMatchObject({ name });
				expect(data.institutions).toHaveLength(1);
				expect(data.institutions[0]).toMatchObject({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					id: expect.any(String),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					name: expect.any(String),
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					type: expect.any(String),
				});
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client.projects[":id"].$get({
					param: { id: "no-uuid" },
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client.projects[":id"].$get({
					param: { id: "019b75fd-6d6a-757c-acc2-c3c6266a0f31" },
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/projects/slugs", () => {
		it("should return paginated list of slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client.projects.slugs.$get({
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

	describe("GET /api/projects/slugs/:slug", () => {
		it("should return single project", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const name = item.project.name;

				const response = await client.projects.slugs[":slug"].$get({
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

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client.projects.slugs[":slug"].$get({
					param: { slug: "non-existing-slug" },
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
