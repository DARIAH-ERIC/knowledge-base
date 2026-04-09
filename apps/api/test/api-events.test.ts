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

			const event = {
				id,
				title,
				summary: f.lorem.paragraph(),
				location: f.location.city(),
				duration: {
					start: f.date.future({ years: 2 }),
				},
			};

			return { entity, event };
		},
		{ count },
	);

	return items;
}

function createItemWithDuration(duration: { start: Date; end?: Date }) {
	const id = uuidv7();
	const documentId = uuidv7();
	const title = f.lorem.sentence();
	const slug = slugify(title);

	return {
		entity: { id, slug, documentId },
		event: {
			id,
			title,
			summary: f.lorem.paragraph(),
			location: f.location.city(),
			duration,
		},
	};
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [status, type, asset] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({ columns: { id: true }, where: { type: "events" } }),
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

	await db.insert(schema.events).values(
		items.map((item) => {
			return { ...item.event, imageId: asset.id };
		}),
	);

	await Promise.all(
		items.map((item) => {
			return seedContentBlock(db, item.entity.id, type.id, "content");
		}),
	);
}

describe("events", () => {
	describe("GET /api/events", () => {
		it("should return paginated list of events", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const title = item.event.title;

				const response = await client.events.$get({
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

	describe("GET /api/events/:id", () => {
		it("should return single event", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const title = item.event.title;

				const response = await client.events[":id"].$get({
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

				const items = createItems(3);
				await seed(db, items);

				const id = "no-uuid";

				const response = await client.events[":id"].$get({
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

				const response = await client.events[":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/events/slugs", () => {
		it("should return paginated list of slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client.events.slugs.$get({
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

	describe("GET /api/events/slugs/:slug", () => {
		it("should return single event", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(3);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const title = item.event.title;

				const response = await client.events.slugs[":slug"].$get({
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

				const items = createItems(3);
				await seed(db, items);

				const slug = "non-existing-slug";

				const response = await client.events.slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/events - from/until filters", () => {
		it("from: excludes events that ended before the from date", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const pastEvent = createItemWithDuration({
					start: new Date("2020-01-01T00:00:00Z"),
					end: new Date("2020-01-15T00:00:00Z"),
				});
				const futureEvent = createItemWithDuration({
					start: new Date("2030-06-01T00:00:00Z"),
				});

				await seed(db, [pastEvent, futureEvent]);

				const response = await client.events.$get({
					query: { from: "2025-01-01" },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ title: futureEvent.event.title })]),
				);
				expect(data.data).not.toEqual(
					expect.arrayContaining([expect.objectContaining({ title: pastEvent.event.title })]),
				);
			});
		});

		it("from: includes open-ended events regardless of start date", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Open-ended event that started far in the past relative to the `from` date — should
				// still appear because UPPER IS NULL satisfies the overlap condition.
				// Using a far-future `from` date to avoid interference from seed data.
				const oldOpenEndedEvent = createItemWithDuration({
					start: new Date("2090-01-01T00:00:00Z"),
				});

				await seed(db, [oldOpenEndedEvent]);

				const response = await client.events.$get({
					query: { from: "2090-06-01", limit: "100" },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ title: oldOpenEndedEvent.event.title }),
					]),
				);
			});
		});

		it("until: includes events that start on the until date (full-day inclusive)", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Starts at noon on the until date — should be included even though it's after midnight.
				const noonEvent = createItemWithDuration({
					start: new Date("2024-03-31T12:00:00Z"),
				});
				// Starts the day after — should be excluded.
				const nextDayEvent = createItemWithDuration({
					start: new Date("2024-04-01T00:00:00Z"),
				});

				await seed(db, [noonEvent, nextDayEvent]);

				const response = await client.events.$get({
					query: { until: "2024-03-31" },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ title: noonEvent.event.title })]),
				);
				expect(data.data).not.toEqual(
					expect.arrayContaining([expect.objectContaining({ title: nextDayEvent.event.title })]),
				);
			});
		});

		it("from+until: includes events that overlap the window (starts before until, ends after from)", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Starts in February, ends in March — must appear in the March calendar view.
				const crossMonthEvent = createItemWithDuration({
					start: new Date("2024-02-28T00:00:00Z"),
					end: new Date("2024-03-05T00:00:00Z"),
				});
				// Fully within March.
				const marchEvent = createItemWithDuration({
					start: new Date("2024-03-10T00:00:00Z"),
					end: new Date("2024-03-15T00:00:00Z"),
				});
				// Entirely before March.
				const januaryEvent = createItemWithDuration({
					start: new Date("2024-01-10T00:00:00Z"),
					end: new Date("2024-01-20T00:00:00Z"),
				});
				// Starts after March.
				const aprilEvent = createItemWithDuration({
					start: new Date("2024-04-05T00:00:00Z"),
				});

				await seed(db, [crossMonthEvent, marchEvent, januaryEvent, aprilEvent]);

				const response = await client.events.$get({
					query: { from: "2024-03-01", until: "2024-03-31" },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ title: crossMonthEvent.event.title }),
						expect.objectContaining({ title: marchEvent.event.title }),
					]),
				);
				expect(data.data).not.toEqual(
					expect.arrayContaining([
						expect.objectContaining({ title: januaryEvent.event.title }),
						expect.objectContaining({ title: aprilEvent.event.title }),
					]),
				);
			});
		});

		it("from+until=today: returns ongoing events (overlap semantics)", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const today = new Date();
				const yesterday = new Date(today);
				yesterday.setUTCDate(yesterday.getUTCDate() - 1);
				const tomorrow = new Date(today);
				tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

				// Started yesterday, ends tomorrow — ongoing.
				const ongoingEvent = createItemWithDuration({
					start: yesterday,
					end: tomorrow,
				});
				// Starts tomorrow — not yet started.
				const futureEvent = createItemWithDuration({
					start: tomorrow,
				});
				// Ended yesterday — already over.
				const pastEvent = createItemWithDuration({
					start: new Date("2020-01-01T00:00:00Z"),
					end: yesterday,
				});

				await seed(db, [ongoingEvent, futureEvent, pastEvent]);

				const todayStr = today.toISOString().slice(0, 10);

				const response = await client.events.$get({
					query: { from: todayStr, until: todayStr },
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ title: ongoingEvent.event.title })]),
				);
				expect(data.data).not.toEqual(
					expect.arrayContaining([
						expect.objectContaining({ title: futureEvent.event.title }),
						expect.objectContaining({ title: pastEvent.event.title }),
					]),
				);
			});
		});

		it("from+until with limit/offset: paginates correctly within the filtered window", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Five events in March 2024, seeded in reverse chronological order so that
				// offset-based paging gives a predictable subset to assert against.
				const marchEvents = [
					createItemWithDuration({ start: new Date("2024-03-25T00:00:00Z") }),
					createItemWithDuration({ start: new Date("2024-03-20T00:00:00Z") }),
					createItemWithDuration({ start: new Date("2024-03-15T00:00:00Z") }),
					createItemWithDuration({ start: new Date("2024-03-10T00:00:00Z") }),
					createItemWithDuration({ start: new Date("2024-03-05T00:00:00Z") }),
				];

				await seed(db, marchEvents);

				const page1 = await client.events.$get({
					query: { from: "2024-03-01", until: "2024-03-31", limit: "3", offset: "0" },
				});

				expect(page1.status).toBe(200);

				const page1Data = await page1.json();

				// Total reflects only the filtered window, not the whole table.
				expect(page1Data.total).toBeGreaterThanOrEqual(marchEvents.length);
				expect(page1Data.data).toHaveLength(3);

				const page2 = await client.events.$get({
					query: { from: "2024-03-01", until: "2024-03-31", limit: "3", offset: "3" },
				});

				expect(page2.status).toBe(200);

				const page2Data = await page2.json();

				expect(page2Data.data.length).toBeGreaterThanOrEqual(2);

				// No overlap between pages.
				const page1Ids = new Set(
					page1Data.data.map((e) => {
						return e.id;
					}),
				);
				expect(
					page2Data.data.every((e) => {
						return !page1Ids.has(e.id);
					}),
				).toBe(true);
			});
		});
	});

	describe("GET /api/events/:id - prev/next links", () => {
		it("middle event has both prev and next", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Far-future dates to avoid interference from seed data.
				const early = createItemWithDuration({ start: new Date("2090-01-01T00:00:00Z") });
				const middle = createItemWithDuration({ start: new Date("2091-06-01T00:00:00Z") });
				const late = createItemWithDuration({ start: new Date("2092-12-01T00:00:00Z") });

				await seed(db, [early, middle, late]);

				const response = await client.events[":id"].$get({ param: { id: middle.entity.id } });

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("links" in data);
				expect(data.links.prev).toMatchObject({ id: early.entity.id });
				expect(data.links.next).toMatchObject({ id: late.entity.id });
			});
		});

		it("earlier event links forward to later event", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Far-future dates so no seed-data event sits between them.
				const early = createItemWithDuration({ start: new Date("2093-01-01T00:00:00Z") });
				const late = createItemWithDuration({ start: new Date("2093-12-01T00:00:00Z") });

				await seed(db, [early, late]);

				const response = await client.events[":id"].$get({ param: { id: early.entity.id } });

				expect(response.status).toBe(200);

				const data = await response.json();

				// `next` must point to `late` — the immediately following event we seeded.
				// We don't assert `prev === null` because the pre-seeded database may contain
				// events with earlier start dates.
				assert("links" in data);
				expect(data.links.next).toMatchObject({ id: late.entity.id });
			});
		});

		it("last event has null next", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// Far-future dates to avoid interference from seed data.
				const early = createItemWithDuration({ start: new Date("2094-01-01T00:00:00Z") });
				const late = createItemWithDuration({ start: new Date("2094-12-01T00:00:00Z") });

				await seed(db, [early, late]);

				const response = await client.events[":id"].$get({ param: { id: late.entity.id } });

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("links" in data);
				expect(data.links.prev).toMatchObject({ id: early.entity.id });
				expect(data.links.next).toBeNull();
			});
		});

		it("same-day events: adjacent events are linked in stable (start, id) order", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				// All three start at the exact same timestamp — tests the tuple-cursor logic.
				// Far-future date so no seed-data event sits between them.
				const sameStart = new Date("2095-06-15T00:00:00Z");
				const a = createItemWithDuration({ start: sameStart });
				const b = createItemWithDuration({ start: sameStart });
				const c = createItemWithDuration({ start: sameStart });

				await seed(db, [a, b, c]);

				const responses = await Promise.all([
					client.events[":id"].$get({ param: { id: a.entity.id } }),
					client.events[":id"].$get({ param: { id: b.entity.id } }),
					client.events[":id"].$get({ param: { id: c.entity.id } }),
				]);

				const payloads = await Promise.all(
					responses.map((r) => {
						return r.json();
					}),
				);

				// Sort IDs the same way the (lower, id::text) tuple cursor does,
				// so we can assert that adjacency within the same-timestamp group is correct.
				// eslint-disable-next-line unicorn/no-array-sort
				const [firstId, middleId, lastId] = [a.entity.id, b.entity.id, c.entity.id].sort((x, y) => {
					return x.localeCompare(y);
				});

				assert(firstId != null && middleId != null && lastId != null);

				const findPayload = (id: string) => {
					const p = payloads.find((payload) => {
						return "id" in payload && payload.id === id;
					});
					assert(p != null && "links" in p);
					return p;
				};

				const first = findPayload(firstId);
				const middle = findPayload(middleId);
				const last = findPayload(lastId);

				// Middle event must link to its two immediate same-timestamp neighbours.
				expect(middle.links.prev).toMatchObject({ id: firstId });
				expect(middle.links.next).toMatchObject({ id: lastId });

				// Last event (highest id) must link back to middle.
				expect(last.links.prev).toMatchObject({ id: middleId });

				// First event (lowest id) must link forward to middle.
				expect(first.links.next).toMatchObject({ id: middleId });

				// No event points to itself.
				for (const payload of payloads) {
					assert("links" in payload);
					expect(payload.links.prev?.id).not.toBe(payload.id);
					expect(payload.links.next?.id).not.toBe(payload.id);
				}
			});
		});
	});
});
