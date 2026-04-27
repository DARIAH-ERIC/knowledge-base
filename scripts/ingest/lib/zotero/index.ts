import { isNonEmptyString } from "@acdh-oeaw/lib";
import type { ZoteroCslItem } from "@dariah-eric/client-zotero";
import type { ResourceDocument } from "@dariah-eric/search";

export function createZoteroItem(item: ZoteroCslItem): ResourceDocument {
	const authors = [];

	for (const creator of item.author ?? []) {
		const name = [creator.given, creator.family].filter((name) => isNonEmptyString(name)).join(" ");

		if (isNonEmptyString(name)) {
			authors.push(name);
		}
	}

	const yearRaw = item.issued?.["date-parts"]?.[0]?.[0];
	const year = yearRaw != null ? Number(yearRaw) : null;

	const source = "zotero";
	const sourceId = item.id;
	const id = [source, sourceId].join(":");

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: null,
		imported_at: Date.now(),
		type: "publication",
		label: item.title ?? "",
		description: item.abstract ?? "",
		links: item.URL != null ? [item.URL] : [],
		keywords:
			item.keyword
				?.split(",")
				.map((keyword) => keyword.trim())
				.filter((keyword) => isNonEmptyString(keyword)) ?? [],
		kind: item.type,
		source_actor_ids: null,
		upstream_sources: null,
		authors,
		year,
		pid: item.DOI ?? null,
	};
}
