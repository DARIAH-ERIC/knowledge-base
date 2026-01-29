import { TaggedError } from "better-result";

export class ForbiddenError extends TaggedError("ForbiddenError")<{
	cause?: Error;
}>() {}

export class HoneyPotError extends TaggedError("HoneyPotError")<{
	cause?: Error;
}>() {}

export class NotFoundError extends TaggedError("NotFoundError")<{
	cause?: Error;
}>() {}

export class RateLimitError extends TaggedError("RateLimitError")<{
	cause?: Error;
}>() {}

export class SmtpError extends TaggedError("SmtpError")<{
	cause?: Error;
}>() {}

export class UnauthorizedError extends TaggedError("UnauthorizedError")<{
	cause?: Error;
}>() {}

export class ValidationError extends TaggedError("ValidationError")<{
	cause?: Error;
}>() {}
