import { rateLimiter } from "hono-rate-limiter";
import { HTTPException } from "hono/http-exception";

import { createRouter } from "@/lib/factory";
import { describeRoute } from "@/lib/openapi/describe-route";
import { resolver } from "@/lib/openapi/resolver";
import {
	BAD_REQUEST,
	INTERNAL_SERVER_ERROR,
	SERVICE_UNAVAILABLE,
	UNAUTHORIZED,
} from "@/lib/openapi/responses";
import { validate, validator } from "@/lib/openapi/validator";
import { SendContactMessage } from "@/routes/contact/schemas";
import { sendContactMessage } from "@/routes/contact/service";
import { env } from "~/config/env.config";
import { contactConfig } from "~/config/rate-limiter.config";

export const router = createRouter()
	/** POST /api/contact */
	.post(
		"/",
		describeRoute({
			tags: ["contact"],
			summary: "Send contact message",
			description:
				"Send a message from the website's contact form via email. Requires the api access token; the website forwards the visitor's ip address in the `x-client-ip` header, which the rate limit is counted against.",
			operationId: "sendContactMessage",
			"x-cache-tags": [],
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: SendContactMessage.RequestSchema,
					},
				},
			},
			responses: {
				200: {
					description: "Message sent",
					content: {
						"application/json": {
							schema: resolver(SendContactMessage.ResponseSchema),
						},
					},
				},
				...BAD_REQUEST,
				...UNAUTHORIZED,
				...INTERNAL_SERVER_ERROR,
				...SERVICE_UNAVAILABLE,
			},
			security: [{ apiAccessToken: [] }],
		}),
		async (c, next) => {
			if (env.API_ACCESS_TOKEN == null) {
				throw new Error("Missing API_ACCESS_TOKEN");
			}

			if (c.req.header("x-api-access-token") !== env.API_ACCESS_TOKEN) {
				throw new HTTPException(401, { message: "Unauthorized" });
			}

			await next();
		},
		rateLimiter(contactConfig),
		validator("json", SendContactMessage.RequestSchema),
		async (c) => {
			const { email, message, name, subject, topic } = c.req.valid("json");
			const logger = c.get("logger");

			const data = await sendContactMessage({ email, logger, message, name, subject, topic });

			const payload = await validate(SendContactMessage.ResponseSchema, data, 500);

			return c.json(payload, 200);
		},
	);
