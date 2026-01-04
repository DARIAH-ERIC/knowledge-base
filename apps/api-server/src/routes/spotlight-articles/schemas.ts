import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as v from "valibot";

import { PaginationQuerySchema } from "@/lib/schemas";

export const SpotlightArticleBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.SpotlightArticleSelectSchema, ["id", "title", "summary"]).entries,
		image: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Spotlight article"),
	v.metadata({ ref: "SpotlightArticleBase" }),
);

export type SpotlightArticleBase = v.InferOutput<typeof SpotlightArticleBaseSchema>;

export const SpotlightArticleListSchema = v.pipe(
	v.array(SpotlightArticleBaseSchema),
	v.description("List of spotlight articles"),
	v.metadata({ ref: "SpotlightArticleList" }),
);

export type SpotlightArticleList = v.InferOutput<typeof SpotlightArticleListSchema>;

export const SpotlightArticleSchema = v.pipe(
	v.object({
		...v.pick(schema.SpotlightArticleSelectSchema, ["id", "title", "summary"]).entries,
		image: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Spotlight article"),
	v.metadata({ ref: "SpotlightArticle" }),
);

export type SpotlightArticle = v.InferOutput<typeof SpotlightArticleSchema>;

export const GetSpotlightArticles = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			data: SpotlightArticleListSchema,
			limit: v.number(),
			offset: v.number(),
			total: v.number(),
		}),
		v.description("Paginated list of spotlight articles"),
		v.metadata({ ref: "GetSpotlightArticlesResponse" }),
	),
};

export const GetSpotlightArticleById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get spotlight article by id params"),
		v.metadata({ ref: "GetSpotlightArticleByIdParams" }),
	),
	ResponseSchema: SpotlightArticleSchema,
};

export const GetSpotlightArticleBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get spotlight article by slug params"),
		v.metadata({ ref: "GetSpotlightArticleBySlugParams" }),
	),
	ResponseSchema: SpotlightArticleSchema,
};
