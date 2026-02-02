import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const MembersAndPartnersBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id", "name", "summary", "metadata"]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		type: v.literal(schema.membersAndPartnersUnitType),
		status: v.picklist(schema.membersAndPartnersUnitStatusEnum),
	}),
	v.description("Members and Partners"),
	v.metadata({ ref: "MembersAndPartnersBase" }),
);

export type MembersAndPartnersBase = v.InferOutput<typeof MembersAndPartnersBaseSchema>;

export const MembersAndPartnersListSchema = v.pipe(
	v.array(MembersAndPartnersBaseSchema),
	v.description("List of members and partners"),
	v.metadata({ ref: "MembersAndPartnersList" }),
);

export type MembersAndPartnersList = v.InferOutput<typeof MembersAndPartnersListSchema>;

export const MembersAndPartnersSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id", "name", "summary", "metadata"]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		type: v.literal(schema.membersAndPartnersUnitType),
		status: v.picklist(schema.membersAndPartnersUnitStatusEnum),
	}),
	v.description("Members and Partners"),
	v.metadata({ ref: "MembersAndPartners" }),
);

export type MembersAndPartners = v.InferOutput<typeof MembersAndPartnersSchema>;

export const GetMembersAndPartners = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: MembersAndPartnersListSchema,
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
	ResponseSchema: MembersAndPartnersSchema,
};

export const GetMemberOrPartnerBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get member or partner by slug params"),
		v.metadata({ ref: "GetMemberOrPartnerBySlugParams" }),
	),
	ResponseSchema: MembersAndPartnersSchema,
};
