import { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import { describeRoute } from "hono-openapi";

import { getContentDispositionHeader } from "@/lib/asset-download";
import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import {
	GetDocumentOrPolicyById,
	GetDocumentOrPolicyBySlug,
	GetDocumentOrPolicyDocument,
	GetDocumentOrPolicySlugs,
	GetDocumentsPolicies,
	GetDocumentsPoliciesTree,
} from "@/routes/documents-policies/schemas";
import {
	getDocumentOrPolicyById,
	getDocumentOrPolicyBySlug,
	getDocumentOrPolicyDocument,
	getDocumentOrPolicyDocumentBySlug,
	getDocumentOrPolicySlugs,
	getDocumentsPolicies,
	getDocumentsPoliciesTree,
	isUuid,
} from "@/routes/documents-policies/service";
import { env } from "~/config/env.config";

function documentUrl(reference: string) {
	return new URL(`/api/v1/documents-policies/${reference}/document`, env.API_BASE_URL).href;
}

export const router = createRouter()
	/** GET /api/documents-policies */
	.get(
		"/",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Get documents and policies",
			description: "Retrieve a paginated list of documents and policies",
			operationId: "getDocumentsPolicies",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetDocumentsPolicies.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetDocumentsPolicies.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const result = await getDocumentsPolicies(db, { limit, offset });

			const data = {
				...result,
				data: result.data.map((item) => {
					return { ...item, document: { url: documentUrl(item.entity.slug) } };
				}),
			};

			const payload = await validate(GetDocumentsPolicies.ResponseSchema, data, 500);

			return c.json(payload);
		},
	)

	/** GET /api/documents-policies/tree */
	.get(
		"/tree",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Get ordered documents and policies tree",
			description: "Retrieve documents and policies grouped and ordered for display",
			operationId: "getDocumentsPoliciesTree",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetDocumentsPoliciesTree.ResponseSchema),
						},
					},
				},
			},
		}),
		async (c) => {
			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const result = await getDocumentsPoliciesTree(db);
			const data = {
				data: result.data.map((node) => {
					if (node.type === "item") {
						return { ...node, document: { url: documentUrl(node.entity.slug) } };
					}

					return {
						...node,
						items: node.items.map((item) => {
							return { ...item, document: { url: documentUrl(item.entity.slug) } };
						}),
					};
				}),
			};

			const payload = await validate(GetDocumentsPoliciesTree.ResponseSchema, data, 500);

			return c.json(payload);
		},
	)

	/** GET /api/documents-policies/slugs */
	.get(
		"/slugs",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Get document and policy slugs",
			description: "Retrieve a paginated list of document and policy slugs",
			operationId: "getDocumentOrPolicySlugs",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetDocumentOrPolicySlugs.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetDocumentOrPolicySlugs.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const data = await getDocumentOrPolicySlugs(db, { limit, offset });

			const payload = await validate(GetDocumentOrPolicySlugs.ResponseSchema, data, 500);

			return c.json(payload);
		},
	)

	/** GET /api/documents-policies/:id */
	.get(
		"/:id",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Get document or policy by id",
			description: "Retrieve a document or policy by id",
			operationId: "getDocumentOrPolicyById",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetDocumentOrPolicyById.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetDocumentOrPolicyById.ParamsSchema),
		async (c) => {
			const { id } = c.req.valid("param");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const result = await getDocumentOrPolicyById(db, { id });

			if (result == null) {
				return c.notFound();
			}

			const data = { ...result, document: { url: documentUrl(result.entity.slug) } };

			const payload = await validate(GetDocumentOrPolicyById.ResponseSchema, data, 500);

			return c.json(payload);
		},
	)

	/** GET /api/documents-policies/:id/document */
	.get(
		"/:id/document",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Download document or policy file",
			description: "Stream the S3-stored file for a document or policy by id or slug",
			operationId: "getDocumentOrPolicyFile",
			responses: {
				200: {
					description: "Binary file stream",
					content: {
						"application/pdf": {},
						"application/octet-stream": {},
					},
				},
				...NOT_FOUND,
			},
		}),
		validator("param", GetDocumentOrPolicyDocument.ParamsSchema),
		async (c) => {
			const idOrSlug = c.req.valid("param").id;

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const item = isUuid(idOrSlug)
				? await getDocumentOrPolicyDocument(db, { id: idOrSlug })
				: await getDocumentOrPolicyDocumentBySlug(db, { slug: idOrSlug });

			if (item == null) {
				return c.notFound();
			}

			const { key } = item.document;

			const storage = c.get("storage");
			assert(storage, "Storage must be provided via middleware.");

			const nodeStream = (await storage.download(key)).unwrap();
			const webStream = Readable.toWeb(nodeStream) as ReadableStream;

			return c.body(webStream, 200, {
				"Content-Disposition": getContentDispositionHeader(item.document),
				"Content-Type": item.document.mimeType,
			});
		},
	)

	/** GET /api/documents-policies/slugs/:slug */
	.get(
		"/slugs/:slug",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Get document or policy by slug",
			description: "Retrieve a document or policy by slug",
			operationId: "getDocumentOrPolicyBySlug",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetDocumentOrPolicyBySlug.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetDocumentOrPolicyBySlug.ParamsSchema),
		async (c) => {
			const { slug } = c.req.valid("param");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const result = await getDocumentOrPolicyBySlug(db, { slug });

			if (result == null) {
				return c.notFound();
			}

			const data = { ...result, document: { url: documentUrl(result.entity.slug) } };

			const payload = await validate(GetDocumentOrPolicyBySlug.ResponseSchema, data, 500);

			return c.json(payload);
		},
	);
