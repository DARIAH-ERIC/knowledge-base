import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const ImpactCaseStudyBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.ImpactCaseStudySelectSchema, ["id", "title", "summary"]).entries,
		image: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Impact case study"),
	v.metadata({ ref: "ImpactCaseStudyBase" }),
);

export type ImpactCaseStudyBase = v.InferOutput<typeof ImpactCaseStudyBaseSchema>;

export const ImpactCaseStudyListSchema = v.pipe(
	v.array(ImpactCaseStudyBaseSchema),
	v.description("List of impact case studies"),
	v.metadata({ ref: "ImpactCaseStudyList" }),
);

export type ImpactCaseStudyList = v.InferOutput<typeof ImpactCaseStudyListSchema>;

export const ImpactCaseStudySchema = v.pipe(
	v.object({
		...v.pick(schema.ImpactCaseStudySelectSchema, ["id", "title", "summary"]).entries,
		image: v.object({ url: v.string() }),
		contributors: v.array(
			v.object({
				...v.pick(schema.PersonSelectSchema, ["id", "name"]).entries,
				image: v.object({ url: v.string() }),
			}),
		),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Impact case study"),
	v.metadata({ ref: "ImpactCaseStudy" }),
);

export type ImpactCaseStudy = v.InferOutput<typeof ImpactCaseStudySchema>;

export const ImpactCaseStudySlugSchema = v.pipe(
	v.object({
		...v.pick(schema.ImpactCaseStudySelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Impact case study slug"),
	v.metadata({ ref: "ImpactCaseStudySlug" }),
);

export type ImpactCaseStudySlug = v.InferOutput<typeof ImpactCaseStudySlugSchema>;

export const ImpactCaseStudySlugListSchema = v.pipe(
	v.array(ImpactCaseStudySlugSchema),
	v.description("List of impact case study slugs"),
	v.metadata({ ref: "ImpactCaseStudySlugList" }),
);

export type ImpactCaseStudySlugList = v.InferOutput<typeof ImpactCaseStudySlugListSchema>;

export const GetImpactCaseStudies = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: ImpactCaseStudyListSchema,
		}),
		v.description("Paginated list of impact case studies"),
		v.metadata({ ref: "GetImpactCaseStudiesResponse" }),
	),
};

export const GetImpactCaseStudyById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get impact case study by id params"),
		v.metadata({ ref: "GetImpactCaseStudyByIdParams" }),
	),
	ResponseSchema: ImpactCaseStudySchema,
};

export const GetImpactCaseStudySlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: ImpactCaseStudySlugListSchema,
		}),
		v.description("Paginated list of impact case study slugs"),
		v.metadata({ ref: "GetImpactCaseStudySlugsResponse" }),
	),
};

export const GetImpactCaseStudyBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get impact case study by slug params"),
		v.metadata({ ref: "GetImpactCaseStudyBySlugParams" }),
	),
	ResponseSchema: ImpactCaseStudySchema,
};
