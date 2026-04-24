import { asc, count, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

interface GetPersonsParams {
	limit: number;
	offset: number;
	q?: string;
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
	const { limit, offset, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.persons.name, `%${query}%`) : undefined;

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
			.orderBy(asc(schema.persons.sortName))
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
