import type { Database } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, sql } from "@dariah-eric/database/sql";

import type { OrgUnitResourceLookups } from "./resources";

function addToMapSet<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
	let set = map.get(key);
	if (set == null) {
		set = new Set();
		map.set(key, set);
	}
	set.add(value);
}

/**
 * Build the lookups needed to resolve sshoc actor ids and zotero collection names to the slugs of
 * the national consortia and working groups that own a resource. Reads from the database the set of
 * currently-published national consortia, working groups, and countries, plus the currently-active
 * `is_national_consortium_of` relations.
 */
export async function loadOrgUnitLookups(db: Database): Promise<OrgUnitResourceLookups> {
	const orgUnits = await db
		.select({
			id: schema.organisationalUnits.id,
			slug: schema.entities.slug,
			type: schema.organisationalUnitTypes.type,
			sshocMarketplaceActorId: schema.organisationalUnits.sshocMarketplaceActorId,
		})
		.from(schema.organisationalUnits)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(eq(schema.entityStatus.type, "published"));

	const sshocActorIdToNc = new Map<number, Set<string>>();
	const sshocActorIdToWg = new Map<number, Set<string>>();
	const wgSlugs = new Set<string>();
	const ncIdToSlug = new Map<string, string>();
	const countryIdToSlug = new Map<string, string>();

	for (const unit of orgUnits) {
		if (unit.type === "national_consortium") {
			ncIdToSlug.set(unit.id, unit.slug);
			if (unit.sshocMarketplaceActorId != null) {
				addToMapSet(sshocActorIdToNc, unit.sshocMarketplaceActorId, unit.slug);
			}
		} else if (unit.type === "working_group") {
			wgSlugs.add(unit.slug);
			if (unit.sshocMarketplaceActorId != null) {
				addToMapSet(sshocActorIdToWg, unit.sshocMarketplaceActorId, unit.slug);
			}
		} else if (unit.type === "country") {
			countryIdToSlug.set(unit.id, unit.slug);
		}
	}

	const relations = await db
		.select({
			ncId: schema.organisationalUnitsRelations.unitId,
			countryId: schema.organisationalUnitsRelations.relatedUnitId,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
				sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const countrySlugToNc = new Map<string, Set<string>>();

	for (const relation of relations) {
		const ncSlug = ncIdToSlug.get(relation.ncId);
		const countrySlug = countryIdToSlug.get(relation.countryId);
		if (ncSlug == null || countrySlug == null) {
			continue;
		}
		addToMapSet(countrySlugToNc, countrySlug.toLowerCase(), ncSlug);
	}

	return {
		sshocActorIdToNc,
		sshocActorIdToWg,
		countrySlugToNc,
		wgSlugs,
	};
}
