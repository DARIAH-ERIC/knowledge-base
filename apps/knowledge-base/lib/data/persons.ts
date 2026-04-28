/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { and, count, desc, eq, ilike, sql } from "@/lib/db/sql";

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
			entity: Pick<schema.Entity, "slug">;
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
				email: schema.persons.email,
				id: schema.persons.id,
				name: schema.persons.name,
				orcid: schema.persons.orcid,
				slug: schema.entities.slug,
			})
			.from(schema.persons)
			.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.persons)
			.innerJoin(schema.entities, eq(schema.persons.id, schema.entities.id))
			.where(where),
	]);

	return {
		data: data.map((item) => {
			return {
				email: item.email,
				entity: { slug: item.slug },
				id: item.id,
				name: item.name,
				orcid: item.orcid,
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
			entity: {
				slug,
			},
		},
		columns: {
			id: true,
			email: true,
			name: true,
			orcid: true,
			position: true,
			sortName: true,
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
				eq(schema.fields.entityId, person.id),
				eq(schema.entityTypesFieldsNames.fieldName, "biography"),
			),
		)
		.limit(1);

	return {
		biography: biographyRows.at(0)?.content,
		person,
	};
}
