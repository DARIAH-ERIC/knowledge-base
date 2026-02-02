import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const MemberOrPartnerBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id", "name", "summary", "metadata"]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		type: v.literal(schema.membersAndPartnersUnitType),
		status: v.picklist(schema.membersAndPartnersUnitStatusEnum),
	}),
	v.description("Member or partner"),
	v.metadata({ ref: "MemberOrPartnerBase" }),
);

export type MemberOrPartnerBase = v.InferOutput<typeof MemberOrPartnerBaseSchema>;

export const MemberOrPartnerListSchema = v.pipe(
	v.array(MemberOrPartnerBaseSchema),
	v.description("List of members and partners"),
	v.metadata({ ref: "MemberOrPartnerList" }),
);

export type MemberOrPartnerList = v.InferOutput<typeof MemberOrPartnerListSchema>;

export const MemberOrPartnerSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id", "name", "summary", "metadata"]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		type: v.literal(schema.membersAndPartnersUnitType),
		status: v.picklist(schema.membersAndPartnersUnitStatusEnum),
	}),
	v.description("Member or partner"),
	v.metadata({ ref: "MemberOrPartner" }),
);

export type MemberOrPartner = v.InferOutput<typeof MemberOrPartnerSchema>;

export const MemberOrPartnerSlugSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Member or partner slug"),
	v.metadata({ ref: "MemberOrPartnerSlug" }),
);

export type MembersOrPartnerSlug = v.InferOutput<typeof MemberOrPartnerSlugSchema>;

export const MemberOrPartnerSlugListSchema = v.pipe(
	v.array(MemberOrPartnerSlugSchema),
	v.description("List of member or partner slugs"),
	v.metadata({ ref: "MemberOrPartnerSlugList" }),
);

export type MemberOrPartnerSlugList = v.InferOutput<typeof MemberOrPartnerSlugListSchema>;

export const GetMembersAndPartners = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: MemberOrPartnerListSchema,
		}),
		v.description("Paginated list of members and partners"),
		v.metadata({ ref: "GetMembersAndPartnersResponse" }),
	),
};

export const GetMemberOrPartnerById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get member or partner by id params"),
		v.metadata({ ref: "GetMemberOrPartnerByIdParams" }),
	),
	ResponseSchema: MemberOrPartnerSchema,
};

export const GetMemberOrPartnerSlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: MemberOrPartnerSlugListSchema,
		}),
		v.description("Paginated list of member or partner slugs"),
		v.metadata({ ref: "GetMemberOrPartnerSlugsResponse" }),
	),
};

export const GetMemberOrPartnerBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get member or partner by slug params"),
		v.metadata({ ref: "GetMemberOrPartnerBySlugParams" }),
	),
	ResponseSchema: MemberOrPartnerSchema,
};
