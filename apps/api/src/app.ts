import { serveStatic } from "@hono/node-server/serve-static";
import { timing } from "hono/timing";

import { createApp, createRouter } from "@/lib/factory";
import { createOpenApi } from "@/lib/openapi/index";
import { database } from "@/middlewares/db";
import { storage as storageMiddleware } from "@/middlewares/storage";
import { router as dariahProjects } from "@/routes/dariah-projects";
import { router as documentsPolicies } from "@/routes/documents-policies";
import { router as events } from "@/routes/events";
import { router as governanceBodies } from "@/routes/governance-bodies";
import { router as impactCaseStudies } from "@/routes/impact-case-studies";
import { router as membersAndPartners } from "@/routes/members-partners";
import { router as navigation } from "@/routes/navigation";
import { router as news } from "@/routes/news";
import { router as newsletters } from "@/routes/newsletters";
import { router as pages } from "@/routes/pages";
import { router as persons } from "@/routes/persons";
import { router as projects } from "@/routes/projects";
import { router as siteMetadata } from "@/routes/site-metadata";
import { router as socialMedia } from "@/routes/social-media";
import { router as spotlightArticles } from "@/routes/spotlight-articles";
import { router as statistics } from "@/routes/statistics";
import { router as workingGroups } from "@/routes/working-groups";

const app = createApp();

const openapi = createOpenApi(app);

const api = createRouter()
	.route("/dariah-projects", dariahProjects)
	.route("/documents-policies", documentsPolicies)
	.route("/navigation", navigation)
	.route("/events", events)
	.route("/governance-bodies", governanceBodies)
	.route("/impact-case-studies", impactCaseStudies)
	.route("/members-partners", membersAndPartners)
	.route("/news", news)
	.route("/newsletters", newsletters)
	.route("/pages", pages)
	.route("/persons", persons)
	.route("/projects", projects)
	.route("/site-metadata", siteMetadata)
	.route("/social-media", socialMedia)
	.route("/spotlight-articles", spotlightArticles)
	.route("/statistics", statistics)
	.route("/working-groups", workingGroups);

app.use(database()).use(storageMiddleware()).use(timing()).route("/api/v1", api);

app.route("/docs", openapi);

app.use("/favicon.ico", serveStatic({ root: "./public" }));

export { api, app, openapi };
