import { STATUS_CODES } from "node:http";

import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";

import { type Logger, logger } from "@/middlewares/logger";
import { config } from "~/config/cors.config";

interface Env {
	Variables: {
		logger: Logger;
	};
}

const factory = createFactory<Env>({ defaultAppOptions: { strict: false } });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createApp() {
	const app = factory
		.createApp()
		.use(cors(config))
		.use(requestId())
		.use(logger())

		.get("/health", (c) => {
			const status = 200;
			return c.json({ message: STATUS_CODES[status] }, status);
		})

		.use("/favicon.ico", serveStatic({ root: "./public" }))

		.notFound((c) => {
			const status = 404;
			return c.json({ message: STATUS_CODES[status] }, status);
		})

		.onError((error, c) => {
			const { logger } = c.var;

			logger.error(error);

			if (error instanceof HTTPException) {
				return c.json({ message: error.message }, error.status);
			}

			const status = 500;
			return c.json({ message: STATUS_CODES[status] }, status);
		});

	return app;
}

export const { createApp: createRouter, createHandlers, createMiddleware } = factory;
