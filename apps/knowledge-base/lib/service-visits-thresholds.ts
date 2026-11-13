/**
 * Service sizes matched by visit count, smallest first. "small" needs a threshold too: services
 * below it get no size, so they drop out of the operational cost (an explicit 0 counts every
 * service). Important and core services are not matched by visits.
 */
export const serviceSizesWithVisitsThreshold = ["small", "medium", "large"] as const;

export type ServiceSizeWithVisitsThreshold = (typeof serviceSizesWithVisitsThreshold)[number];

/**
 * Sizes, from medium up, whose visits threshold is not strictly above the closest smaller size's
 * that is set. Sizes are matched by threshold, not by name, so out of order they would be billed as
 * the wrong size. Sizes without a threshold are skipped.
 */
export function getUnorderedVisitsThresholds(
	thresholds: ReadonlyMap<string, number | null | undefined>,
): Array<ServiceSizeWithVisitsThreshold> {
	const unordered: Array<ServiceSizeWithVisitsThreshold> = [];
	let previous: number | null = null;

	for (const size of serviceSizesWithVisitsThreshold) {
		const threshold = thresholds.get(size);
		if (threshold == null) {
			continue;
		}
		if (previous != null && threshold <= previous) {
			unordered.push(size);
		}
		previous = threshold;
	}

	return unordered;
}
