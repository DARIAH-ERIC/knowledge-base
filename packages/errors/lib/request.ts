import { TaggedError } from "better-result";

export class AbortError extends TaggedError("AbortError")<{
	cause?: unknown;
	request: Request;
}>() {}

export class DecodeError extends TaggedError("DecodeError")<{
	cause?: unknown;
	request: Request;
}>() {}

export class HttpError extends TaggedError("HttpError")<{
	cause?: unknown;
	request: Request;
	response: Response;
}>() {}

export class NetworkError extends TaggedError("NetworkError")<{
	cause?: unknown;
	request: Request;
}>() {}

export class TimeoutError extends TaggedError("TimeoutError")<{
	cause?: unknown;
	request: Request;
}>() {}
