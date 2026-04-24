import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockSchema } from "@/lib/content-blocks";
import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const MemberOrPartnerBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, [
			"id",
			"name",
			"summary",
			"metadata",
			"sshocMarketplaceActorId",
		]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		publishedAt: v.pipe(v.string(), v.isoTimestamp()),
		type: v.literal(schema.membersAndPartnersUnitType),
		status: v.picklist(schema.membersAndPartnersUnitStatusEnum),
		socialMedia: v.array(
			v.object({
				...v.pick(schema.SocialMediaSelectSchema, ["id", "name", "url"]).entries,
				duration: v.nullable(
					v.object({
						start: v.string(),
						end: v.nullable(v.string()),
					}),
				),
				type: v.picklist(schema.socialMediaTypesEnum),
			}),
		),
	}),
	v.description("Member or partner"),
	v.metadata({ ref: "MemberOrPartnerBase" }),
);

export type MemberOrPartnerBase = v.InferOutput<typeof MemberOrPartnerBaseSchema>;

export const ContributorSchema = v.pipe(
	v.object({
		...v.pick(schema.PersonSelectSchema, ["id", "name"]).entries,
		position: v.nullable(
			v.array(v.object({ role: v.picklist(schema.personRoleTypesEnum), name: v.string() })),
		),
		image: v.object({ url: v.string() }),
		slug: v.string(),
		role: v.picklist([
			"national_coordinator",
			"national_coordinator_deputy",
			"national_representative",
			"national_representative_deputy",
		] as const),
	}),
	v.description("Contributor"),
	v.metadata({ ref: "Contributor" }),
);

export type Contributor = v.InferOutput<typeof ContributorSchema>;

export const PartnerInstitutionSchema = v.pipe(
	v.object({
		name: v.string(),
		slug: v.string(),
		website: v.nullable(v.string()),
	}),
	v.description("Partner institution"),
	v.metadata({ ref: "PartnerInstitution" }),
);

export type PartnerInstitution = v.InferOutput<typeof PartnerInstitutionSchema>;

export const NationalConsortiumSchema = v.pipe(
	v.object({
		name: v.string(),
		slug: v.string(),
		image: v.nullable(v.object({ url: v.string() })),
	}),
	v.description("National consortium"),
	v.metadata({ ref: "NationalConsortium" }),
);

export type NationalConsortium = v.InferOutput<typeof NationalConsortiumSchema>;

export const MemberOrPartnerListSchema = v.pipe(
	v.array(MemberOrPartnerBaseSchema),
	v.description("List of members and partners"),
	v.metadata({ ref: "MemberOrPartnerList" }),
);

export type MemberOrPartnerList = v.InferOutput<typeof MemberOrPartnerListSchema>;

export const MemberOrPartnerSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, [
			"id",
			"name",
			"summary",
			"metadata",
			"sshocMarketplaceActorId",
		]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		publishedAt: v.pipe(v.string(), v.isoTimestamp()),
		type: v.literal(schema.membersAndPartnersUnitType),
		status: v.picklist(schema.membersAndPartnersUnitStatusEnum),
		contributors: v.array(ContributorSchema),
		institutions: v.array(PartnerInstitutionSchema),
		nationalConsortium: v.nullable(NationalConsortiumSchema),
		socialMedia: v.array(
			v.object({
				...v.pick(schema.SocialMediaSelectSchema, ["id", "name", "url"]).entries,
				duration: v.nullable(
					v.object({
						start: v.string(),
						end: v.nullable(v.string()),
					}),
				),
				type: v.picklist(schema.socialMediaTypesEnum),
			}),
		),
		description: v.optional(v.array(ContentBlockSchema), []),
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
