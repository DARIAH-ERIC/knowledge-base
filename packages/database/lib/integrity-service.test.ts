import { describe, expect, it } from "vitest";

import { classifyRelationPair, isUnitInactive, mergeAdjacentDurations } from "./integrity-service";

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
