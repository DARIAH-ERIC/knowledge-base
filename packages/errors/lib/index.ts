import { TaggedError } from "better-result";

export * from "./auth";
export * from "./request";

export class DatabaseError extends TaggedError("DatabaseError")<{
	cause?: unknown;
	message: string;
}>() {}

export class NotFoundError extends TaggedError("NotFoundError")<{
	cause?: unknown;
	message: string;
}>() {}

export class ParseError extends TaggedError("ParseError")<{
	cause?: unknown;
	message: string;
}>() {}

export class RateLimitError extends TaggedError("RateLimitError")<{
	cause?: unknown;
	message: string;
}>() {}

export class ValidationError extends TaggedError("ValidationError")<{
	cause?: unknown;
	message: string;
}>() {}
