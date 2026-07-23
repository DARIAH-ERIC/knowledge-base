/**
 * Shared helpers for the `data:backfill:*` scripts, which all follow the same shape: propose a
 * value for a column by matching local records against an external register, write every proposal
 * to a TSV for review, and write back only the ones that are unambiguous.
 */

/** Case, accents and punctuation all vary freely between registers; word order does not. */
export function normalise(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replaceAll(/\p{Diacritic}/gu, "")
		.replaceAll(/[^\p{Letter}\p{Number}]+/gu, " ")
		.trim();
}

/**
 * Jaccard overlap of significant tokens. Short tokens are dropped so that articles and prepositions
 * ("of", "de", "the") cannot prop up a score on their own.
 */
export function similarity(a: string, b: string): number {
	const toTokens = (value: string) =>
		new Set(
			normalise(value)
				.split(" ")
				.filter((token) => token.length > 2),
		);

	const tokensA = toTokens(a);
	const tokensB = toTokens(b);

	if (tokensA.size === 0 || tokensB.size === 0) {
		return 0;
	}

	let shared = 0;
	for (const token of tokensA) {
		if (tokensB.has(token)) {
			shared += 1;
		}
	}

	return shared / (tokensA.size + tokensB.size - shared);
}

/** Local units store a ROR as a URL, external registers use the bare id. */
export function toRorId(value: string | null | undefined): string | null {
	if (value == null) {
		return null;
	}

	const rorId = value.trim().replace(/^https?:\/\/ror\.org\//, "");

	return rorId.length > 0 ? rorId : null;
}

export function toRorUrl(rorId: string): string {
	return `https://ror.org/${rorId}`;
}

/**
 * Country units are stored by name and carry no ISO code, so a comparison against an external
 * register has to reconcile naming. Only the divergences that actually occur are listed; anything
 * unlisted simply compares by its normalised name.
 *
 * A pair this map fails to reconcile reads as a mismatch, which sends the proposal to review rather
 * than writing it — so an omission here costs a reviewer a glance, never a wrong value.
 */
const countryAliases = new Map([
	["czech republic", "czechia"],
	["the netherlands", "netherlands"],
	["holland", "netherlands"],
	["turkey", "turkiye"],
	["slovak republic", "slovakia"],
	["republic of ireland", "ireland"],
	["republic of moldova", "moldova"],
	["macedonia", "north macedonia"],
	["russian federation", "russia"],
	["united states of america", "united states"],
	["great britain", "united kingdom"],
]);

export function canonicalCountry(value: string | null | undefined): string | null {
	if (value == null) {
		return null;
	}

	const normalised = normalise(value);

	if (normalised.length === 0) {
		return null;
	}

	return countryAliases.get(normalised) ?? normalised;
}
