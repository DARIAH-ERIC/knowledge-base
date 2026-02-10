import {
	AbortError,
	DecodeError,
	HttpError,
	NetworkError,
	TimeoutError,
} from "@dariah-eric/errors";
import { Result } from "better-result";
import isNetworkError from "is-network-error";

export type HttpMethod = "delete" | "get" | "head" | "options" | "patch" | "post" | "put" | "trace";

type BodyInit = NonNullable<RequestInit["body"]>;

export type RequestBody = BodyInit | JsonValue | null;

export type ResponseType =
	| "arrayBuffer"
	| "blob"
	| "bytes"
	| "formData"
	| "json"
	| "response"
	| "stream"
	| "text"
	| "void";

export interface RequestOptions<TResponseType extends ResponseType = ResponseType> extends Omit<
	RequestInit,
	"body" | "method"
> {
	body?: RequestBody;
	fetch?: typeof globalThis.fetch;
	/** @default "get" */
	method?: HttpMethod;
	responseType: TResponseType;
	/** @default 10_000 */
	timeout?: number | false;
}

export type RequestError = AbortError | DecodeError | HttpError | NetworkError | TimeoutError;

export type RequestResult<TData = unknown> = Result<
	{ data: TData; headers: Headers },
	RequestError
>;

export async function request(
	url: URL | string,
	options: RequestOptions<"arrayBuffer">,
): Promise<RequestResult<ArrayBuffer>>;

export async function request(
	url: URL | string,
	options: RequestOptions<"blob">,
): Promise<RequestResult<Blob>>;

export async function request(
	url: URL | string,
	options: RequestOptions<"bytes">,
): Promise<RequestResult<Uint8Array<ArrayBuffer>>>;

/** @deprecated */
export async function request(
	url: URL | string,
	options: RequestOptions<"formData">,
): Promise<RequestResult<FormData>>;

export async function request<TData = unknown>(
	url: URL | string,
	options: RequestOptions<"json">,
): Promise<RequestResult<TData>>;

export async function request(
	url: URL | string,
	options: RequestOptions<"response">,
): Promise<RequestResult<Response>>;

export async function request(
	url: URL | string,
	options: RequestOptions<"stream">,
): Promise<RequestResult<ReadableStream<Uint8Array<ArrayBuffer>> | null>>;

export async function request(
	url: URL | string,
	options: RequestOptions<"text">,
): Promise<RequestResult<string>>;

export async function request(
	url: URL | string,
	options: RequestOptions<"void">,
): Promise<RequestResult<null>>;

export async function request(url: URL | string, options: RequestOptions): Promise<RequestResult> {
	const {
		body: _body,
		headers: _headers,
		method: _method,
		responseType,
		signal: _signal,
		timeout = 10_000,
		...rest
	} = options;

	const method = _method?.toUpperCase();

	const headers = new Headers(_headers);

	if (!headers.has("accept")) {
		if (responseType === "json") {
			headers.set("accept", "application/json");
		} else if (responseType === "text") {
			headers.set("accept", "text/plain");
		} else {
			headers.set("accept", "*/*");
		}
	}

	let body: BodyInit | null = null;

	if (_body !== undefined) {
		if (isJsonBody(_body)) {
			body = JSON.stringify(_body);

			if (!headers.has("content-type")) {
				headers.set("content-type", "application/json");
			}
		} else {
			body = _body;
		}
	}

	const timeoutSignal = timeout !== false ? AbortSignal.timeout(timeout) : null;
	const signal =
		_signal && timeoutSignal
			? AbortSignal.any([_signal, timeoutSignal])
			: (_signal ?? timeoutSignal);

	const request = new Request(String(url), { ...rest, body, headers, method, signal });

	try {
		const response = await fetch(request);

		if (!response.ok) {
			return Result.err(new HttpError({ request, response }));
		}

		if (method === "HEAD") {
			const data = null;
			return Result.ok({ data, headers: response.headers });
		}

		switch (responseType) {
			case "arrayBuffer": {
				try {
					const data = await response.arrayBuffer();
					return Result.ok({ data, headers: response.headers });
				} catch (error) {
					return Result.err(new DecodeError({ cause: error, request }));
				}
			}

			case "blob": {
				try {
					const data = await response.blob();
					return Result.ok({ data, headers: response.headers });
				} catch (error) {
					return Result.err(new DecodeError({ cause: error, request }));
				}
			}

			case "bytes": {
				try {
					const data = await response.bytes();
					return Result.ok({ data, headers: response.headers });
				} catch (error) {
					return Result.err(new DecodeError({ cause: error, request }));
				}
			}

			case "formData": {
				try {
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					const data = await response.formData();
					return Result.ok({ data, headers: response.headers });
				} catch (error) {
					return Result.err(new DecodeError({ cause: error, request }));
				}
			}

			case "json": {
				if (response.status === 204 || response.headers.get("content-length") === "0") {
					await response.body?.cancel();
					const data = null;
					return Result.ok({ data, headers: response.headers });
				}

				try {
					const data = await response.json();
					return Result.ok({ data, headers: response.headers });
				} catch (error) {
					return Result.err(new DecodeError({ cause: error, request }));
				}
			}

			case "response": {
				const data = response;
				return Result.ok({ data, headers: response.headers });
			}

			case "stream": {
				const data = response.body;
				return Result.ok({ data, headers: response.headers });
			}

			case "text": {
				try {
					const data = await response.text();
					return Result.ok({ data, headers: response.headers });
				} catch (error) {
					return Result.err(new DecodeError({ cause: error, request }));
				}
			}

			case "void": {
				await response.body?.cancel();
				const data = null;
				return Result.ok({ data, headers: response.headers });
			}
		}
	} catch (error) {
		if (Error.isError(error)) {
			if (error.name === "AbortError") {
				return Result.err(new AbortError({ cause: error, request }));
			}

			if (error.name === "TimeoutError") {
				return Result.err(new TimeoutError({ cause: error, request }));
			}

			if (isNetworkError(error)) {
				return Result.err(new NetworkError({ cause: error, request }));
			}
		}

		throw error;
	}
}

type JsonPrimitive = string | number | boolean | null | undefined;
type JsonValue = JsonPrimitive | Array<JsonValue> | { [key: string]: JsonValue };

function isJsonBody(body: unknown): body is JsonValue {
	if (body === null) {
		return true;
	}

	if (typeof body !== "object") {
		return false;
	}

	if (
		body instanceof ArrayBuffer ||
		body instanceof Blob ||
		body instanceof FormData ||
		body instanceof ReadableStream ||
		body instanceof URLSearchParams
	) {
		return false;
	}

	return true;
}
