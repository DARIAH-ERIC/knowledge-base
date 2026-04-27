import { isNonEmptyString } from "@acdh-oeaw/lib";
import type { ZoteroJsonItem } from "@dariah-eric/client-zotero";
import type { ResourceDocument } from "@dariah-eric/search";

interface ZoteroJsonItemData {
	title?: string;
	abstractNote?: string;
	creators?: Array<{
		firstName?: string;
		lastName?: string;
		creatorType?: string;
	}>;
	date?: string;
	tags?: Array<{ tag: string }>;
	url?: string;
	DOI?: string;
	itemType?: string;
	dateModified?: string;
	[key: string]: unknown;
}

export function createZoteroItem(item: ZoteroJsonItem<ZoteroJsonItemData>): ResourceDocument {
	const data = item.data;
	const authors = [];

	for (const creator of data.creators ?? []) {
		const name = [creator.firstName, creator.lastName]
			.filter((name) => {
				return isNonEmptyString(name);
			})
			.join(" ");

		if (isNonEmptyString(name)) {
			authors.push(name);
		}
	}

	const yearRaw = data.date != null ? /\d{4}/.exec(data.date)?.[0] : null;
	const year = yearRaw != null ? Number(yearRaw) : null;

	const source = "zotero";
	const sourceId = item.key;
	const id = [source, sourceId].join(":");
	const sourceUpdatedAt = data.dateModified != null ? new Date(data.dateModified).getTime() : null;

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt,
		imported_at: Date.now(),
		type: "publication",
		label: data.title ?? "",
		description: data.abstractNote ?? "",
		links: data.url != null ? [data.url] : [],
		keywords:
			data.tags
				?.map((tag) => {
					return tag.tag;
				})
				.filter((keyword) => {
					return isNonEmptyString(keyword);
				}) ?? [],
		kind: data.itemType ?? null,
		source_actor_ids: null,
		upstream_sources: null,
		authors,
		year,
		pid: data.DOI ?? null,
	};
}
