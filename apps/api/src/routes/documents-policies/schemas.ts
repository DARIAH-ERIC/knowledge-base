import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const DocumentOrPolicyBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.DocumentOrPolicySelectSchema, ["id", "title", "summary", "url"]).entries,
		document: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Document or policy"),
	v.metadata({ ref: "DocumentOrPolicyBase" }),
);

export type DocumentOrPolicyBase = v.InferOutput<typeof DocumentOrPolicyBaseSchema>;

export const DocumentOrPolicyListSchema = v.pipe(
	v.array(DocumentOrPolicyBaseSchema),
	v.description("List of documents and policies"),
	v.metadata({ ref: "DocumentOrPolicyList" }),
);

export type DocumentOrPolicyList = v.InferOutput<typeof DocumentOrPolicyListSchema>;

export const DocumentOrPolicySchema = v.pipe(
	v.object({
		...v.pick(schema.DocumentOrPolicySelectSchema, ["id", "title", "summary", "url"]).entries,
		document: v.object({ url: v.string() }),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Document or policy"),
	v.metadata({ ref: "DocumentOrPolicy" }),
);

export type DocumentOrPolicy = v.InferOutput<typeof DocumentOrPolicySchema>;

export const DocumentOrPolicySlugSchema = v.pipe(
	v.object({
		...v.pick(schema.DocumentOrPolicySelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Document or policy slug"),
	v.metadata({ ref: "DocumentOrPolicySlug" }),
);

export type DocumentOrPolicySlug = v.InferOutput<typeof DocumentOrPolicySlugSchema>;

export const DocumentOrPolicySlugListSchema = v.pipe(
	v.array(DocumentOrPolicySlugSchema),
	v.description("List of document or policy slugs"),
	v.metadata({ ref: "DocumentOrPolicySlugList" }),
);

export type DocumentOrPolicySlugList = v.InferOutput<typeof DocumentOrPolicySlugListSchema>;

export const GetDocumentsPolicies = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: DocumentOrPolicyListSchema,
		}),
		v.description("Paginated list of documents and policies"),
		v.metadata({ ref: "GetDocumentsPoliciesResponse" }),
	),
};

export const GetDocumentOrPolicyById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get document or policy by id params"),
		v.metadata({ ref: "GetDocumentOrPolicyByIdParams" }),
	),
	ResponseSchema: DocumentOrPolicySchema,
};

export const GetDocumentOrPolicySlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: DocumentOrPolicySlugListSchema,
		}),
		v.description("Paginated list of document or policy slugs"),
		v.metadata({ ref: "GetDocumentOrPolicySlugsResponse" }),
	),
};

export const GetDocumentOrPolicyBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get document or policy by slug params"),
		v.metadata({ ref: "GetDocumentOrPolicyBySlugParams" }),
	),
	ResponseSchema: DocumentOrPolicySchema,
};
