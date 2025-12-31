import * as schema from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import * as v from "valibot";

import { PaginationQuerySchema } from "@/lib/schemas";

export const PageBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.PageSelectSchema, ["id", "title", "summary"]).entries,
		image: v.pick(schema.AssetSelectSchema, ["key"]),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Page"),
	v.metadata({ ref: "PageBase" }),
);

export type PageBase = v.InferOutput<typeof PageBaseSchema>;

export const PageListSchema = v.pipe(
	v.array(PageBaseSchema),
	v.description("List of pages"),
	v.metadata({ ref: "PageList" }),
);

export type PageList = v.InferOutput<typeof PageListSchema>;

export const PageSchema = v.pipe(
	v.object({
		...v.pick(schema.PageSelectSchema, ["id", "title", "summary"]).entries,
		image: v.pick(schema.AssetSelectSchema, ["key"]),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Page"),
	v.metadata({ ref: "Page" }),
);

export type Page = v.InferOutput<typeof PageSchema>;

export const GetPages = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			data: PageListSchema,
			limit: v.number(),
			offset: v.number(),
			total: v.number(),
		}),
		v.description("Paginated list of pages"),
		v.metadata({ ref: "GetPagesResponse" }),
	),
};

export const GetPageById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get page by id params"),
		v.metadata({ ref: "GetPageByIdParams" }),
	),
	ResponseSchema: PageSchema,
};

export const GetPageBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get page by slug params"),
		v.metadata({ ref: "GetPageBySlugParams" }),
	),
	ResponseSchema: PageSchema,
};
