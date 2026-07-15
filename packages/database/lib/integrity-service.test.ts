import { describe, expect, it } from "vitest";

import {
	type InactiveUnitRelationRule,
	type PersonRelationToUnit,
	type RelationDuration,
	type UnitDetail,
	buildInactiveUnitRelationFindings,
	classifyRelationPair,
	isRelationInconsistentWithInactiveUnit,
	isUnitInactive,
	mergeAdjacentDurations,
	pairedRelationRules,
} from "./integrity-service";

const d = (value: string): Date => new Date(value);

describe("mergeAdjacentDurations", () => {
	it("serialises a single ongoing duration with a null end", () => {
		expect(mergeAdjacentDurations([{ start: d("2025-01-01T00:00:00Z") }])).toEqual([
			{ start: "2025-01-01T00:00:00.000Z", end: null },
		]);
	});

	it("sorts durations by start", () => {
		const merged = mergeAdjacentDurations([
			{ start: d("2024-01-01T00:00:00Z"), end: d("2024-02-01T00:00:00Z") },
			{ start: d("2020-01-01T00:00:00Z"), end: d("2020-02-01T00:00:00Z") },
		]);
		expect(merged.map((interval) => interval.start)).toEqual([
			"2020-01-01T00:00:00.000Z",
			"2024-01-01T00:00:00.000Z",
		]);
	});

	it("merges consecutive terms separated by at most one day into one interval", () => {
		expect(
			mergeAdjacentDurations([
				{ start: d("2024-01-01T00:00:00Z"), end: d("2024-06-30T00:00:00Z") },
				{ start: d("2024-07-01T00:00:00Z"), end: d("2024-12-31T00:00:00Z") },
			]),
		).toEqual([{ start: "2024-01-01T00:00:00.000Z", end: "2024-12-31T00:00:00.000Z" }]);
	});

	it("keeps terms separated by more than one day as distinct intervals", () => {
		const merged = mergeAdjacentDurations([
			{ start: d("2024-01-01T00:00:00Z"), end: d("2024-06-30T00:00:00Z") },
			{ start: d("2024-07-02T00:00:01Z"), end: d("2024-12-31T00:00:00Z") },
		]);
		expect(merged).toHaveLength(2);
	});
});

describe("pairedRelationRules", () => {
	it("counts chairing or vice-chairing the NCC as a role on the committee", () => {
		const ncc = pairedRelationRules.find((rule) => rule.name === "national-coordinator-ncc");

		expect(ncc?.b.unitSlug).toBe("national-coordinator-committee");
		// Chair/vice-chair are committee roles too, so they must satisfy the committee side alongside
		// plain membership when pairing against national coordinators.
		expect(ncc?.b.roleTypes).toEqual(
			expect.arrayContaining(["is_member_of", "is_chair_of", "is_vice_chair_of"]),
		);
	});
});

describe("classifyRelationPair", () => {
	const term = [{ start: d("2025-01-01T00:00:00Z"), end: d("2025-12-31T00:00:00Z") }];
	const otherTerm = [{ start: d("2026-01-01T00:00:00Z"), end: d("2026-12-31T00:00:00Z") }];

	it("returns null when neither side has any relation", () => {
		expect(classifyRelationPair([], [])).toBeNull();
	});

	it("returns null when both sides match", () => {
		expect(classifyRelationPair(term, term)).toBeNull();
	});

	it("flags the b side missing when only a is present", () => {
		expect(classifyRelationPair(term, [])).toEqual({
			kind: "missing_counterpart",
			missingSide: "b",
		});
	});

	it("flags the a side missing when only b is present (the reverse direction)", () => {
		expect(classifyRelationPair([], term)).toEqual({
			kind: "missing_counterpart",
			missingSide: "a",
		});
	});

	it("is symmetric — swapping the sides flips which side is reported missing", () => {
		expect(classifyRelationPair(term, [])).toEqual({
			kind: "missing_counterpart",
			missingSide: "b",
		});
		expect(classifyRelationPair([], term)).toEqual({
			kind: "missing_counterpart",
			missingSide: "a",
		});
	});

	it("flags a duration mismatch when both exist but their periods differ", () => {
		expect(classifyRelationPair(term, otherTerm)).toEqual({ kind: "duration_mismatch" });
	});

	it("treats two ongoing relations with the same start as consistent", () => {
		const ongoing = [{ start: d("2025-01-01T00:00:00Z") }];
		expect(classifyRelationPair(ongoing, ongoing)).toBeNull();
	});

	it("flags a mismatch when one side is ongoing and the other has ended", () => {
		const ongoing = [{ start: d("2025-01-01T00:00:00Z") }];
		expect(classifyRelationPair(ongoing, term)).toEqual({ kind: "duration_mismatch" });
	});

	it("is consistent when split consecutive terms on one side merge to match the other", () => {
		const split = [
			{ start: d("2024-01-01T00:00:00Z"), end: d("2024-06-30T00:00:00Z") },
			{ start: d("2024-07-01T00:00:00Z"), end: d("2024-12-31T00:00:00Z") },
		];
		const continuous = [{ start: d("2024-01-01T00:00:00Z"), end: d("2024-12-31T00:00:00Z") }];
		expect(classifyRelationPair(split, continuous)).toBeNull();
	});

	it("flags a mismatch when a gap larger than the merge window remains", () => {
		const gapped = [
			{ start: d("2024-01-01T00:00:00Z"), end: d("2024-06-30T00:00:00Z") },
			{ start: d("2024-07-05T00:00:00Z"), end: d("2024-12-31T00:00:00Z") },
		];
		const continuous = [{ start: d("2024-01-01T00:00:00Z"), end: d("2024-12-31T00:00:00Z") }];
		expect(classifyRelationPair(gapped, continuous)).toEqual({ kind: "duration_mismatch" });
	});

	it("merges an NCC member term into a following chair term as one committee tenure", () => {
		// Mirrors Richard Zijdeman: is_member_of the NCC, then is_chair_of it — one day apart, so the
		// two terms merge into a single continuous committee involvement (2021-01-01 – 2028-12-31).
		const committee = [
			{ start: d("2021-01-01T00:00:00Z"), end: d("2025-12-31T00:00:00Z") },
			{ start: d("2026-01-01T00:00:00Z"), end: d("2028-12-31T00:00:00Z") },
		];
		expect(mergeAdjacentDurations(committee)).toEqual([
			{ start: "2021-01-01T00:00:00.000Z", end: "2028-12-31T00:00:00.000Z" },
		]);
	});

	it("flags a mismatch when the committee tenure is bounded but the coordinator role is open-ended", () => {
		// The remaining, legitimate Zijdeman finding: his committee roles (member + chair) end 2028,
		// but his national-coordinator relation has no end date, so the periods still do not match.
		const coordinatorOngoing = [{ start: d("2021-01-01T00:00:00Z") }];
		const committeeMemberThenChair = [
			{ start: d("2021-01-01T00:00:00Z"), end: d("2025-12-31T00:00:00Z") },
			{ start: d("2026-01-01T00:00:00Z"), end: d("2028-12-31T00:00:00Z") },
		];
		expect(classifyRelationPair(coordinatorOngoing, committeeMemberThenChair)).toEqual({
			kind: "duration_mismatch",
		});
	});
});

