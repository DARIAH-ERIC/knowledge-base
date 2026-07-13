import { and, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database, Transaction } from "./index";
import * as schema from "./schema";

/**
 * Data-integrity checks for person-to-organisational-unit relations which must be entered twice
 * because one is derivable from the other, e.g. a person who is national coordinator (or deputy)
 * for a country must also be a member of the General Assembly governance body for the same period.
 * Shared by the `@dariah-eric/audit` cli scripts and the admin dashboard.
 */

export interface DerivedRelationRule {
	name: string;
	/**
	 * Role types which imply the derived relation. The allowed-relations table restricts these to the
	 * expected unit type (e.g. country), so the rule does not re-check the unit type.
	 */
	sourceRoleTypes: Array<(typeof schema.personRoleTypesEnum)[number]>;
	derivedRoleType: (typeof schema.personRoleTypesEnum)[number];
	/** Slug of the organisational-unit document the derived relation must point to. */
	derivedUnitSlug: string;
}

export const derivedRelationRules: Array<DerivedRelationRule> = [
	{
		name: "general-assembly-membership",
		sourceRoleTypes: ["national_coordinator", "national_coordinator_deputy"],
		derivedRoleType: "is_member_of",
		derivedUnitSlug: "general-assembly",
	},
];

/**
 * Consecutive terms are often entered as separate rows on one side (e.g. coordinator then deputy)
 * but as a single continuous membership on the other, so intervals separated by at most this gap
 * are merged before comparison.
 */
const mergeGapMs = 24 * 60 * 60 * 1000;

/** Timestamps in epoch ms; an open-ended (ongoing) relation has `end: Infinity`. */
interface Interval {
	start: number;
	end: number;
}

function toIntervals(durations: Array<{ start: Date; end?: Date }>): Array<Interval> {
	const sorted = durations
		.map((duration) => {
			return { start: duration.start.getTime(), end: duration.end?.getTime() ?? Infinity };
		})
		.toSorted((a, b) => a.start - b.start || a.end - b.end);

	const merged: Array<Interval> = [];

	for (const interval of sorted) {
		const last = merged.at(-1);

		if (last != null && interval.start <= last.end + mergeGapMs) {
			last.end = Math.max(last.end, interval.end);
		} else {
			merged.push({ ...interval });
		}
	}

	return merged;
}

function areIntervalSetsEqual(a: Array<Interval>, b: Array<Interval>): boolean {
	return (
		a.length === b.length &&
		a.every(
			(interval, index) => interval.start === b[index]!.start && interval.end === b[index]!.end,
		)
	);
}

/** JSON-serializable so findings can cross a server/client boundary. `end: null` means ongoing. */
export interface DerivedRelationInterval {
	start: string;
	end: string | null;
}

function toSerializableIntervals(intervals: Array<Interval>): Array<DerivedRelationInterval> {
	return intervals.map((interval) => {
		return {
			start: new Date(interval.start).toISOString(),
			end: interval.end === Infinity ? null : new Date(interval.end).toISOString(),
		};
	});
}

export type DerivedRelationFindingKind = "missing_derived" | "missing_source" | "duration_mismatch";

export interface DerivedRelationFinding {
	rule: string;
	kind: DerivedRelationFindingKind;
	personDocumentId: string;
	personSlug: string;
	personLabel: string;
	detail: string;
	sourceIntervals: Array<DerivedRelationInterval>;
	derivedIntervals: Array<DerivedRelationInterval>;
}

export interface DerivedRelationCheckResult {
	findings: Array<DerivedRelationFinding>;
	/** Rules which could not run, e.g. because the derived unit document is missing. */
	errors: Array<string>;
}

