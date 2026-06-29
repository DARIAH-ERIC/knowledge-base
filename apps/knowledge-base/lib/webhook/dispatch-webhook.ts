import { log } from "@acdh-oeaw/lib";
import type { organisationalUnitTypesEnum } from "@dariah-eric/database/schema";
import { request } from "@dariah-eric/request";

import { env } from "@/config/env.config";

type OrganisationalUnitType = (typeof organisationalUnitTypesEnum)[number];

/**
 * A KB-owned change event. These are domain terms (entity types and organisational-unit subtypes),
 * never consumer cache-tag names. Each consumer (e.g. the DARIAH website) maps these events to its
 * own behavior such as `revalidateTag`. Names mirror the database `entityTypesEnum` tokens, plus a
 * few KB concepts that are not entity types (`navigation`, `site_metadata`, `featured_entities`).
 */
export type KnowledgeBaseChangeEvent =
	| "projects"
	| "documents_policies"
	| "events"
	| "featured_entities"
	| "funding_calls"
	| "impact_case_studies"
	| "navigation"
	| "opportunities"
	| "news"
	| "pages"
	| "persons"
	| "site_metadata"
	| "spotlight_articles"
	// Organisational units (working groups, governance bodies, institutions, the ERIC, national
	// consortia, countries) emit a per-subtype event, so the consumer can map e.g. a `country`
	// change to its members-partners pages and an `institution` change to the institution pages.
	| `organisational_units:${OrganisationalUnitType}`;

/** Builds the per-subtype change event for an organisational unit. */
export function organisationalUnitChangeEvent(
	unitType: OrganisationalUnitType,
): KnowledgeBaseChangeEvent {
	return `organisational_units:${unitType}`;
}

export async function dispatchWebhook(payload: {
	events: Array<KnowledgeBaseChangeEvent>;
}): Promise<void> {
	if (env.REVALIDATION_WEBHOOK_URL == null || env.REVALIDATION_WEBHOOK_SECRET == null) {
		return;
	}

	const events = [...new Set(payload.events)];
	if (events.length === 0) {
		return;
	}

	log.info("[change-event webhook] dispatching request", {
		events,
		url: env.REVALIDATION_WEBHOOK_URL,
	});

	const result = await request(env.REVALIDATION_WEBHOOK_URL, {
		method: "post",
		headers: { Authorization: `Bearer ${env.REVALIDATION_WEBHOOK_SECRET}` },
		body: { events },
		retry: { backoff: "exponential", delayMs: 200, times: 2 },
		responseType: "void",
	});

	if (result.isErr()) {
		log.error("[change-event webhook] dispatch failed", result.error);
	}
}
