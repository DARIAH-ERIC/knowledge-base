import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ContentBlockSchema } from "@/lib/content-blocks";
import { PaginatedResponseSchema, PaginationQuerySchema } from "@/lib/schemas";

export const ProjectInstitutionSchema = v.pipe(
	v.object({
		...v.pick(schema.OrganisationalUnitSelectSchema, ["id", "name"]).entries,
		type: v.picklist(schema.organisationalUnitTypesEnum),
	}),
	v.description("Project institution"),
	v.metadata({ ref: "ProjectInstitution" }),
);

export const ProjectBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.ProjectSelectSchema, [
			"id",
			"name",
			"summary",
			"call",
			"funders",
			"topic",
			"funding",
		]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		duration: v.object({
			start: v.pipe(v.string(), v.isoDateTime()),
			env: v.optional(v.pipe(v.string(), v.isoDateTime()))
		}),
		institutions: v.array(ProjectInstitutionSchema),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		scope: v.object({ scope: v.picklist(schema.projectScopesEnum) }),
		publishedAt: v.string(),
	}),
	v.description("Project"),
	v.metadata({ ref: "ProjectBase" }),
);

export type ProjectBase = v.InferOutput<typeof ProjectBaseSchema>;

export const ProjectListSchema = v.pipe(
	v.array(ProjectBaseSchema),
	v.description("List of projects"),
	v.metadata({ ref: "ProjectList" }),
);

export type ProjectList = v.InferOutput<typeof ProjectListSchema>;

export const ProjectSchema = v.pipe(
	v.object({
		...v.pick(schema.ProjectSelectSchema, [
			"id",
			"name",
			"summary",
			"call",
			"funders",
			"topic",
			"funding",
		]).entries,
		image: v.nullable(v.object({ url: v.string() })),
		duration: v.object({
			start: v.pipe(v.string(), v.isoDateTime()),
			env: v.optional(v.pipe(v.string(), v.isoDateTime()))
		}),
		institutions: v.array(ProjectInstitutionSchema),
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
		scope: v.object({ scope: v.picklist(schema.projectScopesEnum) }),
		publishedAt: v.string(),
		description: v.array(ContentBlockSchema),
	}),
	v.description("Project"),
	v.metadata({ ref: "Project" }),
);

export type Project = v.InferOutput<typeof ProjectSchema>;

export const ProjectSlugSchema = v.pipe(
	v.object({
		...v.pick(schema.ProjectSelectSchema, ["id"]).entries,
		entity: v.pick(schema.EntitySelectSchema, ["slug"]),
	}),
	v.description("Project slug"),
	v.metadata({ ref: "ProjectSlug" }),
);

export type ProjectSlug = v.InferOutput<typeof ProjectSlugSchema>;

export const ProjectSlugListSchema = v.pipe(
	v.array(ProjectSlugSchema),
	v.description("List of project slugs"),
	v.metadata({ ref: "ProjectSlugList" }),
);

export type ProjectSlugList = v.InferOutput<typeof ProjectSlugListSchema>;

export const GetProjects = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: ProjectListSchema,
		}),
		v.description("Paginated list of projects"),
		v.metadata({ ref: "GetProjectsResponse" }),
	),
};

export const GetProjectById = {
	ParamsSchema: v.pipe(
		v.object({
			id: v.pipe(v.string(), v.uuid()),
		}),
		v.description("Get project by id params"),
		v.metadata({ ref: "GetProjectByIdParams" }),
	),
	ResponseSchema: ProjectSchema,
};

export const GetProjectSlugs = {
	QuerySchema: PaginationQuerySchema,
	ResponseSchema: v.pipe(
		v.object({
			...PaginatedResponseSchema.entries,
			data: ProjectSlugListSchema,
		}),
		v.description("Paginated list of project slugs"),
		v.metadata({ ref: "GetProjectSlugsResponse" }),
	),
};

export const GetProjectBySlug = {
	ParamsSchema: v.pipe(
		v.object({
			slug: v.string(),
		}),
		v.description("Get project by slug params"),
		v.metadata({ ref: "GetProjectBySlugParams" }),
	),
	ResponseSchema: ProjectSchema,
};
