import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockSchema } from "@/lib/content-blocks";
import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

const opportunityBaseObject = v.object({
	...v.pick(schema.OpportunitySelectSchema, ["id", "title", "summary"]).entries,
	source: v.pick(schema.OpportunitySourceSelectSchema, ["id", "source"]),
	website: v.nullable(v.string()),
	duration: v.object({
		start: v.pipe(v.string(), v.isoTimestamp()),
		end: v.optional(v.pipe(v.string(), v.isoTimestamp())),
	}),
	entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	publishedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export const OpportunityBaseSchema = v.pipe(
	opportunityBaseObject,
	v.description("Opportunity"),
	v.metadata({ ref: "OpportunityBase" }),
);

export type OpportunityBase = v.InferOutput<typeof OpportunityBaseSchema>;

export const OpportunityListSchema = v.pipe(
	v.array(OpportunityBaseSchema),
	v.description("List of opportunities"),
	v.metadata({ ref: "OpportunityList" }),
);

export type OpportunityList = v.InferOutput<typeof OpportunityListSchema>;

export const OpportunitySchema = v.pipe(
	v.object({
		...opportunityBaseObject.entries,
		content: v.optional(v.array(ContentBlockSchema), []),
		relatedEntities: v.optional(
			v.array(
				v.object({
					id: v.pipe(v.string(), v.uuid()),
					slug: v.string(),
					entityType: v.string(),
					label: v.nullable(v.string()),
				}),
			),
			[],
		),
		relatedResources: v.optional(
			v.array(
				v.object({
					id: v.string(),
					label: v.string(),
					type: v.nullable(v.string()),
					links: v.array(v.string()),
				}),
			),
			[],
		),
	}),
	v.description("Opportunity"),
	v.metadata({ ref: "Opportunity" }),
);

export type Opportunity = v.InferOutput<typeof OpportunitySchema>;

export const OpportunitySlugSchema = v.pipe(
	v.object({
		...v.pick(schema.OpportunitySelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Opportunity slug"),
	v.metadata({ ref: "OpportunitySlug" }),
);

export type OpportunitySlug = v.InferOutput<typeof OpportunitySlugSchema>;

export const OpportunitySlugListSchema = v.pipe(
	v.array(OpportunitySlugSchema),
	v.description("List of opportunity slugs"),
	v.metadata({ ref: "OpportunitySlugList" }),
);

export type OpportunitySlugList = v.InferOutput<typeof OpportunitySlugListSchema>;

export const GetOpportunities = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: OpportunityListSchema,
		}),
		v.description("Paginated list of opportunities"),
		v.metadata({ ref: "GetOpportunitiesResponse" }),
	),
};

export const GetOpportunityById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get opportunity by id params"),
		v.metadata({ ref: "GetOpportunityByIdParams" }),
	),
	ResponseSchema: OpportunitySchema,
};

export const GetOpportunitySlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: OpportunitySlugListSchema,
		}),
		v.description("Paginated list of opportunity slugs"),
		v.metadata({ ref: "GetOpportunitySlugsResponse" }),
	),
};

export const GetOpportunityBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get opportunity by slug params"),
		v.metadata({ ref: "GetOpportunityBySlugParams" }),
	),
	ResponseSchema: OpportunitySchema,
};
