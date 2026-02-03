import { assert } from "@acdh-oeaw/lib";
import { inArray } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
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
			const name = f.lorem.sentence();
			const slug = slugify(name);

			const entity = {
				id,
				slug,
				documentId,
			};

			const organisationalUnit = {
				id,
				name,
				summary: f.lorem.paragraph(),
			};

			return { entity, organisationalUnit };
		},
		{ count },
	);

	return items;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [
		status,
		entityType,
		asset,
		membersOrPartnersType,
		umbrellaConsortiumType,
		memberPartnerStatus,
	] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "organisational_units" },
		}),
		db.query.assets.findFirst({ columns: { id: true } }),
		db.query.organisationalUnitTypes.findFirst({
			columns: { id: true },
			where: { type: "consortium" },
		}),
		db.query.organisationalUnitTypes.findFirst({
			columns: { id: true },
			where: { type: "umbrella_consortium" },
		}),
		db
			.select()
			.from(schema.organisationalUnitStatus)
			.where(
				inArray(schema.organisationalUnitStatus.status, ["is_member", "is_cooperating_partner"]),
			),
	]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(asset, "No assets in database.");
	assert(membersOrPartnersType, "No consortium type in database.");
	assert(umbrellaConsortiumType, "No umbrella consortium type in database.");
	assert(memberPartnerStatus, "No member or partner status in database.");

	await db.insert(schema.entities).values(
		items.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: entityType.id };
		}),
	);

	await db
		.insert(schema.organisationalUnits)
		.values({
			...items[0]!.organisationalUnit,
			typeId: umbrellaConsortiumType.id,
			imageId: asset.id,
		});

	await db.insert(schema.organisationalUnits).values(
		items.slice(1).map((item) => {
			return { ...item.organisationalUnit, typeId: membersOrPartnersType.id, imageId: asset.id };
		}),
	);

	const start = f.date.past({ years: 5 });

	await db.insert(schema.organisationalUnitsRelations).values(
		items.slice(1).map((item) => {
			return {
				unitId: item.organisationalUnit.id,
				relatedUnitId: items[0]!.organisationalUnit.id,
				status: f.helpers.arrayElement(memberPartnerStatus).id,
				duration: {
					start,
				},
			};
		}),
	);
}

describe("members-partners", () => {
	describe("GET /api/members-partners", () => {
		it("should return paginated list of members and partners", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const name = item.organisationalUnit.name;

				const response = await client["members-partners"].$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(items.length - 1);
				expect(data.data).toEqual(expect.arrayContaining([expect.objectContaining({ name })]));
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/members-partners/:id", () => {
		it("should return single member or partner", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const name = item.organisationalUnit.name;

				const response = await client["members-partners"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data).toMatchObject({ name });
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const id = "no-uuid";

				const response = await client["members-partners"][":id"].$get({
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

				const items = createItems(5);
				await seed(db, items);

				const id = "019b75fd-6d6a-757c-acc2-c3c6266a0f31";

				const response = await client["members-partners"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/members-partners/slugs", () => {
		it("should return paginated list of slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client["members-partners"].slugs.$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(items.length - 1);
				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ entity: { slug } })]),
				);
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/members-partners/slugs/:slug", () => {
		it("should return single member or partner", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const name = item.organisationalUnit.name;

				const response = await client["members-partners"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data).toMatchObject({ name });
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const slug = "non-existing-slug";

				const response = await client["members-partners"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
