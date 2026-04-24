import { asc, count, eq, ilike } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

interface GetServicesParams {
	limit: number;
	offset: number;
	q?: string;
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
	const { limit, offset, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== "" ? ilike(schema.services.name, `%${query}%`) : undefined;

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
			.orderBy(asc(schema.services.name))
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
