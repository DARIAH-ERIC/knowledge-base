import { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import type { AssetMetadata, StorageService } from "@dariah-eric/storage";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { createTestClient } from "~/test/lib/create-test-client";
import { seedContentBlock } from "~/test/lib/seed-content-block";
import { withTransaction } from "~/test/lib/with-transaction";
import { Result, type InferOk } from "better-result";

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

			const documentOrPolicy = {
				id,
				title,
				summary: f.lorem.paragraph(),
				url: f.internet.url(),
			};

			return { entity, documentOrPolicy };
		},
		{ count },
	);

	return items;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [status, type, asset] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "documents_policies" },
		}),
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

	await db.insert(schema.documentsPolicies).values(
		items.map((item) => {
			return { ...item.documentOrPolicy, documentId: asset.id };
		}),
	);

	await Promise.all(
		items.map((item) => {
			return seedContentBlock(db, item.entity.id, type.id, "description");
		}),
	);
}

function createMockStorage(content = "test file content"): StorageService {
	return {
		// eslint-disable-next-line @typescript-eslint/require-await
		async upload() {
			return Result.ok({ key: "" });
		},
		// eslint-disable-next-line @typescript-eslint/require-await
		async download() {
			return Result.ok(Readable.from([Buffer.from(content)]));
		},
		// eslint-disable-next-line @typescript-eslint/require-await
		async delete() {
			throw new Error("Not implemented");
		},
	};
}

describe("documents-policies", () => {
	describe("GET /api/documents-policies", () => {
		it("should return paginated list of documents and policies", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const title = item.documentOrPolicy.title;

				const response = await client["documents-policies"].$get({
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

	describe("GET /api/documents-policies/:id", () => {
		it("should return single document or policy with document url", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const title = item.documentOrPolicy.title;

				const response = await client["documents-policies"][":id"].$get({
					param: { id },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("description" in data);
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				expect(data).toMatchObject({ title, document: { url: expect.stringContaining(id) } });
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["documents-policies"][":id"].$get({
					param: { id: "no-uuid" },
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["documents-policies"][":id"].$get({
					param: { id: "019b75fd-6d6a-757c-acc2-c3c6266a0f31" },
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/documents-policies/slugs", () => {
		it("should return paginated list of slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client["documents-policies"].slugs.$get({
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

	describe("GET /api/documents-policies/slugs/:slug", () => {
		it("should return single document or policy", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const title = item.documentOrPolicy.title;

				const response = await client["documents-policies"].slugs[":slug"].$get({
					param: { slug },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("description" in data);
				expect(data).toMatchObject({ title });
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["documents-policies"].slugs[":slug"].$get({
					param: { slug: "non-existing-slug" },
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/documents-policies/:id/document", () => {
		async function seedDocument(db: Database, key: string) {
			const [status, type] = await Promise.all([
				db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
				db.query.entityTypes.findFirst({
					columns: { id: true },
					where: { type: "documents_policies" },
				}),
			]);

			assert(status, "No entity status in database.");
			assert(type, "No entity type in database.");

			const id = uuidv7();
			const assetId = uuidv7();
			const title = "Test Policy";
			const summary = "Test summary";
			const mimeType = "text/plain";

			await db.insert(schema.assets).values({ id: assetId, key, label: title, mimeType });
			await db
				.insert(schema.entities)
				.values({ id, slug: `doc-${id}`, statusId: status.id, typeId: type.id });
			await db.insert(schema.documentsPolicies).values({
				id,
				title,
				summary,
				url: "https://example.com",
				documentId: assetId,
			});

			return { id };
		}

		it("should stream file with correct headers for existing record", async () => {
			await withTransaction(async (db) => {
				const content = "test file content";
				const key = "documents/policy-2024.pdf";
				const { id } = await seedDocument(db, key);
				const client = createTestClient(db, createMockStorage(content));

				const response = await client["documents-policies"][":id"].document.$get({
					param: { id },
				});

				expect(response.status).toBe(200);
				expect(response.headers.get("Content-Type")).toBe("application/octet-stream");
				expect(response.headers.get("Content-Disposition")).toBe(
					`attachment; filename="policy-2024.pdf"`,
				);
				const body = await response.text();
				expect(body).toBe(content);
			});
		});

		it("should use last segment of asset key as download filename", async () => {
			await withTransaction(async (db) => {
				const key = "some/nested/path/annual-report.pdf";
				const { id } = await seedDocument(db, key);
				const client = createTestClient(db, createMockStorage());

				const response = await client["documents-policies"][":id"].document.$get({
					param: { id },
				});

				expect(response.status).toBe(200);
				expect(response.headers.get("Content-Disposition")).toBe(
					`attachment; filename="annual-report.pdf"`,
				);
			});
		});

		it("should return 404 for valid UUID with no record", async () => {
			await withTransaction(async (db) => {
				let storageCalled = false;
				const storage: StorageService = createMockStorage();
				const client = createTestClient(db, storage);

				const response = await client["documents-policies"][":id"].document.$get({
					param: { id: "019b75fd-6d6a-757c-acc2-c3c6266a0f31" },
				});

				expect(response.status).toBe(404);
				expect(storageCalled).toBe(false);
			});
		});

		it("should return 400 for non-UUID id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db, createMockStorage());

				const response = await client["documents-policies"][":id"].document.$get({
					param: { id: "no-uuid" },
				});

				expect(response.status).toBe(400);
			});
		});
	});
});
