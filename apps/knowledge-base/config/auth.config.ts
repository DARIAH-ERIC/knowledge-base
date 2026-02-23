// export const sessionRefreshIntervalMs = 1000 * 60 * 60 * 24 * 15; /** 15 days. */
// export const sessionMaxDurationMs = 1000 * 60 * 60 * 24 * 30; /** 30 days. */

// export const passwordResetSessionMaxDurationMs = 1000 * 60 * 10; /** 10 mins. */
// export const emailVerificationRequestMaxDurationMs = 1000 * 60 * 10; /** 10 mins. */

interface CookieConfig {
	name: string;
	options: {
		httpOnly: true;
		sameSite: "lax" | "strict";
		secure: boolean;
		path: string;
	};
	durationMs: number;
}

export const passwords = {
	length: {
		min: 8,
		max: 255,
	},
};

export const emailVerificationRequests: { cookie: CookieConfig } = {
	cookie: {
		name: "email_verification",
		options: {
			httpOnly: true,
			sameSite: "lax" as const,
			// eslint-disable-next-line no-restricted-syntax
			secure: process.env.NODE_ENV === "production",
			path: "/",
		},
		durationMs: 1000 * 60 * 10 /** 10 mins. */,
	},
};

export const passwordResetSessions: { cookie: CookieConfig } = {
	cookie: {
		name: "password_reset_session",
		options: {
			httpOnly: true,
			sameSite: "lax" as const,
			// eslint-disable-next-line no-restricted-syntax
			secure: process.env.NODE_ENV === "production",
			path: "/",
		},
		durationMs: 1000 * 60 * 10 /** 10 mins. */,
	},
};

export const sessions: { cookie: CookieConfig } = {
	cookie: {
		name: "session",
		options: {
			httpOnly: true,
			sameSite: "lax" as const,
			// eslint-disable-next-line no-restricted-syntax
			secure: process.env.NODE_ENV === "production",
			path: "/",
		},
		durationMs: 1000 * 60 * 60 * 24 * 30 /** 30 days. */,
	},
};

/** Two-factor app name. */
export const issuer = "DARIAH";
