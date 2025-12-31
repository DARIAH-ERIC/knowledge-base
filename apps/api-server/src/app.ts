import { STATUS_CODES } from "node:http";

import { serveStatic } from "@hono/node-server/serve-static";

import { createApp, createRouter } from "@/lib/factory";
import { createOpenApi } from "@/lib/openapi/index";
import { database } from "@/middlewares/db";
import { router as events } from "@/routes/events";
import { router as impactCaseStudies } from "@/routes/impact-case-studies";
import { router as news } from "@/routes/news";
import { router as pages } from "@/routes/pages";
import { router as spotlightArticles } from "@/routes/spotlight-articles";

const app = createApp();

const openapi = createOpenApi(app);

const api = createRouter()
	.route("/events", events)
	.route("/impact-case-studies", impactCaseStudies)
	.route("/news", news)
	.route("/pages", pages)
	.route("/spotlight-articles", spotlightArticles);

app.get("/health", (c) => {
	const status = 200;
	return c.json({ message: STATUS_CODES[status] }, status);
});

app.use(database()).route("/api/v1", api);

app.route("/docs", openapi);

app.use("/favicon.ico", serveStatic({ root: "./public" }));

export { api, app, openapi };
