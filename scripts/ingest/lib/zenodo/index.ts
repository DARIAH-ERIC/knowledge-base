import { isNonEmptyArray, isNonEmptyString } from "@acdh-oeaw/lib";
import type { ZenodoRecord } from "@dariah-eric/client-zenodo";
import type { ResourceDocument } from "@dariah-eric/search";

/** @see {@link https://developers.zenodo.org/} */
/** @see {@link https://zenodo.org/communities/dariah} */
export function createZenodoItem(item: ZenodoRecord): ResourceDocument {
	const authors = item.metadata.creators
		.map((creator) => creator.name.trim())
		.filter((name) => isNonEmptyString(name));

	const keywords =
		[item.metadata.keywords, item.metadata.keyword].find((value) => isNonEmptyArray(value)) ?? [];
	const links = [
		item.links.html?.href ?? item.links.self?.href ?? `https://zenodo.org/records/${item.id}`,
	];
	const sourceId = item.conceptrecid ?? String(item.id);
	const id = ["zenodo", sourceId].join(":");
	const publicationDate = item.metadata.publication_date ?? item.metadata.published;
	const year = publicationDate != null ? new Date(publicationDate).getFullYear() : null;
	const sourceUpdatedAt =
		item.modified != null
			? new Date(item.modified).getTime()
			: item.created != null
				? new Date(item.created).getTime()
				: null;

	return {
		id,
		source: "zenodo",
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt,
		imported_at: Date.now(),
		type: "publication",
		label: item.metadata.title,
		description: item.metadata.description ?? "",
		links,
		keywords,
		kind: item.metadata.resource_type?.type ?? null,
		source_actor_ids: null,
		authors,
		year,
		pid: item.doi ?? null,
	};
}
