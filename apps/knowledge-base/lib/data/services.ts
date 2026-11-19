/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { publishedEntityVersionWhere } from "@/lib/data/current-entity-version";
import {
	getOrganisationalUnitOptions,
	getOrganisationalUnitOptionsByDocumentIds,
} from "@/lib/data/organisational-units";
import { db } from "@/lib/db";
import { matchesAllTerms } from "@/lib/db/search";
import { type SQL, and, count, desc, eq, isNotNull, isNull, sql } from "@/lib/db/sql";
import {
	toOrganisationalUnitDocumentOption,
	toOrganisationalUnitDocumentOptionsPage,
} from "@/lib/organisational-unit-options";
import { getServiceStatusLabel } from "@/lib/service-status-label";

export type ServicesSort =
	| "name"
	| "type"
	| "status"
	| "sshocMarketplaceId"
	| "serviceOwners"
	| "serviceProviders";

interface GetServicesParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: ServicesSort;
	type: "internal" | "sshoc";
	dir?: "asc" | "desc";
}

export interface ServicesResult {
	data: Array<
		Pick<schema.Service, "id" | "name" | "sshocMarketplaceId"> & {
			status: Pick<schema.ServiceStatus, "status">;
			type: Pick<schema.ServiceType, "type">;
			/** Comma-separated names of the published owner units, or `null` when there are none. */
			serviceOwners: string | null;
			/** Comma-separated names of the published provider units, or `null` when there are none. */
			serviceProviders: string | null;
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

/**
 * Correlated subquery listing, alphabetically and comma-separated, the names of the published
 * organisational units linked to the outer query's service in the given role. Yields `null` when
 * the service has no such unit, so it sorts last and renders as empty.
 */
function serviceOrganisationalUnitNames(
	role: schema.OrganisationalUnitServiceRole["role"],
): SQL<string | null> {
	return sql<string | null>`(
		select string_agg(distinct ${schema.organisationalUnits.name}, ', ' order by ${schema.organisationalUnits.name})
		from ${schema.servicesToOrganisationalUnits}
		inner join ${schema.organisationalUnitServiceRoles}
			on ${schema.organisationalUnitServiceRoles.id} = ${schema.servicesToOrganisationalUnits.roleId}
		inner join ${schema.entityVersions}
			on ${schema.entityVersions.entityId} = ${schema.servicesToOrganisationalUnits.organisationalUnitDocumentId}
		inner join ${schema.entityStatus}
			on ${schema.entityStatus.id} = ${schema.entityVersions.statusId}
		inner join ${schema.organisationalUnits}
			on ${schema.organisationalUnits.id} = ${schema.entityVersions.id}
		where ${schema.servicesToOrganisationalUnits.serviceId} = ${schema.services.id}
			and ${schema.organisationalUnitServiceRoles.role} = ${role}
			and ${publishedEntityVersionWhere()}
	)`;
}

export async function getServices(params: Readonly<GetServicesParams>): Promise<ServicesResult> {
	const { limit, offset, q, sort = "name", type, dir = "asc" } = params;
	const query = q?.trim();
	const serviceOwners = serviceOrganisationalUnitNames("service_owner");
	const serviceProviders = serviceOrganisationalUnitNames("service_provider");
	const where = and(
		matchesAllTerms(query, schema.services.name, serviceOwners, serviceProviders),
		type === "internal"
			? isNull(schema.services.sshocMarketplaceId)
			: isNotNull(schema.services.sshocMarketplaceId),
	);
	// Ties on the sorted column are broken by name, then id: without a total order postgres is
	// free to return tied rows differently per query, so a row can appear on two paginated pages
	// -- or on none.
	const orderBy = [
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
					: sort === "serviceOwners"
						? dir === "asc"
							? sql`${serviceOwners} ASC NULLS LAST`
							: sql`${serviceOwners} DESC NULLS LAST`
						: sort === "serviceProviders"
							? dir === "asc"
								? sql`${serviceProviders} ASC NULLS LAST`
								: sql`${serviceProviders} DESC NULLS LAST`
							: dir === "asc"
								? schema.services.name
								: desc(schema.services.name),
		schema.services.name,
		schema.services.id,
	];

	const [data, aggregate] = await Promise.all([
		db
			.select({
				id: schema.services.id,
				name: schema.services.name,
				sshocMarketplaceId: schema.services.sshocMarketplaceId,
				status: schema.serviceStatuses.status,
				type: schema.serviceTypes.type,
				serviceOwners,
				serviceProviders,
			})
			.from(schema.services)
			.innerJoin(schema.serviceTypes, eq(schema.services.typeId, schema.serviceTypes.id))
			.innerJoin(schema.serviceStatuses, eq(schema.services.statusId, schema.serviceStatuses.id))
			.where(where)
			.orderBy(...orderBy)
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
				serviceOwners: item.serviceOwners,
				serviceProviders: item.serviceProviders,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export interface ServiceOption {
	id: string;
	name: string;
	/** Display line: "<type> · <status>", plus the marketplace id when the service was ingested. */
	description: string;
	status: string;
	sshocMarketplaceId: string | null;
}

interface GetServiceOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
}

/**
 * Services for the admin maintenance picker. Unlike {@link getServices} this spans every type —
 * merging an internal duplicate into a marketplace-ingested service (or the reverse) is the main
 * reason the tool exists, so it must not be scoped to one tab's type filter.
 */
export async function getServiceOptions(
	params: GetServiceOptionsParams = {},
): Promise<{ items: Array<ServiceOption>; total: number }> {
	const { limit = 20, offset = 0, q } = params;
	const query = q?.trim();
	const where = matchesAllTerms(query, schema.services.name, schema.services.sshocMarketplaceId);

	const [rows, aggregate] = await Promise.all([
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
			.orderBy(schema.services.name)
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
		items: rows.map((row) => {
			const parts = [row.type, getServiceStatusLabel(row.status)];
			if (row.sshocMarketplaceId != null) {
				parts.push(`SSHOC ${row.sshocMarketplaceId}`);
			}

			return {
				id: row.id,
				name: row.name,
				description: parts.join(" · "),
				status: row.status,
				sshocMarketplaceId: row.sshocMarketplaceId,
			};
		}),
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getServicesForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetServicesParams>,
): Promise<ServicesResult> {
	assertAdminUser(currentUser);

	return getServices(params);
}

export async function getServiceCreateDataForAdmin(currentUser: Pick<User, "role">) {
	assertAdminUser(currentUser);

	const [serviceTypes, serviceStatuses, initialOrganisationalUnits] = await Promise.all([
		db.query.serviceTypes.findMany({ orderBy: { type: "asc" }, columns: { id: true, type: true } }),
		db.query.serviceStatuses.findMany({
			orderBy: { status: "asc" },
			columns: { id: true, status: true },
		}),
		getOrganisationalUnitOptions().then(toOrganisationalUnitDocumentOptionsPage),
	]);

	return { initialOrganisationalUnits, serviceStatuses, serviceTypes };
}

export async function getServiceForAdmin(currentUser: Pick<User, "role">, id: string) {
	assertAdminUser(currentUser);

	const [service, serviceTypes, serviceStatuses, initialOrganisationalUnits, serviceRoles] =
		await Promise.all([
			db.query.services.findFirst({
				where: { id },
				columns: {
					id: true,
					name: true,
					sshocMarketplaceId: true,
					typeId: true,
					statusId: true,
					comment: true,
					dariahBranding: true,
					monitoring: true,
					privateSupplier: true,
				},
				with: {
					status: {
						columns: {
							status: true,
						},
					},
					type: {
						columns: {
							type: true,
						},
					},
				},
			}),
			db.query.serviceTypes.findMany({
				orderBy: { type: "asc" },
				columns: { id: true, type: true },
			}),
			db.query.serviceStatuses.findMany({
				orderBy: { status: "asc" },
				columns: { id: true, status: true },
			}),
			getOrganisationalUnitOptions().then(toOrganisationalUnitDocumentOptionsPage),
			db.query.organisationalUnitServiceRoles.findMany({ columns: { id: true, role: true } }),
		]);

	if (service == null) {
		return null;
	}

	const unitRoleRows = await db
		.select({
			organisationalUnitDocumentId:
				schema.servicesToOrganisationalUnits.organisationalUnitDocumentId,
			roleId: schema.servicesToOrganisationalUnits.roleId,
		})
		.from(schema.servicesToOrganisationalUnits)
		.where(eq(schema.servicesToOrganisationalUnits.serviceId, id));

	const ownerRoleId = serviceRoles.find((r) => r.role === "service_owner")?.id;
	const providerRoleId = serviceRoles.find((r) => r.role === "service_provider")?.id;

	const ownerUnitDocumentIds = unitRoleRows
		.filter((r) => r.roleId === ownerRoleId)
		.map((r) => r.organisationalUnitDocumentId);

	const providerUnitDocumentIds = unitRoleRows
		.filter((r) => r.roleId === providerRoleId)
		.map((r) => r.organisationalUnitDocumentId);

	const selectedOrganisationalUnits = (
		await getOrganisationalUnitOptionsByDocumentIds([
			...new Set([...ownerUnitDocumentIds, ...providerUnitDocumentIds]),
		])
	).map(toOrganisationalUnitDocumentOption);

	return {
		initialOrganisationalUnits,
		selectedOrganisationalUnits,
		service: { ...service, ownerUnitDocumentIds, providerUnitDocumentIds },
		serviceStatuses,
		serviceTypes,
	};
}
