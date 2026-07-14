import { and, eq, inArray } from "drizzle-orm";

import type { Database, Transaction } from "./index";
import * as schema from "./schema";

/**
 * Data-integrity checks for pairs of person-to-organisational-unit relations which must always be
 * entered together because they record the same fact from two angles — e.g. a person who is a
 * country's national representative (or deputy) must also be a member of the General Assembly
 * governance body for the same period.
 *
 * Neither relation is derived from the other: a user may enter either one first and forget its
 * counterpart, so every rule is checked **in both directions**. A finding is raised when one side
 * exists without the other, or when both exist but their durations do not line up.
 *
 * Shared by the `@dariah-eric/audit` cli scripts and the admin dashboard.
 */

/** One side of a paired-relation rule: a person-to-organisational-unit relation of a given shape. */
export interface RelationEndpoint {
	/** A relation with any of these role types satisfies this side. */
	roleTypes: ReadonlyArray<(typeof schema.personRoleTypesEnum)[number]>;
	/**
	 * Slug of the organisational-unit document the relation must point to. Omit to match a relation
	 * to any unit — the allowed-relations table already restricts the role types to the expected unit
	 * type (e.g. national representative → country), so the rule need not re-check it.
	 */
	unitSlug?: string;
	/** Human-readable name for this side, used in findings and the dashboard. */
	label: string;
}

export interface PairedRelationRule {
	name: string;
	/** The two relations which must co-exist. Order is irrelevant; both directions are checked. */
	a: RelationEndpoint;
	b: RelationEndpoint;
}

export const pairedRelationRules: Array<PairedRelationRule> = [
	{
		name: "national-representative-general-assembly",
		a: {
			roleTypes: ["national_representative", "national_representative_deputy"],
			label: "National representative (or deputy) of a country",
		},
		b: {
			roleTypes: ["is_member_of"],
			unitSlug: "general-assembly",
			label: "Member of the General Assembly",
		},
	},
	{
		name: "national-coordinator-ncc",
		a: {
			roleTypes: ["national_coordinator", "national_coordinator_deputy"],
			label: "National coordinator (or deputy) of a country",
		},
		b: {
			roleTypes: ["is_member_of"],
			unitSlug: "national-coordinator-committee",
			label: "Member of the National Coordinator Committee",
		},
	},
];

/**
 * Consecutive terms are often entered as separate rows on one side (e.g. representative then
 * deputy) but as a single continuous membership on the other, so intervals separated by at most
 * this gap are merged before comparison.
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
export interface RelationInterval {
	start: string;
	end: string | null;
}

function toSerializableIntervals(intervals: Array<Interval>): Array<RelationInterval> {
	return intervals.map((interval) => {
		return {
			start: new Date(interval.start).toISOString(),
			end: interval.end === Infinity ? null : new Date(interval.end).toISOString(),
		};
	});
}

export type PairedRelationFindingKind = "missing_counterpart" | "duration_mismatch";

/** A duration on one side of a rule; an absent `end` means the relation is still ongoing. */
export interface RelationDuration {
	start: Date;
	end?: Date;
}

/**
 * Merges a side's durations into a normalised, display-ready set of intervals (see
 * {@link mergeGapMs}).
 */
export function mergeAdjacentDurations(
	durations: Array<RelationDuration>,
): Array<RelationInterval> {
	return toSerializableIntervals(toIntervals(durations));
}

/**
 * The outcome of comparing the two sides of a rule for one person; `null` means they are
 * consistent.
 */
export type PairClassification =
	| { kind: "missing_counterpart"; missingSide: "a" | "b" }
	| { kind: "duration_mismatch" }
	| null;

/**
 * Classifies the two sides of a paired-relation rule for a single person. Neither side is primary:
 * if either side has relations while the other has none, the missing side is reported — so the
 * check runs in both directions. If both sides exist but their merged intervals differ, it is a
 * duration mismatch. Both absent (or both present and equal) is consistent (`null`).
 */
export function classifyRelationPair(
	aDurations: Array<RelationDuration>,
	bDurations: Array<RelationDuration>,
): PairClassification {
	if (aDurations.length === 0 && bDurations.length === 0) {
		return null;
	}
	if (aDurations.length === 0) {
		return { kind: "missing_counterpart", missingSide: "a" };
	}
	if (bDurations.length === 0) {
		return { kind: "missing_counterpart", missingSide: "b" };
	}
	if (!areIntervalSetsEqual(toIntervals(aDurations), toIntervals(bDurations))) {
		return { kind: "duration_mismatch" };
	}
	return null;
}

/** The periods recorded for one side of a rule, labelled for display. */
export interface RelationSide {
	label: string;
	intervals: Array<RelationInterval>;
}

