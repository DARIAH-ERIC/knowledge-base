import type { ConfigProps as RateLimiterConfig } from "hono-rate-limiter";

export const config: RateLimiterConfig = {
	windowMs: 1000 * 60 * 5,
	limit: 100,
	keyGenerator(c) {
		return c.req.header("x-forwarded-for") ?? "";
	},
};
