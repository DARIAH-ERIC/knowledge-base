import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { alias, and, count, desc, eq, ilike, or, sql } from "@/lib/db/sql";

export type InstitutionRelationsSort =
	| "institutionName"
	| "statusType"
	| "relatedUnitName"
	| "relatedUnitType"
	| "durationStart"
	| "durationEnd";

interface GetInstitutionRelationsParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: InstitutionRelationsSort;
	dir?: "asc" | "desc";
}

export interface InstitutionRelationsResult {
	data: Array<{
		id: string;
		institutionName: string;
		institutionSlug: string;
		statusType: string;
		relatedUnitName: string;
		relatedUnitType: string;
		durationStart: Date;
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

export async function getInstitutionRelations(
	params: Readonly<GetInstitutionRelationsParams>,
): Promise<InstitutionRelationsResult> {
	const { limit, offset, q, sort = "institutionName", dir = "asc" } = params;
	const relatedOrganisationalUnits = alias(
		schema.organisationalUnits,
		"related_organisational_units",
	);
	const relatedOrganisationalUnitTypes = alias(
		schema.organisationalUnitTypes,
		"related_organisational_unit_types",
	);
	const baseWhere = eq(
		schema.organisationalUnitTypes.type,
		"institution" as typeof schema.organisationalUnitTypes.$inferSelect.type,
	);
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? and(
					baseWhere,
					or(
						ilike(schema.organisationalUnits.name, `%${query}%`),
						ilike(schema.organisationalUnitStatus.status, `%${query}%`),
						ilike(relatedOrganisationalUnits.name, `%${query}%`),
						ilike(relatedOrganisationalUnitTypes.type, `%${query}%`),
					),
				)
			: undefined;
	const orderBy =
		sort === "statusType"
			? dir === "asc"
				? schema.organisationalUnitStatus.status
				: desc(schema.organisationalUnitStatus.status)
			: sort === "relatedUnitName"
				? dir === "asc"
					? relatedOrganisationalUnits.name
					: desc(relatedOrganisationalUnits.name)
				: sort === "relatedUnitType"
					? dir === "asc"
						? relatedOrganisationalUnitTypes.type
						: desc(relatedOrganisationalUnitTypes.type)
					: sort === "durationStart"
						? dir === "asc"
							? sql`LOWER(${schema.organisationalUnitsRelations.duration}) ASC`
							: sql`LOWER(${schema.organisationalUnitsRelations.duration}) DESC`
						: sort === "durationEnd"
							? dir === "asc"
								? sql`UPPER(${schema.organisationalUnitsRelations.duration}) ASC NULLS LAST`
								: sql`UPPER(${schema.organisationalUnitsRelations.duration}) DESC NULLS LAST`
							: dir === "asc"
								? schema.organisationalUnits.name
								: desc(schema.organisationalUnits.name);

	const [rows, aggregate] = await Promise.all([
		db
			.select({
				id: schema.organisationalUnitsRelations.id,
				institutionName: schema.organisationalUnits.name,
				institutionSlug: schema.entities.slug,
				statusType: schema.organisationalUnitStatus.status,
				relatedUnitName: relatedOrganisationalUnits.name,
				relatedUnitType: relatedOrganisationalUnitTypes.type,
				duration: schema.organisationalUnitsRelations.duration,
			})
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.organisationalUnitsRelations.unitId),
			)
			.innerJoin(schema.entities, eq(schema.entities.id, schema.organisationalUnits.id))
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
			)
			.innerJoin(
				relatedOrganisationalUnits,
				eq(relatedOrganisationalUnits.id, schema.organisationalUnitsRelations.relatedUnitId),
			)
			.innerJoin(
				relatedOrganisationalUnitTypes,
				eq(relatedOrganisationalUnitTypes.id, relatedOrganisationalUnits.typeId),
			)
			.where(where ?? baseWhere)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.organisationalUnitsRelations.unitId),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
			)
			.innerJoin(
				relatedOrganisationalUnits,
				eq(relatedOrganisationalUnits.id, schema.organisationalUnitsRelations.relatedUnitId),
			)
			.innerJoin(
				relatedOrganisationalUnitTypes,
				eq(relatedOrganisationalUnitTypes.id, relatedOrganisationalUnits.typeId),
			)
			.where(where ?? baseWhere),
	]);

	return {
		data: rows.map((row) => {
			return {
				id: row.id,
				institutionName: row.institutionName,
				institutionSlug: row.institutionSlug,
				statusType: row.statusType,
				relatedUnitName: row.relatedUnitName,
				relatedUnitType: row.relatedUnitType,
				durationStart: row.duration.start,
				durationEnd: row.duration.end,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getInstitutionRelationsForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetInstitutionRelationsParams>,
): Promise<InstitutionRelationsResult> {
	assertAdminUser(currentUser);

	return getInstitutionRelations(params);
}
