import { and, asc, count, eq, ilike, or } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

interface GetGovernanceBodiesParams {
	limit: number;
	offset: number;
	q?: string;
}

export interface GovernanceBodiesResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "acronym" | "id" | "name"> & {
			entity: Pick<schema.Entity, "slug">;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

export async function getGovernanceBodies(
	params: Readonly<GetGovernanceBodiesParams>,
): Promise<GovernanceBodiesResult> {
	const { limit, offset, q } = params;
	const query = q?.trim();
	const governanceBodyType =
		"governance_body" as typeof schema.organisationalUnitTypes.$inferSelect.type;
	const where =
		query != null && query !== ""
			? and(
					eq(schema.organisationalUnitTypes.type, governanceBodyType),
					or(
						ilike(schema.organisationalUnits.acronym, `%${query}%`),
						ilike(schema.organisationalUnits.name, `%${query}%`),
					),
				)
			: eq(schema.organisationalUnitTypes.type, governanceBodyType);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				acronym: schema.organisationalUnits.acronym,
				id: schema.organisationalUnits.id,
				name: schema.organisationalUnits.name,
				slug: schema.entities.slug,
			})
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.where(where)
			.orderBy(asc(schema.organisationalUnits.name))
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.innerJoin(schema.entities, eq(schema.organisationalUnits.id, schema.entities.id))
			.where(where),
	]);

	return {
		data: items.map((item) => {
			return {
				acronym: item.acronym,
				entity: { slug: item.slug },
				id: item.id,
				name: item.name,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}
