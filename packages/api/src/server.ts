import { serve } from "@hono/node-server";
import app from "./index";
import { env } from "../config/env.config";

serve({
	fetch: app.fetch,
	port: env.API_PORT,
});
