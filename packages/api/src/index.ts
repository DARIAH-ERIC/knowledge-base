import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { eventsRoute } from "./routes/events";
import { newsRoute } from "./routes/news";
import { pagesRoute } from "./routes/pages";
import { impactCaseStudiesRoute } from "./routes/impact-case-studies";
import { spotlightArticlesRoute } from "./routes/spotlight-articles";
import { env } from "../config/env.config";

const app = new Hono();

app.get(
	"/docs",
	openAPIRouteHandler(app, {
		documentation: {
			info: {
				title: "Dariah Knowledge Base API",
				version: "1.0.0",
				description: "Dariah Knowledge Base API",
			},
			servers: [{ url: `http://${env.API_HOST}:${env.API_PORT}`, description: "Local Server" }],
		},
	}),
);

app.get("/", swaggerUI({ url: "/docs" }));

app.route("/api/events", eventsRoute);
app.route("/api/impact-case-studies", impactCaseStudiesRoute);
app.route("/api/news", newsRoute);
app.route("/api/pages", pagesRoute);
app.route("/api/spotlight-articles", spotlightArticlesRoute);

export default app;
