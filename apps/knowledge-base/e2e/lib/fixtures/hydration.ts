import { type Locator, expect } from "@playwright/test";

/**
 * Resolves once React has hydrated the element `locator` points at.
 *
 * A click which lands on the server-rendered markup before React has attached its handlers is
 * dropped: a tab stays unselected, a button does nothing, and the test waits on a change which
 * never comes. React marks every host element it has hydrated with an internal `__reactProps$…`
 * key, so wait for that rather than for an arbitrary delay. Unlike re-issuing the click until
 * something changes, this is safe for actions which must only happen once.
 */
export async function waitForHydration(locator: Locator): Promise<void> {
	await expect
		.poll(async () =>
			locator.evaluate((element) =>
				Object.keys(element).some((key) => key.startsWith("__reactProps$")),
			),
		)
		.toBe(true);
}

/** Clicks `locator` once React has hydrated it. */
export async function clickHydrated(locator: Locator): Promise<void> {
	await waitForHydration(locator);
	await locator.click();
}
