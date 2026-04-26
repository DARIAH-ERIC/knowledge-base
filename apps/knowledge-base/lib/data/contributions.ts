import { and, count, desc, eq, ilike, inArray, or, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import { contributionOptionsPageSize } from "@/lib/constants/contributions";

export type ContributionsSort =
	| "personName"
	| "roleType"
	| "organisationalUnitType"
	| "organisationalUnitName"
	| "durationStart"
	| "durationEnd";

interface GetContributionsParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: ContributionsSort;
	dir?: "asc" | "desc";
}

export interface ContributionsResult {
	data: Array<{
		id: string;
		personName: string;
		roleType: string;
		organisationalUnitName: string;
		organisationalUnitType: string;
		durationStart: Date;
		durationEnd: Date | undefined;
	}>;
	limit: number;
	offset: number;
	total: number;
}

export async function getContributions(
	params: Readonly<GetContributionsParams>,
): Promise<ContributionsResult> {
	const { limit, offset, q, sort = "personName", dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(
					ilike(schema.persons.name, `%${query}%`),
					ilike(schema.persons.sortName, `%${query}%`),
					ilike(schema.organisationalUnits.name, `%${query}%`),
					ilike(schema.organisationalUnitTypes.type, `%${query}%`),
					ilike(schema.personRoleTypes.type, `%${query}%`),
				)
			: undefined;
	const orderBy =
		sort === "roleType"
			? dir === "asc"
				? schema.personRoleTypes.type
				: desc(schema.personRoleTypes.type)
			: sort === "organisationalUnitType"
				? dir === "asc"
					? schema.organisationalUnitTypes.type
					: desc(schema.organisationalUnitTypes.type)
				: sort === "organisationalUnitName"
					? dir === "asc"
						? schema.organisationalUnits.name
						: desc(schema.organisationalUnits.name)
					: sort === "durationStart"
						? dir === "asc"
							? sql`LOWER(${schema.personsToOrganisationalUnits.duration}) ASC`
							: sql`LOWER(${schema.personsToOrganisationalUnits.duration}) DESC`
						: sort === "durationEnd"
							? dir === "asc"
								? sql`UPPER(${schema.personsToOrganisationalUnits.duration}) ASC NULLS LAST`
								: sql`UPPER(${schema.personsToOrganisationalUnits.duration}) DESC NULLS LAST`
							: dir === "asc"
								? schema.persons.sortName
								: desc(schema.persons.sortName);

	const [rows, aggregate] = await Promise.all([
		db
			.select({
				id: schema.personsToOrganisationalUnits.id,
				personName: schema.persons.name,
				roleType: schema.personRoleTypes.type,
				organisationalUnitName: schema.organisationalUnits.name,
				organisationalUnitType: schema.organisationalUnitTypes.type,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.persons,
				eq(schema.persons.id, schema.personsToOrganisationalUnits.personId),
			)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.persons,
				eq(schema.persons.id, schema.personsToOrganisationalUnits.personId),
			)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.innerJoin(
				schema.organisationalUnits,
				eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
			)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where),
	]);

	return {
		data: rows.map((row) => {
			return {
				id: row.id,
				personName: row.personName,
				roleType: row.roleType,
				organisationalUnitName: row.organisationalUnitName,
				organisationalUnitType: row.organisationalUnitType,
				durationStart: row.duration.start,
				durationEnd: row.duration.end,
			};
		}),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getPersonContributions(personId: string) {
	return db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			duration: schema.personsToOrganisationalUnits.duration,
			roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
			roleType: schema.personRoleTypes.type,
			organisationalUnitId: schema.personsToOrganisationalUnits.organisationalUnitId,
			organisationalUnitName: schema.organisationalUnits.name,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
		)
		.where(eq(schema.personsToOrganisationalUnits.personId, personId));
}

export type PersonContribution = Awaited<ReturnType<typeof getPersonContributions>>[number];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContributionRoleOptions() {
	const rows = await db
		.select({
			roleTypeId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			roleType: schema.personRoleTypes.type,
		})
		.from(schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations)
		.innerJoin(
			schema.personRoleTypes,
			eq(
				schema.personRoleTypes.id,
				schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			),
		)
		.orderBy(schema.personRoleTypes.type);

	const uniqueRoleOptions = new Map<string, { roleType: string; roleTypeId: string }>();

	for (const row of rows) {
		if (!uniqueRoleOptions.has(row.roleTypeId)) {
			uniqueRoleOptions.set(row.roleTypeId, row);
		}
	}

	return Array.from(uniqueRoleOptions.values());
}

export type ContributionRoleOption = Awaited<ReturnType<typeof getContributionRoleOptions>>[number];

interface GetContributionOptionsParams {
	limit?: number;
	offset?: number;
	q?: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContributionPersonOptions(params: GetContributionOptionsParams = {}) {
	const { limit = contributionOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(ilike(schema.persons.name, `%${query}%`), ilike(schema.persons.sortName, `%${query}%`))
			: undefined;

	const [items, aggregate] = await Promise.all([
		db
			.select({ id: schema.persons.id, name: schema.persons.name })
			.from(schema.persons)
			.where(where)
			.orderBy(schema.persons.sortName)
			.limit(limit)
			.offset(offset),
		db.$count(schema.persons, where),
	]);

	return { items, total: aggregate };
}

export type ContributionPersonOption = Awaited<
	ReturnType<typeof getContributionPersonOptions>
>["items"][number];

interface GetContributionOrganisationalUnitOptionsParams extends GetContributionOptionsParams {
	roleTypeId?: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContributionOrganisationalUnitOptions(
	params: GetContributionOrganisationalUnitOptionsParams = {},
) {
	const { limit = contributionOptionsPageSize, offset = 0, q, roleTypeId } = params;

	if (roleTypeId == null || roleTypeId === "") {
		return { items: [], total: 0 };
	}

	const query = q?.trim();
	const where = and(
		eq(schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId, roleTypeId),
		query != null && query !== ""
			? ilike(schema.organisationalUnits.name, `%${query}%`)
			: undefined,
	);

	const [items, aggregate] = await Promise.all([
		db
			.select({
				id: schema.organisationalUnits.id,
				name: schema.organisationalUnits.name,
			})
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations,
				eq(
					schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
					schema.organisationalUnits.typeId,
				),
			)
			.where(where)
			.orderBy(schema.organisationalUnits.name)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations,
				eq(
					schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
					schema.organisationalUnits.typeId,
				),
			)
			.where(where),
	]);

	return { items, total: aggregate.at(0)?.total ?? 0 };
}

export type ContributionOrganisationalUnitOption = Awaited<
	ReturnType<typeof getContributionOrganisationalUnitOptions>
>["items"][number];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContributionOptions() {
	const allowedCombos = await db
		.select({
			roleTypeId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			roleType: schema.personRoleTypes.type,
			unitTypeId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
		})
		.from(schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations)
		.innerJoin(
			schema.personRoleTypes,
			eq(
				schema.personRoleTypes.id,
				schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			),
		);

	if (allowedCombos.length === 0) return [];

	const unitTypeIds = [
		...new Set(
			allowedCombos.map((c) => {
				return c.unitTypeId;
			}),
		),
	];

	const orgUnits = await db
		.select({
			id: schema.organisationalUnits.id,
			name: schema.organisationalUnits.name,
			typeId: schema.organisationalUnits.typeId,
		})
		.from(schema.organisationalUnits)
		.where(inArray(schema.organisationalUnits.typeId, unitTypeIds));

	const byRole = new Map<
		string,
		{ roleTypeId: string; roleType: string; availableUnits: Array<{ id: string; name: string }> }
	>();

	for (const combo of allowedCombos) {
		if (!byRole.has(combo.roleTypeId)) {
			byRole.set(combo.roleTypeId, {
				roleTypeId: combo.roleTypeId,
				roleType: combo.roleType,
				availableUnits: [],
			});
		}

		const entry = byRole.get(combo.roleTypeId)!;

		for (const unit of orgUnits) {
			if (
				unit.typeId === combo.unitTypeId &&
				!entry.availableUnits.some((u) => {
					return u.id === unit.id;
				})
			) {
				entry.availableUnits.push({ id: unit.id, name: unit.name });
			}
		}
	}

	return Array.from(byRole.values()).map((entry) => {
		return {
			...entry,
			availableUnits: entry.availableUnits.sort((a, b) => {
				return a.name.localeCompare(b.name);
			}),
		};
	});
}

export type ContributionOption = Awaited<ReturnType<typeof getContributionOptions>>[number];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getCountryOptions(params: GetContributionOptionsParams = {}) {
	const { limit = contributionOptionsPageSize, offset = 0, q } = params;
	const query = q?.trim();

	const where = and(
		eq(schema.organisationalUnitTypes.type, "country"),
		query != null && query !== ""
			? ilike(schema.organisationalUnits.name, `%${query}%`)
			: undefined,
	);

	const [items, aggregate] = await Promise.all([
		db
			.select({ id: schema.organisationalUnits.id, name: schema.organisationalUnits.name })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where)
			.orderBy(schema.organisationalUnits.name)
			.limit(limit)
			.offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
			)
			.where(where),
	]);

	return { items, total: aggregate.at(0)?.total ?? 0 };
}

export type CountryOption = Awaited<ReturnType<typeof getCountryOptions>>["items"][number];