async function checkRule(
	db: Database | Transaction,
	rule: DerivedRelationRule,
): Promise<Array<DerivedRelationFinding>> {
	const unitEntities = alias(schema.entities, "unit_entities");
	const personEntities = alias(schema.entities, "person_entities");

	const [derivedUnit] = await db
		.select({ id: schema.entities.id, label: schema.entities.label })
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.where(
			and(
				eq(schema.entityTypes.type, "organisational_units"),
				eq(schema.entities.slug, rule.derivedUnitSlug),
			),
		);

	if (derivedUnit == null) {
		throw new Error(
			`Rule "${rule.name}": no organisational-unit document with slug "${rule.derivedUnitSlug}".`,
		);
	}

	const derivedUnitLabel = derivedUnit.label ?? rule.derivedUnitSlug;

	const [sourceRows, derivedRows] = await Promise.all([
		db
			.select({
				personDocumentId: schema.personsToOrganisationalUnits.personDocumentId,
				personSlug: personEntities.slug,
				personLabel: personEntities.label,
				unitLabel: unitEntities.label,
				roleType: schema.personRoleTypes.type,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.innerJoin(
				personEntities,
				eq(personEntities.id, schema.personsToOrganisationalUnits.personDocumentId),
			)
			.innerJoin(
				unitEntities,
				eq(unitEntities.id, schema.personsToOrganisationalUnits.organisationalUnitDocumentId),
			)
			.where(inArray(schema.personRoleTypes.type, rule.sourceRoleTypes)),
		db
			.select({
				personDocumentId: schema.personsToOrganisationalUnits.personDocumentId,
				personSlug: personEntities.slug,
				personLabel: personEntities.label,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.personRoleTypes,
				eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
			)
			.innerJoin(
				personEntities,
				eq(personEntities.id, schema.personsToOrganisationalUnits.personDocumentId),
			)
			.where(
				and(
					eq(schema.personRoleTypes.type, rule.derivedRoleType),
					eq(schema.personsToOrganisationalUnits.organisationalUnitDocumentId, derivedUnit.id),
				),
			),
	]);

	interface PersonRelations {
		personSlug: string;
		personLabel: string;
		source: typeof sourceRows;
		derived: typeof derivedRows;
	}

	const byPerson = new Map<string, PersonRelations>();

	function getPerson(
		personDocumentId: string,
		personSlug: string,
		personLabel: string | null,
	): PersonRelations {
		let person = byPerson.get(personDocumentId);
		if (person == null) {
			person = {
				personSlug,
				personLabel: personLabel ?? personDocumentId,
				source: [],
				derived: [],
			};
			byPerson.set(personDocumentId, person);
		}
		return person;
	}

	for (const row of sourceRows) {
		getPerson(row.personDocumentId, row.personSlug, row.personLabel).source.push(row);
	}
	for (const row of derivedRows) {
		getPerson(row.personDocumentId, row.personSlug, row.personLabel).derived.push(row);
	}

	const findings: Array<DerivedRelationFinding> = [];

	for (const [personDocumentId, person] of byPerson) {
		const sourceIntervals = toIntervals(person.source.map((row) => row.duration));
		const derivedIntervals = toIntervals(person.derived.map((row) => row.duration));

		const sourceRoles = [
			...new Set(person.source.map((row) => `${row.roleType} (${row.unitLabel ?? "?"})`)),
		].join(", ");

		const base = {
			rule: rule.name,
			personDocumentId,
			personSlug: person.personSlug,
			personLabel: person.personLabel,
			sourceIntervals: toSerializableIntervals(sourceIntervals),
			derivedIntervals: toSerializableIntervals(derivedIntervals),
		};

		if (person.derived.length === 0) {
			findings.push({
				...base,
				kind: "missing_derived",
				detail: `Has ${sourceRoles} but no "${rule.derivedRoleType}" relation to "${derivedUnitLabel}".`,
			});
		} else if (person.source.length === 0) {
			findings.push({
				...base,
				kind: "missing_source",
				detail: `Is "${rule.derivedRoleType}" of "${derivedUnitLabel}" but has none of the roles which imply it (${rule.sourceRoleTypes.join(", ")}).`,
			});
		} else if (!areIntervalSetsEqual(sourceIntervals, derivedIntervals)) {
			findings.push({
				...base,
				kind: "duration_mismatch",
				detail: `Durations of ${sourceRoles} do not match the "${rule.derivedRoleType}" relation to "${derivedUnitLabel}".`,
			});
		}
	}

	return findings;
}

export async function checkDerivedRelations(
	db: Database | Transaction,
): Promise<DerivedRelationCheckResult> {
	const findings: Array<DerivedRelationFinding> = [];
	const errors: Array<string> = [];

	for (const rule of derivedRelationRules) {
		try {
			findings.push(...(await checkRule(db, rule)));
		} catch (error) {
			// oxlint-disable-next-line unicorn/no-instanceof-builtins
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	findings.sort(
		(a, b) =>
			a.rule.localeCompare(b.rule) ||
			a.kind.localeCompare(b.kind) ||
			a.personLabel.localeCompare(b.personLabel),
	);

	return { findings, errors };
}
