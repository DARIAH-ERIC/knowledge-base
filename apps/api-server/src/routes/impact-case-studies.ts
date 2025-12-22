import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import { ImpactCaseStudySelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, object, omit } from "valibot";
import { PaginationQuerySchema } from "../lib/pagination";
import { getImpactCaseStudy, getImpactCaseStudies } from "../lib/query-db";
import { PathParamsSchema } from "../lib/path";
import { PersonsResponseSchema } from "./persons";

export const impactCaseStudiesRoute = new Hono();

const ImpactCaseStudiesResponseSchema = object({
	...PaginationQuerySchema.entries,
	data: array(
		object({
			...omit(ImpactCaseStudySelectSchema, ["createdAt", "deletedAt", "updatedAt"]).entries,
			contributors: array(PersonsResponseSchema),
		}),
	),
});

const ImpactCaseStudyResponseSchema = omit(ImpactCaseStudySelectSchema, [
	"createdAt",
	"deletedAt",
	"updatedAt",
]);

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
		const { limit, offset } = c.req.valid("query");
		const data = await getImpactCaseStudies({ limit, offset });
		return c.json({
			limit,
			offset,
			data,
		});
	},
);

impactCaseStudiesRoute.get(
	"/:id",
	describeRoute({
		description: "Impact Case Study",
		responses: {
			200: {
				description: "Successful response",
				content: {
					"application/json": { schema: resolver(ImpactCaseStudyResponseSchema) },
				},
			},
		},
	}),
	validator("param", PathParamsSchema),
	async (c) => {
		const { id } = c.req.valid("param");
		const data = await getImpactCaseStudy({ id });
		return c.json(data);
	},
);
