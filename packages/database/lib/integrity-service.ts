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

/** Resolves an organisational-unit document id from its slug, throwing if no such document exists. */
async function resolveUnitIdBySlug(
	db: Database | Transaction,
	ruleName: string,
	slug: string,
): Promise<string> {
	const [unit] = await db
		.select({ id: schema.entities.id })
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.where(
			and(eq(schema.entityTypes.type, "organisational_units"), eq(schema.entities.slug, slug)),
		);

	if (unit == null) {
		throw new Error(`Rule "${ruleName}": no organisational-unit document with slug "${slug}".`);
	}

	return unit.id;
}

async function resolveEndpointUnitId(
	db: Database | Transaction,
	ruleName: string,
	endpoint: RelationEndpoint,
): Promise<string | undefined> {
	if (endpoint.unitSlug == null) {
		return undefined;
	}

	return resolveUnitIdBySlug(db, ruleName, endpoint.unitSlug);
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

/**
 * Data-integrity checks for organisational-unit relations where the presence of one relation on a
 * unit requires another relation on the **same** unit — e.g. every institution that is a partner
 * institution or cooperating partner of DARIAH-EU must also record which country it is located in.
 *
 * Unlike the paired-relation checks above, these are one-directional (a prerequisite, not a mirror
 * that must be entered from both sides) and compare presence only, not durations. A finding is
 * raised for each unit that has the trigger relation but not the required one.
 *
 * Shared by the `@dariah-eric/audit` cli scripts and the admin dashboard.
 */

/** A set of unit-to-unit relation statuses, optionally pinned to a specific related-unit document. */
export interface UnitRelationRequirementRule {
	name: string;
	/**
	 * The trigger: a unit which has any relation with one of these statuses to `relatedUnitSlug` must
	 * also satisfy `required`.
	 */
	trigger: {
		statuses: ReadonlyArray<(typeof schema.organisationalUnitStatusEnum)[number]>;
		/**
		 * Slug of the related-unit document the trigger relation must point to (e.g. the DARIAH-EU
		 * eric).
		 */
		relatedUnitSlug: string;
		/**
		 * Restrict the check to trigger units of this subtype. Needed because the same relation status
		 * may exist on units the requirement cannot apply to — e.g. a _country_ can also be a partner
		 * of DARIAH-EU, but only _institutions_ are ever `is_located_in` a country, so a country would
		 * otherwise be flagged as a false positive.
		 */
		unitType?: (typeof schema.organisationalUnitTypesEnum)[number];
		/** Human-readable name for the trigger, used in findings and the dashboard. */
		label: string;
	};
	/**
	 * The relation the same unit must also have. The type of the related unit need not be re-checked
	 * here — the allowed-relations table already restricts these statuses to the expected unit type
	 * (e.g. `is_located_in` only ever points institution → country).
	 */
	required: {
		statuses: ReadonlyArray<(typeof schema.organisationalUnitStatusEnum)[number]>;
		/** Human-readable name for the required relation, used in findings and the dashboard. */
		label: string;
	};
}

export const unitRelationRequirementRules: Array<UnitRelationRequirementRule> = [
	{
		name: "dariah-partner-located-in-country",
		trigger: {
			statuses: ["is_partner_institution_of", "is_cooperating_partner_of"],
			relatedUnitSlug: "dariah-eu",
			unitType: "institution",
			label: "Partner institution or cooperating partner of DARIAH-EU",
		},
		required: {
			statuses: ["is_located_in"],
			label: "Located in a country",
		},
	},
];

export interface UnitRelationRequirementFinding {
	rule: string;
	unitDocumentId: string;
	unitSlug: string;
	unitLabel: string;
	/** Organisational-unit subtype (e.g. `institution`), used to build the dashboard detail link. */
	unitType: string;
	/** Label of the trigger relation the unit has. */
	triggerLabel: string;
	/** Label of the relation the unit is missing. */
	requiredLabel: string;
	detail: string;
}

export interface UnitRelationRequirementCheckResult {
	findings: Array<UnitRelationRequirementFinding>;
	/** Rules which could not run, e.g. because the trigger's related-unit document is missing. */
	errors: Array<string>;
}

/**
 * Document ids of every unit with any relation of one of `statuses` (optionally to
 * `relatedUnitId`).
 */
async function getUnitDocumentIdsWithStatus(
	db: Database | Transaction,
	statuses: ReadonlyArray<(typeof schema.organisationalUnitStatusEnum)[number]>,
	relatedUnitId?: string,
): Promise<Set<string>> {
	const rows = await db
		.select({ unitDocumentId: schema.organisationalUnitsRelations.unitDocumentId })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				inArray(schema.organisationalUnitStatus.status, [...statuses]),
				relatedUnitId != null
					? eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, relatedUnitId)
					: undefined,
			),
		);

	return new Set(rows.map((row) => row.unitDocumentId));
}

