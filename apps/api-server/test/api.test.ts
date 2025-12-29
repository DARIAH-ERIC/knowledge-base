import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import { api } from "@/app";

const client = testClient(api);

describe("events endpoints", () => {
	it("GET /api/events should return paginated list of events", async () => {
		const response = await client.events.$get({
			cookie: {},
			form: {},
			header: {},
			json: {},
			param: {},
			query: { limit: "10", offset: "0" },
		});

		const { data, total } = await response.json();

		expect(total).toBe(25);
		expect(data.length).toBe(10);
	});
});
