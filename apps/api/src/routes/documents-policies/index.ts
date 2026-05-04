import { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import {
	GetDocumentOrPolicyById,
	GetDocumentOrPolicyBySlug,
	GetDocumentOrPolicySlugs,
	GetDocumentsPolicies,
} from "@/routes/documents-policies/schemas";
import {
	getDocumentOrPolicyById,
	getDocumentOrPolicyBySlug,
	getDocumentOrPolicyDocument,
	getDocumentOrPolicySlugs,
	getDocumentsPolicies,
} from "@/routes/documents-policies/service";
import { env } from "~/config/env.config";

function documentUrl(id: string) {
	return new URL(`/api/v1/documents-policies/${id}/document`, env.API_BASE_URL).href;
}

export const router = createRouter()
	/**
	 * GET /api/documents-policies
	 */
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
					return { ...item, document: { url: documentUrl(item.id) } };
				}),
			};

			const payload = await validate(GetDocumentsPolicies.ResponseSchema, data, 500);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/documents-policies/slugs
	 */
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

	/**
	 * GET /api/documents-policies/:id
	 */
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

			const data = { ...result, document: { url: documentUrl(result.id) } };

			const payload = await validate(GetDocumentOrPolicyById.ResponseSchema, data, 500);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/documents-policies/:id/document
	 */
	.get(
		"/:id/document",
		describeRoute({
			tags: ["documents-policies"],
			summary: "Download document or policy file",
			description: "Stream the S3-stored file for a document or policy",
			operationId: "getDocumentOrPolicyFile",
			responses: {
				200: {
					description: "Binary file stream",
					content: {
						"application/octet-stream": {},
					},
				},
				...NOT_FOUND,
			},
		}),
		validator("param", GetDocumentOrPolicyById.ParamsSchema),
		async (c) => {
			const { id } = c.req.valid("param");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const item = await getDocumentOrPolicyDocument(db, { id });

			if (item == null) {
				return c.notFound();
			}

			const { key } = item.document;
			const filename = key.split("/").pop() ?? "document";

			const storage = c.get("storage");
			assert(storage, "Storage must be provided via middleware.");

			const nodeStream = (await storage.download(key)).unwrap();
			const webStream = Readable.toWeb(nodeStream) as ReadableStream;

			return c.body(webStream, 200, {
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Content-Type": "application/octet-stream",
			});
		},
	)

	/**
	 * GET /api/documents-policies/slugs/:slug
	 */
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

			const data = { ...result, document: { url: documentUrl(result.id) } };

			const payload = await validate(GetDocumentOrPolicyBySlug.ResponseSchema, data, 500);

			return c.json(payload);
		},
	);
