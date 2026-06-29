import { log } from "@acdh-oeaw/lib";
import type { organisationalUnitTypesEnum } from "@dariah-eric/database/schema";
import { request } from "@dariah-eric/request";

import { env } from "@/config/env.config";

type OrganisationalUnitType = (typeof organisationalUnitTypesEnum)[number];

export type WebhookEntityType =
	| "dariah-projects"
	| "documents-policies"
	| "events"
	| "featured-entities"
	| "funding-calls"
	| "impact-case-studies"
	| "navigation"
	| "opportunities"
	| "news"
	| "pages"
	| "persons"
	| "site-metadata"
	| "spotlight-articles"
	// Organisational units (working groups, governance bodies, institutions, the ERIC, national
	// consortia, countries) are revalidated per unit type, so the website can map e.g. a `country`
	// change to its members-partners pages and an `institution` change to the institution pages.
	| `organisational-units:${OrganisationalUnitType}`;

/** Builds the per-unit-type revalidation entity type for an organisational unit. */
export function organisationalUnitWebhookType(unitType: OrganisationalUnitType): WebhookEntityType {
	return `organisational-units:${unitType}`;
}

export async function dispatchWebhook(payload: {
	type: WebhookEntityType | Array<WebhookEntityType>;
}): Promise<void> {
	if (env.REVALIDATION_WEBHOOK_URL == null || env.REVALIDATION_WEBHOOK_SECRET == null) {
		return;
	}

	const types = [...new Set(Array.isArray(payload.type) ? payload.type : [payload.type])];
	if (types.length === 0) {
		return;
	}

	log.info("[revalidation webhook] dispatching request", {
		types,
		url: env.REVALIDATION_WEBHOOK_URL,
	});

	const result = await request(env.REVALIDATION_WEBHOOK_URL, {
		method: "post",
		headers: { Authorization: `Bearer ${env.REVALIDATION_WEBHOOK_SECRET}` },
		body: { types },
		retry: { backoff: "exponential", delayMs: 200, times: 2 },
		responseType: "void",
	});

	if (result.isErr()) {
		log.error("[revalidation webhook] dispatch failed", result.error);
	}
}
