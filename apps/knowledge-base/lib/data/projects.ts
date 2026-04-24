import { asc, count, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

interface GetProjectsParams {
	limit: number;
	offset: number;
	q?: string;
}

export interface ProjectsResult {
	data: Array<
		Pick<schema.Project, "acronym" | "duration" | "funding" | "id" | "name"> & {
			entity: Pick<schema.Entity, "slug">;
			scope: Pick<schema.ProjectScope, "id" | "scope">;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

export async function getProjects(params: Readonly<GetProjectsParams>): Promise<ProjectsResult> {
	const { limit, offset, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.projects.name, `%${query}%`) : undefined;

	const [data, aggregate] = await Promise.all([
		db
			.select({
				acronym: schema.projects.acronym,
				duration: schema.projects.duration,
				funding: schema.projects.funding,
				id: schema.projects.id,
				name: schema.projects.name,
				scope: schema.projectScopes.scope,
				scopeId: schema.projectScopes.id,
				slug: schema.entities.slug,
			})
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.projectScopes, eq(schema.projects.scopeId, schema.projectScopes.id))
			.where(where)
			.orderBy(asc(schema.projects.name))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.projects)
			.innerJoin(schema.entities, eq(schema.projects.id, schema.entities.id))
			.innerJoin(schema.projectScopes, eq(schema.projects.scopeId, schema.projectScopes.id))
			.where(where),
	]);

	return {
		data: data.map((item) => {
			return {
				acronym: item.acronym,
				duration: item.duration,
				entity: { slug: item.slug },
				funding: item.funding,
				id: item.id,
				name: item.name,
				scope: {
					id: item.scopeId,
					scope: item.scope,
				},
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}
