/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import {
	getOrganisationalUnitOptions,
	getOrganisationalUnitOptionsByIds,
} from "@/lib/data/organisational-units";
import { getSocialMediaOptions, getSocialMediaOptionsByIds } from "@/lib/data/social-media";
import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, sql } from "@/lib/db/sql";

export type ProjectsSort = "name" | "acronym" | "funding" | "scope";

interface GetProjectsParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: ProjectsSort;
	dir?: "asc" | "desc";
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

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

export async function getProjects(params: Readonly<GetProjectsParams>): Promise<ProjectsResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.projects.name, `%${query}%`) : undefined;
	const orderBy =
		sort === "acronym"
			? dir === "asc"
				? sql`${schema.projects.acronym} ASC NULLS LAST`
				: sql`${schema.projects.acronym} DESC NULLS LAST`
			: sort === "funding"
				? dir === "asc"
					? sql`${schema.projects.funding} ASC NULLS LAST`
					: sql`${schema.projects.funding} DESC NULLS LAST`
				: sort === "scope"
					? dir === "asc"
						? schema.projectScopes.scope
						: desc(schema.projectScopes.scope)
					: dir === "asc"
						? schema.projects.name
						: desc(schema.projects.name);

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
			.orderBy(orderBy)
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

export async function getProjectsForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetProjectsParams>,
): Promise<ProjectsResult> {
	assertAdminUser(currentUser);

	return getProjects(params);
}

export async function getProjectCreateDataForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	const [scopes, initialOrgUnits, roles, initialSocialMedia] = await Promise.all([
		db.query.projectScopes.findMany({
			orderBy: {
				scope: "asc",
			},
			columns: {
				id: true,
				scope: true,
			},
		}),
		getOrganisationalUnitOptions(),
		db.query.projectRoles.findMany({
			orderBy: { role: "asc" },
			columns: { id: true, role: true },
		}),
		getSocialMediaOptions(),
	]);

	return { initialOrgUnits, initialSocialMedia, roles, scopes };
}

export async function getProjectBySlugForAdmin(currentUser: Pick<User, "role">, slug: string) {
	assertAdminUser(currentUser);

	return db.query.projects.findFirst({
		where: {
			entity: {
				slug,
			},
		},
		columns: {
			acronym: true,
			call: true,
			duration: true,
			funding: true,
			id: true,
			name: true,
			summary: true,
			topic: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
				with: {
					status: {
						columns: {
							id: true,
							type: true,
						},
					},
				},
			},
			image: {
				columns: {
					key: true,
					label: true,
				},
			},
			scope: {
				columns: {
					id: true,
					scope: true,
				},
			},
		},
	});
}

export async function getProjectDetailsForAdmin(currentUser: Pick<User, "role">, slug: string) {
	assertAdminUser(currentUser);

	const project = await getProjectBySlugForAdmin(currentUser, slug);

	if (project == null) {
		return null;
	}

	const [descriptionRows, partners, socialMediaLinks] = await Promise.all([
		db
			.select({ content: schema.richTextContentBlocks.content })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityId, project.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		db.query.projectsToOrganisationalUnits.findMany({
			where: { projectId: project.id },
			columns: { id: true, duration: true },
			with: {
				unit: { columns: { name: true } },
				role: { columns: { role: true } },
			},
		}),
		db.query.projectsToSocialMedia.findMany({
			where: { projectId: project.id },
			columns: {},
			with: {
				socialMedia: {
					columns: { id: true, name: true, url: true },
					with: { type: { columns: { type: true } } },
				},
			},
		}),
	]);

	return {
		description: descriptionRows.at(0)?.content ?? null,
		partners: partners.map((partner) => {
			return {
				id: partner.id,
				unitName: partner.unit.name,
				roleName: partner.role.role,
				duration: partner.duration ?? null,
			};
		}),
		project,
		socialMedia: socialMediaLinks.map((link) => {
			return link.socialMedia;
		}),
	};
}

export async function getProjectEditDataForAdmin(currentUser: Pick<User, "role">, slug: string) {
	assertAdminUser(currentUser);

	const project = await getProjectBySlugForAdmin(currentUser, slug);

	if (project == null) {
		return null;
	}

	const [
		descriptionRows,
		scopes,
		initialOrgUnits,
		roles,
		initialSocialMedia,
		existingPartners,
		existingSocialMedia,
	] = await Promise.all([
		db
			.select({ content: schema.richTextContentBlocks.content })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityId, project.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		db.query.projectScopes.findMany({
			orderBy: { scope: "asc" },
			columns: { id: true, scope: true },
		}),
		getOrganisationalUnitOptions(),
		db.query.projectRoles.findMany({
			orderBy: { role: "asc" },
			columns: { id: true, role: true },
		}),
		getSocialMediaOptions(),
		db.query.projectsToOrganisationalUnits.findMany({
			where: { projectId: project.id },
			columns: { id: true, unitId: true, roleId: true, duration: true },
			with: {
				unit: { columns: { name: true } },
				role: { columns: { role: true } },
			},
		}),
		db.query.projectsToSocialMedia.findMany({
			where: { projectId: project.id },
			columns: { socialMediaId: true },
		}),
	]);

	const initialPartners = existingPartners.map((partner) => {
		return {
			id: partner.id,
			unitId: partner.unitId,
			unitName: partner.unit.name,
			roleId: partner.roleId,
			roleName: partner.role.role,
			durationStart:
				partner.duration?.start != null ? partner.duration.start.toISOString().slice(0, 10) : null,
			durationEnd:
				partner.duration?.end != null ? partner.duration.end.toISOString().slice(0, 10) : null,
		};
	});

	const initialSocialMediaIds = existingSocialMedia.map((row) => {
		return row.socialMediaId;
	});

	const [selectedSocialMediaItems, selectedPartnerUnits] = await Promise.all([
		getSocialMediaOptionsByIds(initialSocialMediaIds),
		getOrganisationalUnitOptionsByIds(
			initialPartners.map((partner) => {
				return partner.unitId;
			}),
		),
	]);

	return {
		description: descriptionRows.at(0)?.content,
		initialOrgUnits,
		initialPartners: initialPartners.map((partner) => {
			const matchedUnit = selectedPartnerUnits.find((unit) => {
				return unit.id === partner.unitId;
			});

			return { ...partner, unitName: matchedUnit?.name ?? partner.unitName };
		}),
		initialSocialMedia,
		initialSocialMediaIds,
		project,
		roles,
		scopes,
		selectedSocialMediaItems,
	};
}
