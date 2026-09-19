import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { matchesAllTerms } from "@/lib/db/search";
import { alias, and, count, desc, eq, inArray, sql } from "@/lib/db/sql";

export type CountryMemberObserverStatus = "is_member_of" | "is_observer_of" | null;

export interface CountryMemberObserverPeriod {
	from: Date;
	status: Exclude<CountryMemberObserverStatus, null>;
	until: Date | null;
}

export type CountriesSort = "name" | "status";

interface GetCountriesParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: CountriesSort;
	dir?: "asc" | "desc";
}

export interface CountriesResult {
	data: Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			documentId: string;
			memberObserverFrom: Date | null;
			/**
			 * Earlier membership/observer periods, most recent first; the current one is in the flat
			 * fields above.
			 */
			memberObserverHistory: Array<CountryMemberObserverPeriod>;
			memberObserverStatus: CountryMemberObserverStatus;
			memberObserverUntil: Date | null;
			entity: Pick<schema.Entity, "slug">;
			hasDraft: boolean;
			isPublished: boolean;
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

const dariahEuSlug = "dariah-eu";

function compareStrings(a: string, b: string, dir: "asc" | "desc"): number {
	return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
}

function compareNullableStrings(a: string | null, b: string | null, dir: "asc" | "desc"): number {
	if (a == null && b == null) {
		return 0;
	}
	if (a == null) {
		return 1;
	}
	if (b == null) {
		return -1;
	}
	return compareStrings(a, b, dir);
}

function compareMemberObserverPeriods(
	a: CountryMemberObserverPeriod,
	b: CountryMemberObserverPeriod,
): number {
	if ((a.until == null) !== (b.until == null)) {
		return a.until == null ? -1 : 1;
	}

	return b.from.getTime() - a.from.getTime();
}

function getCountryStatusSortValue(status: CountryMemberObserverStatus): string | null {
	if (status == null) {
		return null;
	}

	return status === "is_member_of" ? "Member" : "Observer";
}

export async function getCountries(params: Readonly<GetCountriesParams>): Promise<CountriesResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const countryType = "country" as typeof schema.organisationalUnitTypes.$inferSelect.type;
	const where =
		query != null && query !== ""
			? and(
					eq(schema.organisationalUnitTypes.type, countryType),
					matchesAllTerms(
						query,
						schema.organisationalUnits.name,
						schema.organisationalUnits.acronym,
					),
				)
			: eq(schema.organisationalUnitTypes.type, countryType);
	// Units sharing a name would otherwise be ordered arbitrarily, and differently per query --
	// enough to make a row appear on two paginated pages, or on none.
	const nameOrderBy = [
		dir === "desc" ? desc(schema.organisationalUnits.name) : schema.organisationalUnits.name,
		schema.organisationalUnits.id,
	];
	const needsDerivedSort = sort === "status";

	const pickedVersion = sql`COALESCE(${schema.documentLifecycle.draftId}, ${schema.documentLifecycle.publishedId})`;
	const versionPick = sql`${schema.entityVersions.id} = ${pickedVersion}`;

	const baseItemsQuery = db
		.select({
			// `id` is the picked *version* id (organisational_units is keyed by entity_versions.id); the
			// document id is what mutations operate on.
			documentId: schema.entities.id,
			id: schema.organisationalUnits.id,
			name: schema.organisationalUnits.name,
			slug: schema.entities.slug,
			hasDraft: schema.documentLifecycle.hasDraftChanges,
			isPublished: sql<boolean>`${schema.documentLifecycle.publishedId} IS NOT NULL`,
		})
		.from(schema.organisationalUnits)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.entities.id),
		)
		.where(and(versionPick, where))
		.orderBy(...nameOrderBy);

	const [items, aggregate, erics] = await Promise.all([
		needsDerivedSort ? baseItemsQuery : baseItemsQuery.limit(limit).offset(offset),
		db
			.select({ total: count() })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(
				schema.documentLifecycle,
				eq(schema.documentLifecycle.documentId, schema.entityVersions.entityId),
			)
			.where(and(versionPick, where)),
		db.query.organisationalUnits.findMany({
			where: { entityVersion: { entity: { slug: dariahEuSlug } }, type: { type: "eric" } },
			columns: { id: true },
		}),
	]);

	const countryIds = items.map((item) => item.id);
	const ericIds = erics.map((eric) => eric.id);
	const relationsByCountryId = new Map<string, Array<CountryMemberObserverPeriod>>();

	if (countryIds.length > 0 && ericIds.length > 0) {
		// Unit↔unit relations are document-level; re-key through entity_versions so the result keeps the
		// country *version* ids the caller passed in.
		const countryVersions = alias(schema.entityVersions, "country_versions");
		const ericVersions = alias(schema.entityVersions, "eric_versions");
		const relations = await db
			.select({
				duration: schema.organisationalUnitsRelations.duration,
				status: schema.organisationalUnitStatus.status,
				unitId: countryVersions.id,
			})
			.from(schema.organisationalUnitsRelations)
			.innerJoin(
				schema.organisationalUnitStatus,
				eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
			)
			.innerJoin(
				countryVersions,
				eq(countryVersions.entityId, schema.organisationalUnitsRelations.unitDocumentId),
			)
			.innerJoin(
				ericVersions,
				eq(ericVersions.entityId, schema.organisationalUnitsRelations.relatedUnitDocumentId),
			)
			.where(
				and(
					inArray(countryVersions.id, countryIds),
					inArray(ericVersions.id, ericIds),
					inArray(schema.organisationalUnitStatus.status, ["is_member_of", "is_observer_of"]),
				),
			);

		for (const relation of relations) {
			const periods = relationsByCountryId.get(relation.unitId) ?? [];
			periods.push({
				from: relation.duration.start,
				status: relation.status as Exclude<CountryMemberObserverStatus, null>,
				until: relation.duration.end ?? null,
			});
			relationsByCountryId.set(relation.unitId, periods);
		}

		// Current period first: an open-ended one wins, otherwise the most recently started.
		for (const periods of relationsByCountryId.values()) {
			periods.sort(compareMemberObserverPeriods);
		}
	}

	const data = items.map((item) => {
		const [current, ...history] = relationsByCountryId.get(item.id) ?? [];

		return {
			documentId: item.documentId,
			entity: { slug: item.slug },
			id: item.id,
			memberObserverFrom: current?.from ?? null,
			memberObserverHistory: history,
			memberObserverStatus: current?.status ?? null,
			memberObserverUntil: current?.until ?? null,
			name: item.name,
			hasDraft: item.hasDraft,
			isPublished: item.isPublished,
		};
	});

	if (!needsDerivedSort) {
		return {
			data,
			limit,
			offset,
			total: aggregate.at(0)?.total ?? 0,
		};
	}

	const sortedData = [...data].toSorted(
		(a, b) =>
			compareNullableStrings(
				getCountryStatusSortValue(a.memberObserverStatus),
				getCountryStatusSortValue(b.memberObserverStatus),
				dir,
			) || compareStrings(a.name, b.name, dir),
	);

	return {
		data: sortedData.slice(offset, offset + limit),
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}

export async function getCountriesForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetCountriesParams>,
): Promise<CountriesResult> {
	assertAdminUser(currentUser);

	return getCountries(params);
}
