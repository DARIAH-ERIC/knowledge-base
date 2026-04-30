import { createUrl, unreachable } from "@acdh-oeaw/lib";
import { isCoreService, isSoftware, type SearchItem } from "@dariah-eric/client-sshoc";
import type { ResourceDocument } from "@dariah-eric/search";

import { toPlainText } from "../markdown/to-plain-text";

export function createSshocItem(item: SearchItem, marketplaceBaseUrl: string): ResourceDocument {
	const keywords = [];

	for (const property of item.properties) {
		/** @see {@link https://marketplace-api.sshopencloud.eu/api/property-types/keyword} */
		/** @see {@link https://marketplace-api.sshopencloud.eu/api/vocabularies/sshoc-keyword/concepts/dariahResource} */
		if (
			property.type.code === "keyword" &&
			property.concept?.vocabulary.code === "sshoc-keyword" &&
			property.concept.code !== "dariahResource"
		) {
			keywords.push(property.concept.label);
		}
	}

	const links = [
		String(
			createUrl({
				baseUrl: marketplaceBaseUrl,
				pathname: `/${item.category}/${item.persistentId}`,
			}),
		),
		...(item.accessibleAt ?? []),
	];

	const source = "ssh-open-marketplace";
	const sourceId = item.persistentId;
	const id = [source, sourceId].join(":");

	/** Labels somtimes include leading/trailing whitespace. */
	const label = item.label.trim();

	/** Description supports markdown. */
	const description = toPlainText(item.description);

	const sourceActorIds = item.contributors.flatMap((contributor) => {
		return contributor.actor.id;
	});
	const actorIds = sourceActorIds.map((sourceActorId) => {
		return [source, sourceActorId].join(":");
	});

	const sourceUpdatedAt = new Date(item.lastInfoUpdate).getTime();

	switch (item.category) {
		case "tool-or-service": {
			if (isSoftware(item)) {
				return {
					id,
					source,
					source_id: sourceId,
					source_updated_at: sourceUpdatedAt,
					imported_at: Date.now(),
					type: "software",
					label,
					description,
					keywords,
					links,
					source_actor_ids: actorIds,
					upstream_sources: null,
					kind: null,
					authors: null,
					year: null,
					pid: null,
				};
			}

			return {
				id,
				source,
				source_id: sourceId,
				source_updated_at: sourceUpdatedAt,
				imported_at: Date.now(),
				type: "service",
				label,
				description,
				keywords,
				links,
				source_actor_ids: actorIds,
				upstream_sources: null,
				kind: isCoreService(item) ? "core" : "community",
				authors: null,
				year: null,
				pid: null,
			};
		}

		case "training-material": {
			return {
				id,
				source,
				source_id: sourceId,
				source_updated_at: sourceUpdatedAt,
				imported_at: Date.now(),
				type: "training-material",
				label,
				description,
				keywords,
				links,
				source_actor_ids: actorIds,
				upstream_sources: [],
				kind: null,
				authors: null,
				year: null,
				pid: null,
			};
		}

		case "workflow": {
			return {
				id,
				source,
				source_id: sourceId,
				source_updated_at: sourceUpdatedAt,
				imported_at: Date.now(),
				type: "workflow",
				label,
				description,
				keywords,
				links,
				source_actor_ids: actorIds,
				upstream_sources: null,
				kind: null,
				authors: null,
				year: null,
				pid: null,
			};
		}

		case "dataset":
		case "publication":
		case "step": {
			unreachable();
		}
	}
}
