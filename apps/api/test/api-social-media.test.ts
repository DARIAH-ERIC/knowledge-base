import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { createTestClient } from "~/test/lib/create-test-client";
import { withTransaction } from "~/test/lib/with-transaction";

function createItems(count: number, typeId: string) {
	const items = f.helpers.multiple(
		() => {
			const id = uuidv7();
			const name = f.internet.displayName();

			const socialMedia = {
				id,
				name,
				url: f.internet.url(),
				duration: {
					start: f.date.past(),
					end: f.date.future(),
				},
				typeId,
			};

			return { socialMedia };
		},
		{ count },
	);

	return items;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	await db.insert(schema.socialMedia).values(
		items.map((item) => {
			return item.socialMedia;
		}),
	);
}

async function seedType(db: Database) {
	const id = uuidv7();
	await db.insert(schema.socialMediaTypes).values({ id, type: "mastodon" });
	return id;
}

describe("social-media", () => {
	describe("GET /api/social-media", () => {
		it("should return paginated list of social media", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const typeId = await seedType(db);
				const items = createItems(3, typeId);
				await seed(db, items);

				const item = items.at(1)!;
				const name = item.socialMedia.name;

				const response = await client["social-media"].$get({
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
	});

	describe("GET /api/social-media/:id", () => {
		it("should return single social media entry", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const typeId = await seedType(db);
				const items = createItems(3, typeId);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.socialMedia.id;
				const name = item.socialMedia.name;

				const response = await client["social-media"][":id"].$get({
					param: { id },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data).toMatchObject({ name });
				expect(data.duration).toMatchObject({ start: expect.any(String) });
				expect(data.type).toMatchObject({ type: "mastodon" });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["social-media"][":id"].$get({
					param: { id: "no-uuid" },
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const response = await client["social-media"][":id"].$get({
					param: { id: "019b75fd-6d6a-757c-acc2-c3c6266a0f31" },
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
