import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { alias, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";

export type ProjectPartnersSort =
	| "projectName"
	| "roleType"
	| "unitName"
	| "unitType"
	| "durationStart"
	| "durationEnd";

interface GetProjectPartnersParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: ProjectPartnersSort;
	dir?: "asc" | "desc";
}

export interface ProjectPartnersResult {
	data: Array<{
		id: string;
		projectAcronym: string | null;
		projectName: string;
		projectSlug: string;
		roleType: string;
		unitName: string;
		unitType: string;
		durationStart: Date | undefined;
		durationEnd: Date | undefined;
	}>;
	limit: number;
	offset: number;
	total: number;
}

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

export async function getProjectPartners(
	params: Readonly<GetProjectPartnersParams>,
): Promise<ProjectPartnersResult> {
	const { limit, offset, q, sort = "projectName", dir = "asc" } = params;
	// projectDocumentId / unitDocumentId are document ids; resolve each to its latest editable version.
	const projectEntities = alias(schema.entities, "project_entities");
	const projectDocumentLifecycle = alias(schema.documentLifecycle, "project_document_lifecycle");
	const unitDocumentLifecycle = alias(schema.documentLifecycle, "unit_document_lifecycle");
	const projectPickedVersion = sql`COALESCE(${projectDocumentLifecycle.draftId}, ${projectDocumentLifecycle.publishedId})`;
	const unitPickedVersion = sql`COALESCE(${unitDocumentLifecycle.draftId}, ${unitDocumentLifecycle.publishedId})`;
	const query = q?.trim();
	const searchWhere =
		query != null && query !== ""
			? or(
					ilike(schema.projects.name, `%${query}%`),
					ilike(schema.projectRoles.role, `%${query}%`),
					ilike(schema.organisationalUnits.name, `%${query}%`),
					ilike(schema.organisationalUnitTypes.type, `%${query}%`),
				)
			: undefined;
	const where = searchWhere;
	const orderBy =
		sort === "roleType"
			? dir === "asc"
				? schema.projectRoles.role
				: desc(schema.projectRoles.role)
			: sort === "unitName"
				? dir === "asc"
					? schema.organisationalUnits.name
					: desc(schema.organisationalUnits.name)
				: sort === "unitType"
					? dir === "asc"
						? schema.organisationalUnitTypes.type
						: desc(schema.organisationalUnitTypes.type)
					: sort === "durationStart"
						? dir === "asc"
							? sql`LOWER(${schema.projectsToOrganisationalUnits.duration}) ASC NULLS LAST`
							: sql`LOWER(${schema.projectsToOrganisationalUnits.duration}) DESC NULLS LAST`
						: sort === "durationEnd"
							? dir === "asc"
								? sql`UPPER(${schema.projectsToOrganisationalUnits.duration}) ASC NULLS LAST`
								: sql`UPPER(${schema.projectsToOrganisationalUnits.duration}) DESC NULLS LAST`
							: dir === "asc"
								? schema.projects.name
								: desc(schema.projects.name);

	const [rows, aggregate] = await Promise.all([
		db
			.select({
				id: schema.projectsToOrganisationalUnits.id,
				projectAcronym: schema.projects.acronym,
				projectName: schema.projects.name,
				projectSlug: projectEntities.slug,
				roleType: schema.projectRoles.role,
				unitName: schema.organisationalUnits.name,
				unitType: schema.organisationalUnitTypes.type,
				duration: schema.projectsToOrganisationalUnits.duration,
			})
			.from(schema.projectsToOrganisationalUnits)
			.innerJoin(
				projectEntities,
				eq(projectEntities.id, schema.projectsToOrganisationalUnits.projectDocumentId),
			)
			.innerJoin(
				projectDocumentLifecycle,
				eq(projectDocumentLifecycle.documentId, projectEntities.id),
			)
			.innerJoin(schema.projects, sql`${schema.projects.id} = ${projectPickedVersion}`)
			.innerJoin(
				schema.projectRoles,
				eq(schema.projectRoles.id, schema.projectsToOrganisationalUnits.roleId),
			)
			.innerJoin(
				unitDocumentLifecycle,
				eq(unitDocumentLifecycle.documentId, schema.projectsToOrganisationalUnits.unitDocumentId),
			)
			.innerJoin(
				schema.organisationalUnits,
				sql`${schema.organisationalUnits.id} = ${unitPickedVersion}`,
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.projectsToOrganisationalUnits)
			.innerJoin(
				projectEntities,
				eq(projectEntities.id, schema.projectsToOrganisationalUnits.projectDocumentId),
			)
			.innerJoin(
				projectDocumentLifecycle,
				eq(projectDocumentLifecycle.documentId, projectEntities.id),
			)
			.innerJoin(schema.projects, sql`${schema.projects.id} = ${projectPickedVersion}`)
			.innerJoin(
				schema.projectRoles,
				eq(schema.projectRoles.id, schema.projectsToOrganisationalUnits.roleId),
			)
			.innerJoin(
				unitDocumentLifecycle,
				eq(unitDocumentLifecycle.documentId, schema.projectsToOrganisationalUnits.unitDocumentId),
			)
			.innerJoin(
				schema.organisationalUnits,
				sql`${schema.organisationalUnits.id} = ${unitPickedVersion}`,
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where),
	]);

	return {
		data: rows.map((row) => {
			return {
				id: row.id,
				projectAcronym: row.projectAcronym,
				projectName: row.projectName,
				projectSlug: row.projectSlug,
				roleType: row.roleType,
				unitName: row.unitName,
				unitType: row.unitType,
				durationStart: row.duration?.start,
				durationEnd: row.duration?.end,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getProjectPartnersForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetProjectPartnersParams>,
): Promise<ProjectPartnersResult> {
	assertAdminUser(currentUser);

	return getProjectPartners(params);
}