interface UnitDetail {
	slug: string;
	label: string | null;
	type: string;
}

/** Resolves display fields (slug, label, subtype) for a set of unit document ids. */
async function getUnitDetails(
	db: Database | Transaction,
	unitDocumentIds: Array<string>,
): Promise<Map<string, UnitDetail>> {
	if (unitDocumentIds.length === 0) {
		return new Map();
	}

	// A unit document's slug, label and subtype are constant across its draft/published versions, so
	// selectDistinct collapses the one-row-per-version fan-out from the entity-versions join.
	const rows = await db
		.selectDistinct({
			unitDocumentId: schema.entities.id,
			slug: schema.entities.slug,
			label: schema.entities.label,
			type: schema.organisationalUnitTypes.type,
		})
		.from(schema.entities)
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.entityVersions.id),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(inArray(schema.entities.id, unitDocumentIds));

	return new Map(
		rows.map((row) => [row.unitDocumentId, { slug: row.slug, label: row.label, type: row.type }]),
	);
}

async function checkUnitRelationRequirementRule(
	db: Database | Transaction,
	rule: UnitRelationRequirementRule,
): Promise<Array<UnitRelationRequirementFinding>> {
	const relatedUnitId = await resolveUnitIdBySlug(db, rule.name, rule.trigger.relatedUnitSlug);

	const [triggerUnitIds, requiredUnitIds] = await Promise.all([
		getUnitDocumentIdsWithStatus(db, rule.trigger.statuses, relatedUnitId),
		getUnitDocumentIdsWithStatus(db, rule.required.statuses),
	]);

	const missingUnitIds = [...triggerUnitIds].filter((id) => !requiredUnitIds.has(id));
	const details = await getUnitDetails(db, missingUnitIds);

	return missingUnitIds.flatMap((unitDocumentId) => {
		const detail = details.get(unitDocumentId);

		// Drop trigger units of the wrong subtype (see `trigger.unitType`), and any unit whose subtype
		// could not be resolved when the rule is type-restricted.
		if (rule.trigger.unitType != null && detail?.type !== rule.trigger.unitType) {
			return [];
		}

		return [
			{
				rule: rule.name,
				unitDocumentId,
				unitSlug: detail?.slug ?? unitDocumentId,
				unitLabel: detail?.label ?? unitDocumentId,
				unitType: detail?.type ?? "institution",
				triggerLabel: rule.trigger.label,
				requiredLabel: rule.required.label,
				detail: `Is "${rule.trigger.label}" but is missing the required "${rule.required.label}".`,
			},
		];
	});
}

export async function checkUnitRelationRequirements(
	db: Database | Transaction,
): Promise<UnitRelationRequirementCheckResult> {
	const findings: Array<UnitRelationRequirementFinding> = [];
	const errors: Array<string> = [];

	for (const rule of unitRelationRequirementRules) {
		try {
			findings.push(...(await checkUnitRelationRequirementRule(db, rule)));
		} catch (error) {
			// oxlint-disable-next-line unicorn/no-instanceof-builtins
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.unitLabel.localeCompare(b.unitLabel));

	return { findings, errors };
}
