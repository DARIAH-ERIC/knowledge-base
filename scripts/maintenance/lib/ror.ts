import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";
import { type RequestOptions, request } from "@dariah-eric/request";
import { HttpError } from "@dariah-eric/request/errors";

/**
 * Minimal binding for ROR's affiliation matcher. Kept here rather than in a `client-ror` package
 * because this is the only consumer and the only endpoint used; promote it if that changes.
 */

interface RorName {
	value: string;
	types: Array<string>;
}

interface RorLocation {
	/** Wire format, hence the snake case. */
	geonames_details?: {
		country_name?: string;
		name?: string;
	};
}

interface RorOrganization {
	id: string;
	names: Array<RorName>;
	locations?: Array<RorLocation>;
}

export interface RorMatch {
	chosen: boolean;
	score: number;
	/** Wire format, hence the snake case. Always `SINGLE SEARCH` with score 1 for a chosen match. */
	matching_type: string;
	organization: RorOrganization;
}

interface RorAffiliationResponse {
	items: Array<RorMatch>;
}

/**
 * Retry transient failures. 429 matters most here: a backfill run issues several hundred sequential
 * requests, and ROR throttles rather than hard-failing, so an exponential backoff turns a throttle
 * into a pause instead of a dead run.
 */
const retry: RequestOptions["retry"] = {
	backoff: "exponential",
	delayMs: 2000,
	times: 4,
	shouldRetry(error) {
		if (error._tag === "NetworkError" || error._tag === "TimeoutError") {
			return true;
		}

		if (HttpError.is(error)) {
			return error.response.status >= 500 || error.response.status === 429;
		}

		return false;
	},
};

export interface RorClient {
	matchAffiliation(affiliation: string): Promise<RorMatch | null>;
}

export function createRorClient(params: { baseUrl: string }): RorClient {
	return {
		/** The single match ROR is confident enough to pick, if any. */
		async matchAffiliation(affiliation: string): Promise<RorMatch | null> {
			const result = await request<RorAffiliationResponse>(
				createUrl({
					baseUrl: params.baseUrl,
					pathname: "/v2/organizations",
					searchParams: createUrlSearchParams({ affiliation }),
				}),
				{ responseType: "json", retry, timeout: 30_000 },
			);

			const { data } = result.unwrap();

			return data.items.find((item) => item.chosen) ?? null;
		},
	};
}

/** Every name ROR knows the organisation by — display name, labels and aliases alike. */
export function getRorNames(match: RorMatch): Array<string> {
	return match.organization.names.map((name) => name.value);
}

export function getRorDisplayName(match: RorMatch): string | null {
	const display = match.organization.names.find((name) => name.types.includes("ror_display"));

	return display?.value ?? match.organization.names[0]?.value ?? null;
}

/** Primary location, used both to disambiguate generic names and to show a reviewer where it is. */
export function getRorLocation(match: RorMatch): { country: string | null; city: string | null } {
	const details = match.organization.locations?.[0]?.geonames_details;

	return { country: details?.country_name ?? null, city: details?.name ?? null };
}
