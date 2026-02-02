import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import { openapi } from "@/app";
import { createApp } from "@/lib/factory";

describe("news", () => {
	describe("GET /docs/openapi.json", () => {
		it("should return openapi spec document", async () => {
			const client = testClient(createApp().route("/docs", openapi));

			const response = await client.docs["openapi.json"].$get();

			expect(response.status).toBe(200);

			const data = (await response.json()) as { openapi: string };

			expect(data.openapi).toBe("3.1.0");
		});
	});
});
