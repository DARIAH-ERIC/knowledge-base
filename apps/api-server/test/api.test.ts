import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import { api } from "@/app";

const client = testClient(api);

describe("events endpoints", () => {
	it("GET /api/events should return paginated list of events", async () => {
		const limit = 20;
		const offset = 0;

		const response = await client.events.$get({
			query: {
				limit: String(limit),
				offset: String(offset),
			},
		});

		const data = await response.json();

		expect(data.total).toBe(25);
		expect(data.data.length).toBe(limit);
		expect(data.limit).toBe(limit);
		expect(data.offset).toBe(offset);
	});
});
