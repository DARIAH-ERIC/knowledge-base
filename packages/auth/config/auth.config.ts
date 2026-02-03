import type { Options } from "@node-rs/argon2";

export const argonConfig: Options = {
	memoryCost: 19_456,
	outputLen: 32,
	parallelism: 1,
	timeCost: 2,
};

export const passwordMinLength = 8;
export const passwordMaxLength = 255;

// export const usernameMinLength = 4;
// export const usernameMaxLength = 31;

// export const sessionRefreshIntervalMs = 1000 * 60 * 60 * 24 * 15; /** 15 days. */
// export const sessionMaxDurationMs = 1000 * 60 * 60 * 24 * 30; /** 30 days. */

// export const passwordResetSessionMaxDurationMs = 1000 * 60 * 10; /** 10 mins. */
// export const emailVerificationRequestMaxDurationMs = 1000 * 60 * 10; /** 10 mins. */

// export const sessionCookieName = "session";
// export const passwordResetCookieName = "password_reset_session";
// export const emailVerificationRequestCookieName = "email_verification";

// /** 2fa app name. */
// export const issuer = "DARIAH Knowledge Base";
