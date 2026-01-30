import { assert } from "@acdh-oeaw/lib";
import { describeRoute } from "hono-openapi";

import { createRouter } from "@/lib/factory";
import { resolver } from "@/lib/openapi/resolver";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import {
	GetMemberOrPartnerById,
	GetMemberOrPartnerBySlug,
	GetMembersAndPartners,
} from "@/routes/members-partners/schemas";
import {
	getMemberOrPartnerById,
	getMemberOrPartnerBySlug,
	getMembersAndPartners,
} from "@/routes/members-partners/service";

export const router = createRouter()
	/**
	 * GET /api/members-and-partners
	 */
	.get(
		"/",
		describeRoute({
			tags: ["members-and-partners"],
			summary: "Get members and partners",
			description: "Retrieve a paginated list of members and partners",
			operationId: "getMembersAndPartners",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetMembersAndPartners.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
			},
		}),
		validator("query", GetMembersAndPartners.QuerySchema),
		async (c) => {
			const { limit, offset } = c.req.valid("query");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const data = await getMembersAndPartners(db, { limit, offset });

			const payload = await validate(GetMembersAndPartners.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/members-and-partners/:id
	 */
	.get(
		"/:id",
		describeRoute({
			tags: ["members-and-partners"],
			summary: "Get member or partner by id",
			description: "Retrieve a member or partner by id",
			operationId: "getMembersAndPartnersById",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetMemberOrPartnerById.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetMemberOrPartnerById.ParamsSchema),
		async (c) => {
			const { id } = c.req.valid("param");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const data = await getMemberOrPartnerById(db, { id });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetMemberOrPartnerById.ResponseSchema, data);

			return c.json(payload);
		},
	)

	/**
	 * GET /api/members-and-partners/slugs/:slug
	 */
	.get(
		"/slugs/:slug",
		describeRoute({
			tags: ["members-and-partners"],
			summary: "Get member or partner by slug",
			description: "Retrieve a member or partner by slug",
			operationId: "getMemberOrPartnerBySlug",
			responses: {
				200: {
					description: "Success response",
					content: {
						"application/json": {
							schema: resolver(GetMemberOrPartnerBySlug.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetMemberOrPartnerBySlug.ParamsSchema),
		async (c) => {
			const { slug } = c.req.valid("param");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const data = await getMemberOrPartnerBySlug(db, { slug });

			if (data == null) {
				return c.notFound();
			}

			const payload = await validate(GetMemberOrPartnerBySlug.ResponseSchema, data);

			return c.json(payload);
		},
	);
