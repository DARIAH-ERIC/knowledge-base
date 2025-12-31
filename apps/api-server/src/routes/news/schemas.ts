import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as v from "valibot";

import { PaginationQuerySchema } from "@/lib/schemas";

export const NewsItemBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.NewsItemSelectSchema, ["id", "title", "summary"]).entries,
		image: v.pick(schema.AssetSelectSchema, ["key"]),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("NewsItem"),
	v.metadata({ ref: "NewsItemBase" }),
);

export type NewsItemBase = v.InferOutput<typeof NewsItemBaseSchema>;

export const NewsItemListSchema = v.pipe(
	v.array(NewsItemBaseSchema),
	v.description("List of news"),
	v.metadata({ ref: "NewsItemList" }),
);

export type NewsItemList = v.InferOutput<typeof NewsItemListSchema>;

export const NewsItemSchema = v.pipe(
	v.object({
		...v.pick(schema.NewsItemSelectSchema, ["id", "title", "summary"]).entries,
		image: v.pick(schema.AssetSelectSchema, ["key"]),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("NewsItem"),
	v.metadata({ ref: "NewsItem" }),
);

export type NewsItem = v.InferOutput<typeof NewsItemSchema>;

export const GetNews = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			data: NewsItemListSchema,
			limit: v.number(),
			offset: v.number(),
			total: v.number(),
		}),
		v.description("Paginated list of news"),
		v.metadata({ ref: "GetNewsResponse" }),
	),
};

export const GetNewsItemById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get news item by id params"),
		v.metadata({ ref: "GetNewsItemByIdParams" }),
	),
	ResponseSchema: NewsItemSchema,
};

export const GetNewsItemBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get news item by slug params"),
		v.metadata({ ref: "GetNewsItemBySlugParams" }),
	),
	ResponseSchema: NewsItemSchema,
};
