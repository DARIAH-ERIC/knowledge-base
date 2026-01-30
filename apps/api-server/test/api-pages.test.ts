import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { createTestClient } from "~/test/lib/create-test-client";
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

			const page = {
				id,
				title,
				summary: f.lorem.paragraph(),
			};

			return { entity, page };
		},
		{ count },
	);

	return items;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [status, type, asset] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({ columns: { id: true }, where: { type: "pages" } }),
		db.query.assets.findFirst({ columns: { id: true } }),
	]);

	assert(status, "No entity status in database.");
	assert(type, "No entity type in database.");
	assert(asset, "No assets in database.");

	await db.insert(schema.entities).values(
		items.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: type.id };
		}),
	);

	await db.insert(schema.pages).values(
		items.map((item) => {
			return { ...item.page, imageId: asset.id };
		}),
	);
}

describe("pages", () => {
	describe("GET /api/pages", () => {
		it("should return paginated list of pages", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const title = item.page.title;

				const response = await client.pages.$get({
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

	describe("GET /api/pages/:id", () => {
		it("should return single page", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const title = item.page.title;

				const response = await client.pages[":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data).toMatchObject({ title });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const id = "no-uuid";

				const response = await client.pages[":id"].$get({
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

				const response = await client.pages[":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/pages/slugs/:slug", () => {
		it("should return single page", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const title = item.page.title;

				const response = await client.pages.slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data).toMatchObject({ title });
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const slug = "non-existing-slug";

				const response = await client.pages.slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
