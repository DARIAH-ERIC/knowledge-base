import * as v from "valibot";

import { getUnorderedVisitsThresholds } from "@/lib/service-visits-thresholds";

const nullableAmount = v.optional(v.pipe(v.string(), v.toNumber(), v.minValue(0)));
const nullableThreshold = v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)));

const thresholdWithoutAmountMessage = "Please enter an amount for this visits threshold.";
const unorderedThresholdMessage =
	"Please enter a visits threshold above the thresholds of the smaller sizes.";

function isThresholdOrdered(
	input: {
		small_threshold?: number | undefined;
		medium_threshold?: number | undefined;
		large_threshold?: number | undefined;
	},
	size: "medium" | "large",
): boolean {
	const thresholds = new Map([
		["small", input.small_threshold],
		["medium", input.medium_threshold],
		["large", input.large_threshold],
	]);
	return !getUnorderedVisitsThresholds(thresholds).includes(size);
}

/**
 * A visits threshold is stored on its size's amount row, so a threshold without an amount would be
 * silently dropped. Thresholds must increase with size; empty ones are skipped, so drafts can be
 * saved partially.
 */
export const UpsertCampaignServiceSizesActionInputSchema = v.pipe(
	v.object({
		id: v.pipe(v.string(), v.uuid()),
		small_threshold: nullableThreshold,
		small_amount: nullableAmount,
		medium_threshold: nullableThreshold,
		medium_amount: nullableAmount,
		large_threshold: nullableThreshold,
		large_amount: nullableAmount,
		important_amount: nullableAmount,
		core_amount: nullableAmount,
	}),
	v.forward(
		v.partialCheck(
			[["small_threshold"], ["small_amount"]],
			(input) => input.small_threshold == null || input.small_amount != null,
			thresholdWithoutAmountMessage,
		),
		["small_amount"],
	),
	v.forward(
		v.partialCheck(
			[["medium_threshold"], ["medium_amount"]],
			(input) => input.medium_threshold == null || input.medium_amount != null,
			thresholdWithoutAmountMessage,
		),
		["medium_amount"],
	),
	v.forward(
		v.partialCheck(
			[["large_threshold"], ["large_amount"]],
			(input) => input.large_threshold == null || input.large_amount != null,
			thresholdWithoutAmountMessage,
		),
		["large_amount"],
	),
	v.forward(
		v.partialCheck(
			[["small_threshold"], ["medium_threshold"]],
			(input) => isThresholdOrdered(input, "medium"),
			unorderedThresholdMessage,
		),
		["medium_threshold"],
	),
	v.forward(
		v.partialCheck(
			[["small_threshold"], ["medium_threshold"], ["large_threshold"]],
			(input) => isThresholdOrdered(input, "large"),
			unorderedThresholdMessage,
		),
		["large_threshold"],
	),
);