describe("isUnitInactive", () => {
	it("is not inactive when there are no trigger relations", () => {
		expect(isUnitInactive([])).toBe(false);
	});

	it("is inactive when its only trigger relation has ended", () => {
		expect(
			isUnitInactive([{ start: d("2020-01-01T00:00:00Z"), end: d("2024-01-01T00:00:00Z") }]),
		).toBe(true);
	});

	it("is not inactive when a trigger relation is still ongoing", () => {
		expect(isUnitInactive([{ start: d("2020-01-01T00:00:00Z") }])).toBe(false);
	});

	it("is not inactive when any of several trigger relations is still ongoing", () => {
		expect(
			isUnitInactive([
				{ start: d("2018-01-01T00:00:00Z"), end: d("2020-01-01T00:00:00Z") },
				{ start: d("2020-01-01T00:00:00Z") },
			]),
		).toBe(false);
	});

	it("is inactive when every trigger relation has ended", () => {
		expect(
			isUnitInactive([
				{ start: d("2016-01-01T00:00:00Z"), end: d("2018-01-01T00:00:00Z") },
				{ start: d("2018-01-01T00:00:00Z"), end: d("2020-01-01T00:00:00Z") },
			]),
		).toBe(true);
	});
});

describe("isRelationInconsistentWithInactiveUnit", () => {
	const unitEnd = d("2019-01-01T00:00:00Z");

	it("flags an ongoing relation", () => {
		expect(isRelationInconsistentWithInactiveUnit(null, unitEnd)).toBe(true);
	});

	it("flags a relation that ends after the unit went inactive", () => {
		expect(isRelationInconsistentWithInactiveUnit(d("2025-01-01T00:00:00Z"), unitEnd)).toBe(true);
	});

	it("does not flag a relation that ends before the unit went inactive", () => {
		expect(isRelationInconsistentWithInactiveUnit(d("2017-01-01T00:00:00Z"), unitEnd)).toBe(false);
	});

	it("does not flag a relation that ends exactly when the unit went inactive", () => {
		expect(isRelationInconsistentWithInactiveUnit(unitEnd, unitEnd)).toBe(false);
	});
});

