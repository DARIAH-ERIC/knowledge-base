import type { AsyncOption, AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";

import type { MaintenanceEntityState } from "@/lib/data/maintenance-entity-options";

/** An entity relation option enriched with its raw type tokens (for same-type merge validation). */
export interface EntityOption extends AsyncOption {
	entityType?: string;
	unitType?: string | null;
	slug?: string;
	/** Only set by {@link fetchMaintenanceEntityOptionsPage}, which also returns drafts. */
	state?: MaintenanceEntityState;
}

async function fetchOptionsPage(
	endpoint: string,
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<EntityOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load entities.");
	}

	return (await response.json()) as { items: Array<EntityOption>; total: number };
}

/**
 * Fetch a page of pickable entities from the shared relation-options endpoint — published only,
 * since that endpoint answers "what may this relate to".
 */
export async function fetchEntityOptionsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<EntityOption>; total: number }> {
	return fetchOptionsPage("/api/relations/entities", params);
}

/**
 * Fetch a page of pickable entities including never-published drafts. For maintenance tools that
 * act on a document itself (the slug editor) rather than pick a relation target.
 */
export async function fetchMaintenanceEntityOptionsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<EntityOption>; total: number }> {
	return fetchOptionsPage("/api/maintenance/entities", params);
}

/** Two entities are mergeable into one another only when they share the same (unit) type. */
export function isSameEntityType(a: EntityOption, b: EntityOption): boolean {
	return a.entityType === b.entityType && (a.unitType ?? null) === (b.unitType ?? null);
}
