import { count, desc, eq, ilike, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

export type ServicesSort = "name" | "type" | "status" | "sshocMarketplaceId";

interface GetServicesParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: ServicesSort;
	dir?: "asc" | "desc";
}

export interface ServicesResult {
	data: Array<
		Pick<schema.Service, "id" | "name" | "sshocMarketplaceId"> & {
			status: Pick<schema.ServiceStatus, "status">;
			type: Pick<schema.ServiceType, "type">;
		}
	>;
	limit: number;
	offset: number;
	total: number;
}

export async function getServices(params: Readonly<GetServicesParams>): Promise<ServicesResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.services.name, `%${query}%`) : undefined;
	const orderBy =
		sort === "type"
			? dir === "asc"
				? schema.serviceTypes.type
				: desc(schema.serviceTypes.type)
			: sort === "status"
				? dir === "asc"
					? schema.serviceStatuses.status
					: desc(schema.serviceStatuses.status)
				: sort === "sshocMarketplaceId"
					? dir === "asc"
						? sql`${schema.services.sshocMarketplaceId} ASC NULLS LAST`
						: sql`${schema.services.sshocMarketplaceId} DESC NULLS LAST`
					: dir === "asc"
						? schema.services.name
						: desc(schema.services.name);

	const [data, aggregate] = await Promise.all([
		db
			.select({
				id: schema.services.id,
				name: schema.services.name,
				sshocMarketplaceId: schema.services.sshocMarketplaceId,
				status: schema.serviceStatuses.status,
				type: schema.serviceTypes.type,
			})
			.from(schema.services)
			.innerJoin(schema.serviceTypes, eq(schema.services.typeId, schema.serviceTypes.id))
			.innerJoin(schema.serviceStatuses, eq(schema.services.statusId, schema.serviceStatuses.id))
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.services)
			.innerJoin(schema.serviceTypes, eq(schema.services.typeId, schema.serviceTypes.id))
			.innerJoin(schema.serviceStatuses, eq(schema.services.statusId, schema.serviceStatuses.id))
			.where(where),
	]);

	return {
		data: data.map((item) => {
			return {
				id: item.id,
				name: item.name,
				sshocMarketplaceId: item.sshocMarketplaceId,
				status: { status: item.status },
				type: { type: item.type },
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}