describe("buildInactiveUnitRelationFindings", () => {
	const rule: InactiveUnitRelationRule = {
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
	};

	// A working group whose only `is_part_of` relation ended on 2019-01-01, i.e. inactive since then.
	const durationsByUnit = new Map<string, Array<RelationDuration>>([
		["wg-1", [{ start: d("2010-01-01T00:00:00Z"), end: d("2019-01-01T00:00:00Z") }]],
	]);
	const details = new Map<string, UnitDetail>([
		["wg-1", { slug: "wg-1", label: "Working Group 1", type: "working_group" }],
	]);

	const chair = (personDocumentId: string, duration: RelationDuration): PersonRelationToUnit => {
		return {
			unitDocumentId: "wg-1",
			personDocumentId,
			personSlug: `${personDocumentId}-slug`,
			personLabel: `Person ${personDocumentId}`,
			roleType: "is_chair_of",
			duration,
		};
	};

	it("flags a chair whose relation is still ongoing", () => {
		const findings = buildInactiveUnitRelationFindings(rule, durationsByUnit, details, [
			chair("p1", { start: d("2015-01-01T00:00:00Z") }),
		]);

		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({
			personDocumentId: "p1",
			unitEnd: "2019-01-01T00:00:00.000Z",
			personRelationEnd: null,
			detail:
				'Is still an active "chair", but the working group "Working Group 1" is no longer active.',
		});
	});

	it("flags a chair whose relation ends after the working group went inactive", () => {
		// The reported bug: chair relation ends 2025 while the working group ended 2019.
		const findings = buildInactiveUnitRelationFindings(rule, durationsByUnit, details, [
			chair("p2", { start: d("2015-01-01T00:00:00Z"), end: d("2025-01-01T00:00:00Z") }),
		]);

		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({
			personDocumentId: "p2",
			unitEnd: "2019-01-01T00:00:00.000Z",
			personRelationEnd: "2025-01-01T00:00:00.000Z",
			detail:
				'Remains a "chair" until 2025-01-01, after the working group "Working Group 1" became inactive on 2019-01-01.',
		});
	});

	it("does not flag a chair whose relation closed before the working group went inactive", () => {
		const findings = buildInactiveUnitRelationFindings(rule, durationsByUnit, details, [
			chair("p3", { start: d("2010-01-01T00:00:00Z"), end: d("2018-01-01T00:00:00Z") }),
		]);

		expect(findings).toEqual([]);
	});

	it("does not flag a chair whose relation closed exactly when the working group went inactive", () => {
		const findings = buildInactiveUnitRelationFindings(rule, durationsByUnit, details, [
			chair("p4", { start: d("2010-01-01T00:00:00Z"), end: d("2019-01-01T00:00:00Z") }),
		]);

		expect(findings).toEqual([]);
	});

	it("reports each inconsistent relation independently, keeping only the ones that outlive the unit", () => {
		const findings = buildInactiveUnitRelationFindings(rule, durationsByUnit, details, [
			chair("ongoing", { start: d("2015-01-01T00:00:00Z") }),
			chair("overruns", { start: d("2015-01-01T00:00:00Z"), end: d("2025-01-01T00:00:00Z") }),
			chair("closed", { start: d("2010-01-01T00:00:00Z"), end: d("2017-01-01T00:00:00Z") }),
		]);

		expect(findings.map((finding) => finding.personDocumentId)).toEqual(["ongoing", "overruns"]);
	});

	it("ignores relations to a unit that is still active", () => {
		const activeDurations = new Map<string, Array<RelationDuration>>([
			// An ongoing `is_part_of` relation means the working group is still active.
			["wg-1", [{ start: d("2010-01-01T00:00:00Z") }]],
		]);

		const findings = buildInactiveUnitRelationFindings(rule, activeDurations, details, [
			chair("p1", { start: d("2015-01-01T00:00:00Z") }),
		]);

		expect(findings).toEqual([]);
	});

	it("ignores inactive units whose subtype does not match the rule", () => {
		const countryDetails = new Map<string, UnitDetail>([
			["wg-1", { slug: "wg-1", label: "Some Country", type: "country" }],
		]);

		const findings = buildInactiveUnitRelationFindings(rule, durationsByUnit, countryDetails, [
			chair("p1", { start: d("2015-01-01T00:00:00Z") }),
		]);

		expect(findings).toEqual([]);
	});

	// The same logic backs the country rule, so a national coordinator whose relation outlives the
	// country's membership must be flagged just like a working-group chair.
	it("flags a national coordinator whose relation ends after the country left", () => {
		const countryRule: InactiveUnitRelationRule = {
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
		};
		// A country whose only `is_member_of` relation ended on 2019-01-01.
		const countryDurations = new Map<string, Array<RelationDuration>>([
			["c-1", [{ start: d("2005-01-01T00:00:00Z"), end: d("2019-01-01T00:00:00Z") }]],
		]);
		const countryDetails = new Map<string, UnitDetail>([
			["c-1", { slug: "c-1", label: "Country 1", type: "country" }],
		]);

		const findings = buildInactiveUnitRelationFindings(
			countryRule,
			countryDurations,
			countryDetails,
			[
				{
					unitDocumentId: "c-1",
					personDocumentId: "coordinator",
					personSlug: "coordinator-slug",
					personLabel: "The Coordinator",
					roleType: "national_coordinator",
					duration: { start: d("2015-01-01T00:00:00Z"), end: d("2025-01-01T00:00:00Z") },
				},
			],
		);

		expect(findings).toHaveLength(1);
		expect(findings[0]).toMatchObject({
			rule: "inactive-country-relations-closed",
			personDocumentId: "coordinator",
			roleType: "national_coordinator",
			personRelationEnd: "2025-01-01T00:00:00.000Z",
			detail:
				'Remains a "national coordinator" until 2025-01-01, after the country "Country 1" became inactive on 2019-01-01.',
		});
	});
});
