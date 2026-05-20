import { assert } from "@acdh-oeaw/lib";
import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { validate } from "@/lib/openapi/validator";
import { GetOrganigram } from "@/routes/organigram/schemas";
import { getOrganigram } from "@/routes/organigram/service";

export const router = createRouter().get(
	"/",
	describeRoute({
		tags: ["organigram"],
		summary: "Get organigram",
		description: "Retrieve organigram nodes and edges",
		operationId: "getOrganigram",
		responses: {
			200: {
				description: "Success response",
				content: {
					"application/json": {
						schema: resolver(GetOrganigram.ResponseSchema),
					},
				},
			},
		},
	}),
	async (c) => {
		const db = c.get("db");
		assert(db, "Database must be provided via middleware.");

		const data = await getOrganigram(db);
		const payload = await validate(GetOrganigram.ResponseSchema, data, 500);

		return c.json(payload);
	},
);
