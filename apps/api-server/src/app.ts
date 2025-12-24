import { createApp, createRouter } from "@/lib/factory";
import { createOpenApi } from "@/lib/openapi/index";
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

app.route("/", openapi).route("/api", api);

export { api, app, openapi };
