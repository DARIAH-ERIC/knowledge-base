import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { count, desc, eq, ilike, sql } from "@/lib/db/sql";

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
