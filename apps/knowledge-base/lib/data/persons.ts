/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";

export type PersonsSort = "name" | "email" | "orcid";

interface GetPersonsParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: PersonsSort;
	dir?: "asc" | "desc";
}

export interface PersonsResult {
	data: Array<
		Pick<schema.Person, "email" | "id" | "name" | "orcid"> & {
			documentId: string;
			entity: Pick<schema.Entity, "slug">;
			hasDraft: boolean;
			isPublished: boolean;
			updatedAt: Date;
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

export async function getPersons(params: Readonly<GetPersonsParams>): Promise<PersonsResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.persons.name, `%${query}%`) : undefined;
	const orderBy =
		sort === "email"
			? dir === "asc"
				? sql`${schema.persons.email} ASC NULLS LAST`
				: sql`${schema.persons.email} DESC NULLS LAST`
			: sort === "orcid"
				? dir === "asc"
					? sql`${schema.persons.orcid} ASC NULLS LAST`
					: sql`${schema.persons.orcid} DESC NULLS LAST`
				: dir === "asc"
					? schema.persons.sortName
					: desc(schema.persons.sortName);

	const [data, aggregate] = await Promise.all([
		db
			.select({
				documentId: schema.entities.id,
				email: schema.persons.email,
				id: schema.persons.id,
				name: schema.persons.name,
				orcid: schema.persons.orcid,
				slug: schema.entities.slug,
				updatedAt: schema.entityVersions.updatedAt,
				isPublished: sql<boolean>`
					EXISTS (
						SELECT
							1
						FROM
							"entity_versions" AS "pv"
							INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
						WHERE
							"pv"."entity_id" = ${schema.entityVersions.entityId}
							AND "ps"."type" = 'published'
					)
				`,
				hasDraft: sql<boolean>`
					EXISTS (
						SELECT 1
						FROM "entity_versions" AS "dv"
						INNER JOIN "entity_status" AS "ds" ON "dv"."status_id" = "ds"."id"
						WHERE
							"dv"."entity_id" = ${schema.entityVersions.entityId}
							AND "ds"."type" = 'draft'
							AND (
								NOT EXISTS (
									SELECT 1
									FROM "entity_versions" AS "pv"
									INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
									WHERE
										"pv"."entity_id" = ${schema.entityVersions.entityId}
										AND "ps"."type" = 'published'
								)
								OR "dv"."updated_at" > (
									SELECT "pv"."updated_at"
									FROM "entity_versions" AS "pv"
									INNER JOIN "entity_status" AS "ps" ON "pv"."status_id" = "ps"."id"
									WHERE
										"pv"."entity_id" = ${schema.entityVersions.entityId}
										AND "ps"."type" = 'published'
									LIMIT 1
								)
							)
					)
				`,
				status: schema.entityStatus.type,
			})
			.from(schema.persons)
			.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(
				and(
					or(
						eq(schema.entityStatus.type, "draft"),
						and(
							eq(schema.entityStatus.type, "published"),
							sql`
								NOT EXISTS (
									SELECT
										1
									FROM
										"entity_versions" AS "ev2"
										INNER JOIN "entity_status" AS "es2" ON "ev2"."status_id" = "es2"."id"
									WHERE
										"ev2"."entity_id" = ${schema.entityVersions.entityId}
										AND "es2"."type" = 'draft'
								)
							`,
						),
					),
					where,
				),
			)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.persons)
			.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
			.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
			.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
			.where(
				and(
					or(
						eq(schema.entityStatus.type, "draft"),
						and(
							eq(schema.entityStatus.type, "published"),
							sql`
								NOT EXISTS (
									SELECT
										1
									FROM
										"entity_versions" AS "ev2"
										INNER JOIN "entity_status" AS "es2" ON "ev2"."status_id" = "es2"."id"
									WHERE
										"ev2"."entity_id" = ${schema.entityVersions.entityId}
										AND "es2"."type" = 'draft'
								)
							`,
						),
					),
					where,
				),
			),
	]);

	return {
		data: data.map((item) => {
			return {
				documentId: item.documentId,
				email: item.email,
				entity: { slug: item.slug },
				hasDraft: item.hasDraft,
				id: item.id,
				isPublished: item.isPublished,
				name: item.name,
				orcid: item.orcid,
				updatedAt: item.updatedAt,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getPersonsForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetPersonsParams>,
): Promise<PersonsResult> {
	assertAdminUser(currentUser);

	return getPersons(params);
}

export async function getPersonBySlugForAdmin(currentUser: Pick<User, "role">, slug: string) {
	assertAdminUser(currentUser);

	return db.query.persons.findFirst({
		where: {
			entityVersion: {
				entity: {
					slug,
				},
			},
		},
		columns: {
			id: true,
			email: true,
			name: true,
			orcid: true,
			sortName: true,
		},
		with: {
			entityVersion: {
				columns: { id: true },
				with: {
					entity: {
						columns: {
							id: true,
							slug: true,
						},
					},
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
		},
	});
}

export async function getPersonEditDataForAdmin(currentUser: Pick<User, "role">, slug: string) {
	assertAdminUser(currentUser);

	const person = await getPersonBySlugForAdmin(currentUser, slug);

	if (person == null) {
		return null;
	}

	const biographyRows = await db
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
				eq(schema.fields.entityVersionId, person.id),
				eq(schema.entityTypesFieldsNames.fieldName, "biography"),
			),
		)
		.limit(1);

	return {
		biography: biographyRows.at(0)?.content,
		person,
	};
}
