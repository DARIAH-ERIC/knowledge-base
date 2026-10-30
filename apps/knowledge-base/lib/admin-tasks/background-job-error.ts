import {
	AbortError,
	HttpError,
	NetworkError,
	ParseError,
	TimeoutError,
} from "@dariah-eric/request/errors";

/**
 * A structured description of why a background job failed. Persisted as jsonb in the
 * `background_jobs.error` column so the admin dashboard can render a localized message instead of a
 * raw stack trace. The most common failures are request errors against the external APIs we sync
 * from; `unknown` is the fallback for everything else (and for legacy rows that predate this
 * shape).
 */
export type BackgroundJobError =
	| { kind: "http"; host: string; status: number; statusText: string }
	| { kind: "timeout"; host: string }
	| { kind: "network"; host: string }
	| { kind: "parse"; host: string }
	| { kind: "abort"; host: string }
	| { kind: "stuck" }
	| { kind: "unknown"; message: string };

/** The host of a request URL, falling back to the raw URL if it cannot be parsed. */
function getRequestHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}

/** How far to follow `cause` links, as a guard against cycles. */
const MAX_CAUSE_DEPTH = 10;

/** Upper bound for a persisted `unknown` message, so a huge payload cannot bloat the row. */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * The error followed by its `cause` chain. `better-result` wraps errors rather than replacing them:
 * `unwrap()` throws a `Panic` and a `TaggedError` such as `SearchError` keeps what it caught, both
 * with the original error as `cause`.
 */
function getCauseChain(error: unknown): Array<unknown> {
	const chain: Array<unknown> = [];
	let current: unknown = error;

	while (current != null && chain.length < MAX_CAUSE_DEPTH && !chain.includes(current)) {
		chain.push(current);
		// oxlint-disable-next-line unicorn/no-instanceof-builtins
		current = current instanceof Error ? current.cause : undefined;
	}

	return chain;
}

function describeError(error: unknown): string {
	// oxlint-disable-next-line unicorn/no-instanceof-builtins
	if (error instanceof Error) {
		return error.message.length > 0 ? error.message : error.name;
	}
	if (typeof error === "string") {
		return error;
	}
	return JSON.stringify(error) ?? String(error);
}

/**
 * Reduce a thrown background-job error to a structured {@link BackgroundJobError}. A request error
 * anywhere in the `cause` chain is reported as such; anything else keeps the messages of the whole
 * chain, since the outer error (e.g. `SearchError`) often names only the layer that failed.
 */
export function toBackgroundJobError(error: unknown): BackgroundJobError {
	const chain = getCauseChain(error);

	for (const link of chain) {
		if (HttpError.is(link)) {
			const { status, statusText } = link.response;
			return { kind: "http", host: getRequestHost(link.request.url), status, statusText };
		}
		if (TimeoutError.is(link)) {
			return { kind: "timeout", host: getRequestHost(link.request.url) };
		}
		if (NetworkError.is(link)) {
			return { kind: "network", host: getRequestHost(link.request.url) };
		}
		if (ParseError.is(link)) {
			return { kind: "parse", host: getRequestHost(link.request.url) };
		}
		if (AbortError.is(link)) {
			return { kind: "abort", host: getRequestHost(link.request.url) };
		}
	}

	const messages = [...new Set(chain.map(describeError))];
	const message = messages.length > 0 ? messages.join(": ") : describeError(error);

	return {
		kind: "unknown",
		message:
			message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH)}…` : message,
	};
}

/**
 * Coerce a persisted `background_jobs.error` value (jsonb, so already deserialized) into a
 * {@link BackgroundJobError}. Anything that does not match the expected shape — e.g. a legacy raw
 * string that slipped through — is surfaced as an `unknown` error.
 */
export function coerceBackgroundJobError(value: unknown): BackgroundJobError {
	if (value != null && typeof value === "object" && "kind" in value) {
		return value as BackgroundJobError;
	}
	if (typeof value === "string") {
		return { kind: "unknown", message: value };
	}
	return { kind: "unknown", message: JSON.stringify(value) };
}
