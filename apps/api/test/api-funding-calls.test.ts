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

			const fundingCall = {
				id,
				title,
				summary: f.lorem.paragraph(),
				duration: {
					start: f.date.future({ years: 2 }),
				},
			};

			return { entity, fundingCall };
		},
		{ count },
	);

	return items;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [status, type] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({ columns: { id: true }, where: { type: "funding_calls" } }),
	]);

	assert(status, "No entity status in database.");
	assert(type, "No entity type in database.");

	await db.insert(schema.entities).values(
		items.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: type.id };
		}),
	);

	await db.insert(schema.fundingCalls).values(items.map((item) => item.fundingCall));

	await Promise.all(
		items.map((item) => {
			return seedContentBlock(db, item.entity.id, type.id, "content");
		}),
	);
}

describe("funding-calls", () => {
	describe("GET /api/funding-calls", () => {
		it("should return paginated list of funding calls", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const title = item.fundingCall.title;

				const response = await client["funding-calls"].$get({
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

	describe("GET /api/funding-calls/:id", () => {
		it("should return single funding call", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const title = item.fundingCall.title;

				const response = await client["funding-calls"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("content" in data);
				expect(data).toMatchObject({ title });
				expect(data.content).toHaveLength(1);
				expect(data.content[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["funding-calls"][":id"].$get({
					param: {
						id: "no-uuid",
					},
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["funding-calls"][":id"].$get({
					param: {
						id: "019b75fd-6d6a-757c-acc2-c3c6266a0f31",
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/funding-calls/slugs", () => {
		it("should return paginated list of funding call slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client["funding-calls"].slugs.$get({
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

	describe("GET /api/funding-calls/slugs/:slug", () => {
		it("should return single funding call", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const title = item.fundingCall.title;

				const response = await client["funding-calls"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("content" in data);
				expect(data).toMatchObject({ title });
				expect(data.content).toHaveLength(1);
				expect(data.content[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["funding-calls"].slugs[":slug"].$get({
					param: {
						slug: "non-existing-slug",
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