export interface PairedRelationFinding {
	rule: string;
	kind: PairedRelationFindingKind;
	personDocumentId: string;
	personSlug: string;
	personLabel: string;
	detail: string;
	/** Both sides of the rule, always in `[a, b]` order, so the dashboard can show them side by side. */
	sides: [RelationSide, RelationSide];
}

export interface PairedRelationCheckResult {
	findings: Array<PairedRelationFinding>;
	/** Rules which could not run, e.g. because an endpoint's unit document is missing. */
	errors: Array<string>;
}

async function resolveEndpointUnitId(
	db: Database | Transaction,
	ruleName: string,
	endpoint: RelationEndpoint,
): Promise<string | undefined> {
	if (endpoint.unitSlug == null) {
		return undefined;
	}

	const [unit] = await db
		.select({ id: schema.entities.id })
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.where(
			and(
				eq(schema.entityTypes.type, "organisational_units"),
				eq(schema.entities.slug, endpoint.unitSlug),
			),
		);

	if (unit == null) {
		throw new Error(
			`Rule "${ruleName}": no organisational-unit document with slug "${endpoint.unitSlug}".`,
		);
	}

	return unit.id;
}

interface EndpointRelation {
	personDocumentId: string;
	personSlug: string;
	personLabel: string | null;
	duration: { start: Date; end?: Date };
}

async function getEndpointRelations(
	db: Database | Transaction,
	endpoint: RelationEndpoint,
	unitId: string | undefined,
): Promise<Array<EndpointRelation>> {
	const personEntities = schema.entities;

	return db
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
				inArray(schema.personRoleTypes.type, [...endpoint.roleTypes]),
				unitId != null
					? eq(schema.personsToOrganisationalUnits.organisationalUnitDocumentId, unitId)
					: undefined,
			),
		);
}

async function checkRule(
	db: Database | Transaction,
	rule: PairedRelationRule,
): Promise<Array<PairedRelationFinding>> {
	const [aUnitId, bUnitId] = await Promise.all([
		resolveEndpointUnitId(db, rule.name, rule.a),
		resolveEndpointUnitId(db, rule.name, rule.b),
	]);

	const [aRows, bRows] = await Promise.all([
		getEndpointRelations(db, rule.a, aUnitId),
		getEndpointRelations(db, rule.b, bUnitId),
	]);

	interface PersonRelations {
		personSlug: string;
		personLabel: string;
		a: Array<EndpointRelation>;
		b: Array<EndpointRelation>;
	}

	const byPerson = new Map<string, PersonRelations>();

	function getPerson(row: EndpointRelation): PersonRelations {
		let person = byPerson.get(row.personDocumentId);
		if (person == null) {
			person = {
				personSlug: row.personSlug,
				personLabel: row.personLabel ?? row.personDocumentId,
				a: [],
				b: [],
			};
			byPerson.set(row.personDocumentId, person);
		}
		return person;
	}

	for (const row of aRows) {
		getPerson(row).a.push(row);
	}
	for (const row of bRows) {
		getPerson(row).b.push(row);
	}

	const findings: Array<PairedRelationFinding> = [];

	for (const [personDocumentId, person] of byPerson) {
		const aDurations = person.a.map((row) => row.duration);
		const bDurations = person.b.map((row) => row.duration);

		const classification = classifyRelationPair(aDurations, bDurations);
		if (classification == null) {
			continue;
		}

		const sides: [RelationSide, RelationSide] = [
			{ label: rule.a.label, intervals: mergeAdjacentDurations(aDurations) },
			{ label: rule.b.label, intervals: mergeAdjacentDurations(bDurations) },
		];

		const base = {
			rule: rule.name,
			personDocumentId,
			personSlug: person.personSlug,
			personLabel: person.personLabel,
			sides,
		};

		if (classification.kind === "missing_counterpart") {
			const present = classification.missingSide === "a" ? rule.b : rule.a;
			const missing = classification.missingSide === "a" ? rule.a : rule.b;
			findings.push({
				...base,
				kind: "missing_counterpart",
				detail: `Is "${present.label}" but is missing the matching "${missing.label}".`,
			});
		} else {
			findings.push({
				...base,
				kind: "duration_mismatch",
				detail: `Is both "${rule.a.label}" and "${rule.b.label}", but the periods do not match.`,
			});
		}
	}

	return findings;
}

export async function checkPairedRelations(
	db: Database | Transaction,
): Promise<PairedRelationCheckResult> {
	const findings: Array<PairedRelationFinding> = [];
	const errors: Array<string> = [];

	for (const rule of pairedRelationRules) {
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
