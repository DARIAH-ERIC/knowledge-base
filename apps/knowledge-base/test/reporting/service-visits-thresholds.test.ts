import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { UpsertCampaignServiceSizesActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-service-sizes.schema";
import { getUnorderedVisitsThresholds } from "@/lib/service-visits-thresholds";

describe("getUnorderedVisitsThresholds", () => {
	it("accepts strictly increasing thresholds", () => {
		const thresholds = new Map([
			["small", 0],
			["medium", 1000],
			["large", 5000],
			["very_large", 10_000],
		]);
		expect(getUnorderedVisitsThresholds(thresholds)).toEqual([]);
	});

	it("reports a threshold not above the next smaller one", () => {
		const thresholds = new Map([
			["small", 0],
			["medium", 10_000],
			["large", 5000],
			["very_large", 20_000],
		]);
		expect(getUnorderedVisitsThresholds(thresholds)).toEqual(["large"]);
	});

	it("reports equal thresholds", () => {
		const thresholds = new Map([
			["small", 100],
			["medium", 100],
		]);
		expect(getUnorderedVisitsThresholds(thresholds)).toEqual(["medium"]);
	});

	it("compares against the closest smaller size that has a threshold", () => {
		const thresholds = new Map<string, number | null>([
			["small", 1000],
			["medium", null],
			["large", 500],
		]);
		expect(getUnorderedVisitsThresholds(thresholds)).toEqual(["large"]);
	});

	it("skips sizes without a threshold", () => {
		const thresholds = new Map<string, number | null>([
			["small", null],
			["medium", 1000],
			["large", null],
			["very_large", 5000],
		]);
		expect(getUnorderedVisitsThresholds(thresholds)).toEqual([]);
	});
});

describe("UpsertCampaignServiceSizesActionInputSchema", () => {
	const id = "0190c0b4-0000-7000-8000-000000000000";

	function issuePaths(input: Record<string, string>): Array<string> {
		const result = v.safeParse(UpsertCampaignServiceSizesActionInputSchema, { id, ...input });
		return (result.issues ?? []).map((issue) => v.getDotPath(issue) ?? "");
	}

	it("accepts a partially filled form", () => {
		expect(issuePaths({ medium_threshold: "1000", medium_amount: "20" })).toEqual([]);
	});

	it("refuses a threshold without its amount", () => {
		expect(issuePaths({ medium_threshold: "1000" })).toEqual(["medium_amount"]);
	});

	it("refuses thresholds out of order, on the offending field", () => {
		expect(
			issuePaths({
				small_threshold: "0",
				small_amount: "10",
				medium_threshold: "10000",
				medium_amount: "20",
				large_threshold: "5000",
				large_amount: "30",
			}),
		).toEqual(["large_threshold"]);
	});
});
