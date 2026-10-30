import { HttpError, TimeoutError } from "@dariah-eric/request/errors";
import { SearchError } from "@dariah-eric/search/errors";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";

import { toBackgroundJobError } from "@/lib/admin-tasks/background-job-error";

const request = new Request("https://api.example.org/items");

function unwrapError(value: unknown): unknown {
	try {
		Result.err(value).unwrap();
	} catch (error) {
		return error;
	}
	throw new Error("Expected unwrap to throw.");
}

describe("toBackgroundJobError", () => {
	it("reports a request error", () => {
		const response = new Response(null, { status: 503, statusText: "Service Unavailable" });

		expect(toBackgroundJobError(new HttpError({ request, response }))).toEqual({
			kind: "http",
			host: "api.example.org",
			status: 503,
			statusText: "Service Unavailable",
		});
	});

	it("finds a request error in the cause chain of an unwrapped result", () => {
		expect(toBackgroundJobError(unwrapError(new TimeoutError({ request })))).toEqual({
			kind: "timeout",
			host: "api.example.org",
		});
	});

	it("keeps the messages of the cause chain", () => {
		const cause = new Error("Request failed with HTTP code 503 | Server said: Not Ready");

		expect(toBackgroundJobError(new SearchError({ cause }))).toEqual({
			kind: "unknown",
			message: "SearchError: Request failed with HTTP code 503 | Server said: Not Ready",
		});
	});

	it("does not repeat a message passed on by a wrapper", () => {
		const cause = new Error("boom");

		expect(toBackgroundJobError(new Error("boom", { cause }))).toEqual({
			kind: "unknown",
			message: "boom",
		});
	});

	it("handles non-error values", () => {
		expect(toBackgroundJobError("failed")).toEqual({ kind: "unknown", message: "failed" });
		expect(toBackgroundJobError({ code: 1 })).toEqual({ kind: "unknown", message: '{"code":1}' });
		expect(toBackgroundJobError(undefined)).toEqual({ kind: "unknown", message: "undefined" });
	});

	it("stops at a cause cycle", () => {
		const error = new Error("loop");
		error.cause = error;

		expect(toBackgroundJobError(error)).toEqual({ kind: "unknown", message: "loop" });
	});
});
