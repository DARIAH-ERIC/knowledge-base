import type { AsyncOption, AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";

/** An entity relation option enriched with its raw type tokens (for same-type merge validation). */
export interface EntityOption extends AsyncOption {
	entityType?: string;
	unitType?: string | null;
	slug?: string;
}

/** Fetch a page of pickable entities from the shared relation-options endpoint. */
export async function fetchEntityOptionsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<EntityOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/relations/entities?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load entities.");
	}

	return (await response.json()) as { items: Array<EntityOption>; total: number };
}

/** Two entities are mergeable into one another only when they share the same (unit) type. */
export function isSameEntityType(a: EntityOption, b: EntityOption): boolean {
	return a.entityType === b.entityType && (a.unitType ?? null) === (b.unitType ?? null);
}
