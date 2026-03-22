import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockSchema } from "@/lib/content-blocks";
import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const WorkingGroupBaseSchema = v.pipe(
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
		socialMedia: v.array(
			v.object({
				...v.pick(schema.SocialMediaSelectSchema, ["id", "name", "url"]).entries,
				duration: v.object({
					start: v.string(),
					end: v.nullable(v.string()),
				}),
				type: v.picklist(schema.socialMediaTypesEnum),
			}),
		),
	}),
	v.description("Working group"),
	v.metadata({ ref: "WorkingGroupBase" }),
);

export type WorkingGroupBase = v.InferOutput<typeof WorkingGroupBaseSchema>;

export const WorkingGroupListSchema = v.pipe(
	v.array(WorkingGroupBaseSchema),
	v.description("List of working groups"),
	v.metadata({ ref: "WorkingGroupList" }),
);

export type WorkingGroupList = v.InferOutput<typeof WorkingGroupListSchema>;

export const WorkingGroupSchema = v.pipe(
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
		socialMedia: v.array(
			v.object({
				...v.pick(schema.SocialMediaSelectSchema, ["id", "name", "url"]).entries,
				duration: v.object({
					start: v.string(),
					end: v.nullable(v.string()),
				}),
				type: v.picklist(schema.socialMediaTypesEnum),
			}),
		),
		description: v.array(ContentBlockSchema),
	}),
	v.description("Working group"),
	v.metadata({ ref: "WorkingGroup" }),
);

export type WorkingGroup = v.InferOutput<typeof WorkingGroupSchema>;

export const WorkingGroupSlugSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Working group slug"),
	v.metadata({ ref: "WorkingGroupSlug" }),
);

export type WorkingGroupSlug = v.InferOutput<typeof WorkingGroupSlugSchema>;

export const WorkingGroupSlugListSchema = v.pipe(
	v.array(WorkingGroupSlugSchema),
	v.description("List of working group slugs"),
	v.metadata({ ref: "WorkingGroupSlugList" }),
);

export type WorkingGroupSlugList = v.InferOutput<typeof WorkingGroupSlugListSchema>;

export const GetWorkingGroups = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: WorkingGroupListSchema,
		}),
		v.description("Paginated list of working groups"),
		v.metadata({ ref: "GetWorkingGroupsResponse" }),
	),
};

export const GetWorkingGroupById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get working group by id params"),
		v.metadata({ ref: "GetWorkingGroupByIdParams" }),
	),
	ResponseSchema: WorkingGroupSchema,
};

export const GetWorkingGroupSlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: WorkingGroupSlugListSchema,
		}),
		v.description("Paginated list of working group slugs"),
		v.metadata({ ref: "GetWorkingGroupSlugsResponse" }),
	),
};

export const GetWorkingGroupBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get working group by slug params"),
		v.metadata({ ref: "GetWorkingGroupBySlugParams" }),
	),
	ResponseSchema: WorkingGroupSchema,
};
