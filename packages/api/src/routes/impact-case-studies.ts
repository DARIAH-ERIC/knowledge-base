import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { ImpactCaseStudySelectSchema } from "../../../database-client/src/schema/impact-case-studies";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../../lib/pagination";
import { getImpactCaseStudies } from "../../lib/query-db";

export const impactCaseStudiesRoute = new Hono();

const ImpactCaseStudiesResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(omit(ImpactCaseStudySelectSchema, ["createdAt", "deletedAt", "updatedAt"])),
});

impactCaseStudiesRoute.get(
	"/",
	describeRoute({
		description: "Impact Case Studies",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(ImpactCaseStudiesResponseSchema) },
				},
			},
		},
	}),
	validator("query", PaginationQuerySchema),
	async (c) => {
		const { page, pageSize } = c.req.valid("query");
		const data = await getImpactCaseStudies({ page, pageSize });
		return c.json({
			page,
			pageSize,
			data,
		});
	},
);
