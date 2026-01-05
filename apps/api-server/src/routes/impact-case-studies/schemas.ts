import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as v from "valibot";

import { PaginationQuerySchema } from "@/lib/schemas";

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

export const GetImpactCaseStudies = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			data: ImpactCaseStudyListSchema,
			limit: v.number(),
			offset: v.number(),
			total: v.number(),
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
