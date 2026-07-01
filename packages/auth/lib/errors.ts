import { TaggedError } from "better-result";

export class InvalidUserIdError extends TaggedError("InvalidUserIdError")<{
	readonly cause?: unknown;
	readonly id: string;
	readonly message?: string;
}>() {}

export class InvalidTotpCredentialLabelError extends TaggedError(
	"InvalidTotpCredentialLabelError",
)<{
	readonly message?: string;
}>() {}

export class TotpCredentialLimitReachedError extends TaggedError(
	"TotpCredentialLimitReachedError",
)<{
	readonly limit: number;
	readonly message?: string;
}>() {}

export class TotpCredentialNotFoundError extends TaggedError("TotpCredentialNotFoundError")<{
	readonly id: string;
	readonly message?: string;
}>() {}

export class CannotRemoveFinalTotpCredentialError extends TaggedError(
	"CannotRemoveFinalTotpCredentialError",
)<{
	readonly message?: string;
}>() {}
