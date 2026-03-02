import { TaggedError } from "better-result";

export class EmailInUseError extends TaggedError("EmailInUseError")<{
	cause?: unknown;
	message: string;
}>() {}

export class ForbiddenError extends TaggedError("ForbiddenError")<{
	cause?: unknown;
	message: string;
}>() {}

export class InvalidUserIdError extends TaggedError("InvalidUserIdError")<{
	cause?: unknown;
	message: string;
}>() {}

export class InvalidVerificationCodeError extends TaggedError("InvalidVerificationCodeError")<{
	cause?: unknown;
	message: string;
}>() {}

export class UnauthorizedError extends TaggedError("UnauthorizedError")<{
	cause?: unknown;
	message: string;
}>() {}
