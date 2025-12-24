import { swaggerUI } from "@hono/swagger-ui";
import { openAPIRouteHandler } from "hono-openapi";

import { type createApp, createRouter } from "@/lib/factory";
import { env } from "~/config/env.config";
import { config } from "~/config/openapi.config";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createOpenApi(app: ReturnType<typeof createApp>) {
	return createRouter()
		.get(
			"/openapi.json",
			openAPIRouteHandler(app, {
				documentation: {
					info: config,
					servers: [{ url: env.APP_BASE_URL, description: config.description }],
				},
			}),
		)
		.get("/docs", swaggerUI({ url: "/openapi.json", title: config.title }));
}
