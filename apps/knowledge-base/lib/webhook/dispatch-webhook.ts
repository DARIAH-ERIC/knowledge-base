import { log } from "@acdh-oeaw/lib";
import { request } from "@dariah-eric/request";

import { env } from "@/config/env.config";

export type WebhookEntityType =
	| "documents-policies"
	| "events"
	| "funding-calls"
	| "impact-case-studies"
	| "navigation"
	| "opportunities"
	| "news"
	| "pages"
	| "site-metadata"
	| "spotlight-articles";

export async function dispatchWebhook(payload: { type: WebhookEntityType }): Promise<void> {
	if (env.REVALIDATION_WEBHOOK_URL == null || env.REVALIDATION_WEBHOOK_SECRET == null) {
		return;
	}

	const result = await request(env.REVALIDATION_WEBHOOK_URL, {
		method: "post",
		headers: { Authorization: `Bearer ${env.REVALIDATION_WEBHOOK_SECRET}` },
		body: payload,
		retry: { backoff: "exponential", delayMs: 200, times: 2 },
		responseType: "void",
	});

	if (result.isErr()) {
		log.error("[revalidation webhook] dispatch failed", result.error);
	}
}
