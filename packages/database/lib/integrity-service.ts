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
			// Chairing or vice-chairing the committee is a role on it, so those count as being on the
			// committee alongside plain membership.
			roleTypes: ["is_member_of", "is_chair_of", "is_vice_chair_of"],
			unitSlug: "national-coordinator-committee",
			label: "Member, chair, or vice-chair of the National Coordinator Committee",
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

/** Sorts, then collapses intervals separated by at most `gapMs` into one. */
function mergeIntervals(intervals: Array<Interval>, gapMs: number): Array<Interval> {
	const sorted = intervals.toSorted((a, b) => a.start - b.start || a.end - b.end);

	const merged: Array<Interval> = [];

	for (const interval of sorted) {
		const last = merged.at(-1);

		if (last != null && interval.start <= last.end + gapMs) {
			last.end = Math.max(last.end, interval.end);
		} else {
			merged.push({ ...interval });
		}
	}

	return merged;
}

function toIntervals(durations: Array<{ start: Date; end?: Date }>): Array<Interval> {
	return mergeIntervals(
		durations.map((duration) => {
			return { start: duration.start.getTime(), end: duration.end?.getTime() ?? Infinity };
		}),
		mergeGapMs,
	);
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

/** As {@link resolveUnitIdBySlug}, but an omitted slug resolves to `undefined` (match any unit). */
async function resolveOptionalUnitIdBySlug(
	db: Database | Transaction,
	ruleName: string,
	slug: string | undefined,
): Promise<string | undefined> {
	if (slug == null) {
		return undefined;
	}

	return resolveUnitIdBySlug(db, ruleName, slug);
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
		resolveOptionalUnitIdBySlug(db, rule.name, rule.a.unitSlug),
		resolveOptionalUnitIdBySlug(db, rule.name, rule.b.unitSlug),
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

export interface UnitDetail {
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

/**
 * Data-integrity checks for organisational units that are no longer active but still have person
 * relations extending past that point — e.g. a working group whose `is_part_of` relation to an ERIC
 * has ended, yet whose chair/vice-chair/member/contact relations are still recorded as ongoing or
 * carry an end date later than the working group's.
 *
 * A unit is considered inactive when it has at least one relation of the configured trigger status
 * and _none_ of those relations is still ongoing (all have an end date). For every such unit, each
 * person relation of the configured role types that is still ongoing, or that ends after the unit's
 * inactivity date, is reported so its end date can be corrected.
 *
 * Shared by the `@dariah-eric/audit` cli scripts and the admin dashboard.
 */

/** Configures which units count as inactive and which of their person relations must then be closed. */
export interface InactiveUnitRelationRule {
	name: string;
	/**
	 * Marks a unit inactive: it has a unit-to-unit relation of one of these statuses, and every such
	 * relation has ended.
	 */
	inactiveWhen: {
		statuses: ReadonlyArray<(typeof schema.organisationalUnitStatusEnum)[number]>;
		/**
		 * Restrict the check to units of this subtype (e.g. `working_group`). The same status may exist
		 * on units the rule cannot apply to, so the subtype must be pinned.
		 */
		unitType: (typeof schema.organisationalUnitTypesEnum)[number];
		/** Human-readable name for the trigger, used in findings and the dashboard. */
		label: string;
	};
	/** Person relations of these role types to an inactive unit must also have an end date. */
	personRelations: {
		roleTypes: ReadonlyArray<(typeof schema.personRoleTypesEnum)[number]>;
		/** Human-readable name for the person relations, used in findings and the dashboard. */
		label: string;
	};
}

export const inactiveUnitRelationRules: Array<InactiveUnitRelationRule> = [
	{
		name: "inactive-working-group-relations-closed",
		inactiveWhen: {
			statuses: ["is_part_of"],
			unitType: "working_group",
			label: "Working group that is no longer part of an ERIC",
		},
		personRelations: {
			roleTypes: ["is_chair_of", "is_vice_chair_of", "is_member_of", "is_contact_for"],
			label: "Chair, vice-chair, member, or contact",
		},
	},
	{
		name: "inactive-country-relations-closed",
		inactiveWhen: {
			statuses: ["is_member_of"],
			unitType: "country",
			label: "Country that is no longer a member",
		},
		personRelations: {
			roleTypes: [
				"national_coordinator",
				"national_coordinator_deputy",
				"national_representative",
				"national_representative_deputy",
				"is_contact_for",
			],
			label: "National coordinator or representative (or deputy), or contact",
		},
	},
];

export interface InactiveUnitRelationFinding {
	rule: string;
	unitDocumentId: string;
	unitSlug: string;
	unitLabel: string;
	/** Organisational-unit subtype (e.g. `working_group`), used to build the dashboard detail link. */
	unitType: string;
	/** ISO date the unit became inactive (the latest end of its trigger relations). */
	unitEnd: string;
	personDocumentId: string;
	personSlug: string;
	personLabel: string;
	/** The person's role in the unit (e.g. `is_chair_of`). */
	roleType: string;
	/** ISO start date of the flagged person relation. */
	personRelationStart: string;
	/** ISO end date of the person relation, or `null` when it is still ongoing. */
	personRelationEnd: string | null;
	detail: string;
}

export interface InactiveUnitRelationCheckResult {
	findings: Array<InactiveUnitRelationFinding>;
	/** Rules which could not run. */
	errors: Array<string>;
}

/** Turns a role type into a short human-readable label, e.g. `is_vice_chair_of` -> "vice chair". */
function humanizeRoleType(roleType: string): string {
	return roleType
		.replace(/^is_/, "")
		.replace(/_(?:of|for)$/, "")
		.replaceAll("_", " ");
}

/** Turns a unit subtype into a human-readable label, e.g. `working_group` -> "working group". */
function humanizeUnitType(unitType: string): string {
	return unitType.replaceAll("_", " ");
}

/**
 * A unit is inactive when it has trigger relations and none of them is still ongoing (every one has
 * an end date). A unit with no trigger relations, or with any still-open one, is not inactive.
 */
export function isUnitInactive(durations: Array<RelationDuration>): boolean {
	return durations.length > 0 && durations.every((duration) => duration.end != null);
}

/**
 * A person relation to an inactive unit is inconsistent when it outlives the unit: it is still
 * ongoing (`relationEnd` is `null`), or its end date is later than the unit's inactivity date. A
 * relation that closes on or before `unitEnd` is consistent and not flagged.
 */
export function isRelationInconsistentWithInactiveUnit(
	relationEnd: Date | null,
	unitEnd: Date,
): boolean {
	return relationEnd == null || relationEnd.getTime() > unitEnd.getTime();
}

/** The latest end date among a set of durations, or `null` if all are ongoing. */
function latestEnd(durations: Array<RelationDuration>): Date | null {
	let latest: number | null = null;
	for (const { end } of durations) {
		if (end != null) {
			latest = latest == null ? end.getTime() : Math.max(latest, end.getTime());
		}
	}
	return latest == null ? null : new Date(latest);
}

/**
 * Groups the durations of every unit-to-unit relation of one of `statuses` (optionally only those
 * pointing to `relatedUnitId`) by unit document id.
 */
async function getUnitDurationsByStatus(
	db: Database | Transaction,
	statuses: ReadonlyArray<(typeof schema.organisationalUnitStatusEnum)[number]>,
	relatedUnitId?: string,
): Promise<Map<string, Array<RelationDuration>>> {
	const rows = await db
		.select({
			unitDocumentId: schema.organisationalUnitsRelations.unitDocumentId,
			duration: schema.organisationalUnitsRelations.duration,
		})
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

	const byUnit = new Map<string, Array<RelationDuration>>();
	for (const row of rows) {
		const durations = byUnit.get(row.unitDocumentId) ?? [];
		durations.push(row.duration);
		byUnit.set(row.unitDocumentId, durations);
	}
	return byUnit;
}

export interface PersonRelationToUnit {
	unitDocumentId: string;
	personDocumentId: string;
	personSlug: string;
	personLabel: string | null;
	roleType: string;
	duration: RelationDuration;
}

/** All person relations of one of `roleTypes` pointing to any of `unitDocumentIds`. */
async function getPersonRelationsToUnits(
	db: Database | Transaction,
	roleTypes: ReadonlyArray<(typeof schema.personRoleTypesEnum)[number]>,
	unitDocumentIds: Array<string>,
): Promise<Array<PersonRelationToUnit>> {
	if (unitDocumentIds.length === 0) {
		return [];
	}

	return db
		.select({
			unitDocumentId: schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
			personDocumentId: schema.personsToOrganisationalUnits.personDocumentId,
			personSlug: schema.entities.slug,
			personLabel: schema.entities.label,
			roleType: schema.personRoleTypes.type,
			duration: schema.personsToOrganisationalUnits.duration,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.where(
			and(
				inArray(schema.personRoleTypes.type, [...roleTypes]),
				inArray(schema.personsToOrganisationalUnits.organisationalUnitDocumentId, unitDocumentIds),
			),
		);
}

/** Ids of the units of the rule's subtype that are inactive (see {@link isUnitInactive}). */
function inactiveUnitIdsForRule(
	rule: InactiveUnitRelationRule,
	durationsByUnit: Map<string, Array<RelationDuration>>,
	details: Map<string, UnitDetail>,
): Array<string> {
	return [...durationsByUnit.keys()].filter(
		(unitDocumentId) =>
			details.get(unitDocumentId)?.type === rule.inactiveWhen.unitType &&
			isUnitInactive(durationsByUnit.get(unitDocumentId)!),
	);
}

/**
 * Assembles a rule's findings from already-fetched data — pure, so the core logic is unit-testable
 * without a database. For every inactive unit of the rule's subtype, each person relation of the
 * rule's role types that outlives the unit (see {@link isRelationInconsistentWithInactiveUnit}) is
 * reported. Person relations pointing to units that are not inactive are ignored.
 */
export function buildInactiveUnitRelationFindings(
	rule: InactiveUnitRelationRule,
	durationsByUnit: Map<string, Array<RelationDuration>>,
	details: Map<string, UnitDetail>,
	personRelations: Array<PersonRelationToUnit>,
): Array<InactiveUnitRelationFinding> {
	const inactiveUnitIds = new Set(inactiveUnitIdsForRule(rule, durationsByUnit, details));

	const findings: Array<InactiveUnitRelationFinding> = [];

	for (const relation of personRelations) {
		if (!inactiveUnitIds.has(relation.unitDocumentId)) {
			continue;
		}

		const detail = details.get(relation.unitDocumentId);
		// `latestEnd` is non-null: an inactive unit has at least one ended trigger relation.
		const unitEnd = latestEnd(durationsByUnit.get(relation.unitDocumentId)!)!;
		const relationEnd = relation.duration.end ?? null;

		if (!isRelationInconsistentWithInactiveUnit(relationEnd, unitEnd)) {
			continue;
		}

		const roleLabel = humanizeRoleType(relation.roleType);
		const unitTypeLabel = humanizeUnitType(detail?.type ?? rule.inactiveWhen.unitType);
		const unitLabel = detail?.label ?? relation.unitDocumentId;
		const detailMessage =
			relationEnd == null
				? `Is still an active "${roleLabel}", but the ${unitTypeLabel} "${unitLabel}" is no longer active.`
				: `Remains a "${roleLabel}" until ${relationEnd.toISOString().slice(0, 10)}, after the ${unitTypeLabel} "${unitLabel}" became inactive on ${unitEnd.toISOString().slice(0, 10)}.`;

		findings.push({
			rule: rule.name,
			unitDocumentId: relation.unitDocumentId,
			unitSlug: detail?.slug ?? relation.unitDocumentId,
			unitLabel: detail?.label ?? relation.unitDocumentId,
			unitType: detail?.type ?? rule.inactiveWhen.unitType,
			unitEnd: unitEnd.toISOString(),
			personDocumentId: relation.personDocumentId,
			personSlug: relation.personSlug,
			personLabel: relation.personLabel ?? relation.personDocumentId,
			roleType: relation.roleType,
			personRelationStart: relation.duration.start.toISOString(),
			personRelationEnd: relationEnd == null ? null : relationEnd.toISOString(),
			detail: detailMessage,
		});
	}

	return findings;
}

async function checkInactiveUnitRelationRule(
	db: Database | Transaction,
	rule: InactiveUnitRelationRule,
): Promise<Array<InactiveUnitRelationFinding>> {
	const durationsByUnit = await getUnitDurationsByStatus(db, rule.inactiveWhen.statuses);
	const details = await getUnitDetails(db, [...durationsByUnit.keys()]);

	const inactiveUnitIds = inactiveUnitIdsForRule(rule, durationsByUnit, details);

	const personRelations = await getPersonRelationsToUnits(
		db,
		rule.personRelations.roleTypes,
		inactiveUnitIds,
	);

	return buildInactiveUnitRelationFindings(rule, durationsByUnit, details, personRelations);
}

export async function checkInactiveUnitRelations(
	db: Database | Transaction,
): Promise<InactiveUnitRelationCheckResult> {
	const findings: Array<InactiveUnitRelationFinding> = [];
	const errors: Array<string> = [];

	for (const rule of inactiveUnitRelationRules) {
		try {
			findings.push(...(await checkInactiveUnitRelationRule(db, rule)));
		} catch (error) {
			// oxlint-disable-next-line unicorn/no-instanceof-builtins
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	findings.sort(
		(a, b) =>
			a.rule.localeCompare(b.rule) ||
			a.unitLabel.localeCompare(b.unitLabel) ||
			a.personLabel.localeCompare(b.personLabel),
	);

	return { findings, errors };
}

/**
 * Data-integrity checks for pairs of unit-to-unit relations which must never be recorded on the
 * same unit for the same period, because one already implies the other — e.g. a national
 * coordinating institution is by definition a partner institution, so recording both is redundant:
 * the partner status is inferred from the coordinating relation instead, and only the latter is
 * entered.
 *
 * Unlike the required-relation checks, these compare durations rather than mere presence, because
 * both relations may legitimately co-exist in the database over _separate_ periods — an institution
 * that was a partner institution until 2015 and became a national coordinating institution in 2020
 * is correct history, not a data error. Only where the two periods actually overlap is the
 * redundant relation reported. Two periods that merely touch at an endpoint (one ends exactly when
 * the other begins — a clean handover) are not an overlap.
 *
 * Shared by the `@dariah-eric/audit` cli scripts and the admin dashboard.
 */

/** One side of a mutual-exclusion rule: a unit-to-unit relation of a given shape. */
export interface ExclusiveRelationEndpoint {
	/** A relation with any of these statuses satisfies this side. */
	statuses: ReadonlyArray<(typeof schema.organisationalUnitStatusEnum)[number]>;
	/**
	 * Slug of the related-unit document the relation must point to (e.g. the DARIAH-EU eric). Omit to
	 * match a relation to any related unit — e.g. a national coordinating institution is tied to
	 * whichever country it coordinates, so the related unit must not be pinned.
	 */
	relatedUnitSlug?: string;
	/** Human-readable name for this side, used in findings and the dashboard. */
	label: string;
}

export interface MutuallyExclusiveUnitRelationRule {
	name: string;
	/**
	 * Restrict the check to units of this subtype. Needed because the same status may exist on units
	 * the rule cannot apply to (see `UnitRelationRequirementRule["trigger"]["unitType"]`).
	 */
	unitType?: (typeof schema.organisationalUnitTypesEnum)[number];
	/** The relation which is inferable from `impliedBy`, and so must not be entered alongside it. */
	redundant: ExclusiveRelationEndpoint;
	/** The authoritative relation which already implies `redundant`. */
	impliedBy: ExclusiveRelationEndpoint;
}

export const mutuallyExclusiveUnitRelationRules: Array<MutuallyExclusiveUnitRelationRule> = [
	{
		name: "partner-institution-implied-by-national-coordinating-institution",
		unitType: "institution",
		redundant: {
			statuses: ["is_partner_institution_of"],
			relatedUnitSlug: "dariah-eu",
			label: "Partner institution of DARIAH-EU",
		},
		impliedBy: {
			statuses: ["is_national_coordinating_institution_in"],
			label: "National coordinating institution in a country",
		},
	},
];

export interface MutuallyExclusiveUnitRelationFinding {
	rule: string;
	unitDocumentId: string;
	unitSlug: string;
	unitLabel: string;
	/** Organisational-unit subtype (e.g. `institution`), used to build the dashboard detail link. */
	unitType: string;
	/** Label of the redundant relation, i.e. the one to remove. */
	redundantLabel: string;
	/** Label of the relation which already implies the redundant one. */
	impliedByLabel: string;
	/** The periods during which both relations are recorded, i.e. what must be resolved. */
	overlaps: Array<RelationInterval>;
	detail: string;
}

export interface MutuallyExclusiveUnitRelationCheckResult {
	findings: Array<MutuallyExclusiveUnitRelationFinding>;
	/** Rules which could not run, e.g. because an endpoint's related-unit document is missing. */
	errors: Array<string>;
}

/**
 * The periods covered by both `a` and `b`, merged and display-ready; empty when the two never
 * coincide. Intervals which only touch at an endpoint do not overlap: an institution whose partner
 * relation ends exactly when its coordinating relation begins is a clean handover, so the
 * intersection must be a non-empty span, not a single instant.
 *
 * Durations are compared as recorded — unlike {@link classifyRelationPair}, near-adjacent periods
 * are deliberately not merged first, since bridging a gap between two relations could manufacture
 * an overlap that does not exist.
 */
export function findOverlappingPeriods(
	a: Array<RelationDuration>,
	b: Array<RelationDuration>,
): Array<RelationInterval> {
	const toRaw = (durations: Array<RelationDuration>): Array<Interval> =>
		durations.map((duration) => {
			return { start: duration.start.getTime(), end: duration.end?.getTime() ?? Infinity };
		});

	const overlaps: Array<Interval> = [];

	for (const x of toRaw(a)) {
		for (const y of toRaw(b)) {
			const start = Math.max(x.start, y.start);
			const end = Math.min(x.end, y.end);

			if (start < end) {
				overlaps.push({ start, end });
			}
		}
	}

	return toSerializableIntervals(mergeIntervals(overlaps, 0));
}

/**
 * Assembles a rule's findings from already-fetched data — pure, so the core logic is unit-testable
 * without a database. Reports each unit of the rule's subtype whose two sides overlap in time.
 */
export function buildMutuallyExclusiveUnitRelationFindings(
	rule: MutuallyExclusiveUnitRelationRule,
	redundantByUnit: Map<string, Array<RelationDuration>>,
	impliedByByUnit: Map<string, Array<RelationDuration>>,
	details: Map<string, UnitDetail>,
): Array<MutuallyExclusiveUnitRelationFinding> {
	const findings: Array<MutuallyExclusiveUnitRelationFinding> = [];

	for (const [unitDocumentId, redundantDurations] of redundantByUnit) {
		const impliedByDurations = impliedByByUnit.get(unitDocumentId);
		if (impliedByDurations == null) {
			continue;
		}

		const detail = details.get(unitDocumentId);

		// Drop units of the wrong subtype (see `unitType`), and any unit whose subtype could not be
		// resolved when the rule is type-restricted.
		if (rule.unitType != null && detail?.type !== rule.unitType) {
			continue;
		}

		const overlaps = findOverlappingPeriods(redundantDurations, impliedByDurations);
		if (overlaps.length === 0) {
			continue;
		}

		findings.push({
			rule: rule.name,
			unitDocumentId,
			unitSlug: detail?.slug ?? unitDocumentId,
			unitLabel: detail?.label ?? unitDocumentId,
			unitType: detail?.type ?? rule.unitType ?? "institution",
			redundantLabel: rule.redundant.label,
			impliedByLabel: rule.impliedBy.label,
			overlaps,
			detail: `Is "${rule.impliedBy.label}", which already implies "${rule.redundant.label}", but both relations are recorded for the same period. Remove the redundant "${rule.redundant.label}" relation.`,
		});
	}

	return findings;
}

async function checkMutuallyExclusiveUnitRelationRule(
	db: Database | Transaction,
	rule: MutuallyExclusiveUnitRelationRule,
): Promise<Array<MutuallyExclusiveUnitRelationFinding>> {
	const [redundantRelatedUnitId, impliedByRelatedUnitId] = await Promise.all([
		resolveOptionalUnitIdBySlug(db, rule.name, rule.redundant.relatedUnitSlug),
		resolveOptionalUnitIdBySlug(db, rule.name, rule.impliedBy.relatedUnitSlug),
	]);

	const [redundantByUnit, impliedByByUnit] = await Promise.all([
		getUnitDurationsByStatus(db, rule.redundant.statuses, redundantRelatedUnitId),
		getUnitDurationsByStatus(db, rule.impliedBy.statuses, impliedByRelatedUnitId),
	]);

	// Only units carrying both sides can overlap, so details are fetched for those alone.
	const candidateUnitIds = [...redundantByUnit.keys()].filter((unitDocumentId) =>
		impliedByByUnit.has(unitDocumentId),
	);
	const details = await getUnitDetails(db, candidateUnitIds);

	return buildMutuallyExclusiveUnitRelationFindings(
		rule,
		redundantByUnit,
		impliedByByUnit,
		details,
	);
}

export async function checkMutuallyExclusiveUnitRelations(
	db: Database | Transaction,
): Promise<MutuallyExclusiveUnitRelationCheckResult> {
	const findings: Array<MutuallyExclusiveUnitRelationFinding> = [];
	const errors: Array<string> = [];

	for (const rule of mutuallyExclusiveUnitRelationRules) {
		try {
			findings.push(...(await checkMutuallyExclusiveUnitRelationRule(db, rule)));
		} catch (error) {
			// oxlint-disable-next-line unicorn/no-instanceof-builtins
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.unitLabel.localeCompare(b.unitLabel));

	return { findings, errors };
}
