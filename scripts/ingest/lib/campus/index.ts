import type { DariahCampusCurriculum, DariahCampusResource } from "@dariah-eric/client-campus";
import type { CampusResourceDocument } from "@dariah-eric/search";

import { toPlainText } from "../markdown/to-plain-text";

export function createCampusResource(item: DariahCampusResource): CampusResourceDocument {
	const source = "dariah-campus" as const;
	const sourceId = item.id;
	const id = [source, sourceId].join(":");
	const authors = [...item.authors, ...item.editors].map((person) => person.name);
	const keywords = item.tags.map((tag) => tag.name);
	const year = item["publication-date"] != null ? new Date(item["publication-date"]).getFullYear() : null;
	const links = item.pid != null ? [item.pid] : [];

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: null,
		imported_at: Date.now(),
		type: "training-material",
		label: item.title,
		description: toPlainText(item.summary.content),
		links,
		keywords,
		kind: item.kind,
		source_actor_ids: null,
		upstream_sources: null,
		authors,
		year,
		pid: item.pid,
	};
}

export function createCampusCurriculum(item: DariahCampusCurriculum): CampusResourceDocument {
	const source = "dariah-campus" as const;
	const sourceId = item.id;
	const id = [source, sourceId].join(":");
	const authors = item.editors.map((person) => person.name);
	const keywords = item.tags.map((tag) => tag.name);
	const year = item["publication-date"] != null ? new Date(item["publication-date"]).getFullYear() : null;
	const links = item.pid != null ? [item.pid] : [];

	return {
		id,
		source,
		source_id: sourceId,
		source_updated_at: null,
		imported_at: Date.now(),
		type: "training-material",
		label: item.title,
		description: toPlainText(item.summary.content),
		links,
		keywords,
		kind: "curriculum",
		source_actor_ids: null,
		upstream_sources: null,
		authors,
		year,
		pid: item.pid,
	};
}
