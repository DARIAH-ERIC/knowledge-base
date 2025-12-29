import type { cors } from "hono/cors";

import { env } from "~/config/env.config";

type CORSOptions = Parameters<typeof cors>[0];

export const config: CORSOptions = {
	allowMethods: ["GET", "HEAD"],
	origin:
		env.ALLOWED_ORIGINS != null ? [env.APP_BASE_URL, ...env.ALLOWED_ORIGINS] : env.APP_BASE_URL,
};
