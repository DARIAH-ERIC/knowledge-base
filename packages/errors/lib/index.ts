import { TaggedError } from "better-result";

export class AbortError extends TaggedError("AbortError")<{
	cause?: unknown;
	request: Request;
}>() {}

export type AuthError = ForbiddenError | UnauthorizedError;

export class DecodeError extends TaggedError("DecodeError")<{
	cause?: unknown;
	request: Request;
}>() {}

export class DatabaseError extends TaggedError("DatabaseError")<{
	cause?: unknown;
	message: string;
}>() {}

export class ForbiddenError extends TaggedError("ForbiddenError")<{
	cause?: unknown;
	message: string;
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

export class NotFoundError extends TaggedError("NotFoundError")<{
	cause?: unknown;
	message: string;
}>() {}

export class ParseError extends TaggedError("ParseError")<{
	cause?: unknown;
	message: string;
}>() {}

export type RequestError = AbortError | DecodeError | HttpError | NetworkError | TimeoutError;

export class TimeoutError extends TaggedError("TimeoutError")<{
	cause?: unknown;
	request: Request;
}>() {}

export class ValidationError extends TaggedError("ValidationError")<{
	cause?: unknown;
	message: string;
}>() {}

export class UnauthorizedError extends TaggedError("UnauthorizedError")<{
	cause?: unknown;
	message: string;
}>() {}
