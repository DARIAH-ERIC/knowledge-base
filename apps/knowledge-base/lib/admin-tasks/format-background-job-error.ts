import {
	AbortError,
	HttpError,
	NetworkError,
	ParseError,
	TimeoutError,
} from "@dariah-eric/request/errors";

/** The host of a request URL, falling back to the raw URL if it cannot be parsed. */
function getRequestHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}

/**
 * Turn a thrown background-job error into a concise, human-readable message for the admin
 * dashboard. The most common failures are request errors against the external APIs we sync from
 * (timeouts, unreachable hosts, unparseable responses, non-2xx responses) — these get a friendly
 * explanation including the host and (for HTTP errors) the status code. Everything else falls back
 * to the error message. The full error, including the stack trace, is logged separately for
 * debugging.
 */
export function formatBackgroundJobError(error: unknown): string {
	if (HttpError.is(error)) {
		const { status, statusText } = error.response;
		const reason = statusText.length > 0 ? `${String(status)} ${statusText}` : String(status);
		return `The server at ${getRequestHost(error.request.url)} responded with an error (${reason}).`;
	}

	if (TimeoutError.is(error)) {
		return `The request to ${getRequestHost(error.request.url)} timed out.`;
	}

	if (NetworkError.is(error)) {
		return `Could not reach ${getRequestHost(error.request.url)}. The service may be down or unreachable.`;
	}

	if (ParseError.is(error)) {
		return `Received an unexpected response from ${getRequestHost(error.request.url)} that could not be parsed.`;
	}

	if (AbortError.is(error)) {
		return `The request to ${getRequestHost(error.request.url)} was aborted.`;
	}

	// oxlint-disable-next-line unicorn/no-instanceof-builtins
	if (error instanceof Error) {
		return error.message.length > 0 ? error.message : error.name;
	}

	if (typeof error === "string") {
		return error;
	}

	return JSON.stringify(error);
}
