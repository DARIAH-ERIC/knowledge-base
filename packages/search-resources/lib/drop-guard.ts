import type { DocumentBaseline, ResourceDocument } from "@dariah-eric/search/admin";

/**
 * A source may only shrink to this share of its baseline. A sharper drop more likely means an
 * upstream api quietly returned less than it should, and swapping would make those resources
 * unfindable until the next run.
 */
const minRetainedDocumentRatio = 0.5;

export interface SourceDrop {
	baseline: number;
	rebuilt: number;
	source: string;
}

export function countDocumentsBySource(documents: Array<ResourceDocument>): DocumentBaseline {
	const counts: DocumentBaseline = {};

	/** Keyed by id, since documents with the same id collapse into one when imported. */
	for (const source of new Map(documents.map((item) => [item.id, item.source])).values()) {
		counts[source] = (counts[source] ?? 0) + 1;
	}

	return counts;
}

export function findSourceDrops(
	baseline: DocumentBaseline,
	rebuilt: DocumentBaseline,
): Array<SourceDrop> {
	return Object.entries(baseline).flatMap(([source, count]) => {
		const rebuiltCount = rebuilt[source] ?? 0;

		return rebuiltCount < count * minRetainedDocumentRatio
			? [{ baseline: count, rebuilt: rebuiltCount, source }]
			: [];
	});
}

/** Only ever rises: otherwise repeated drops just under the limit would each pass unnoticed. */
export function raiseBaseline(
	baseline: DocumentBaseline,
	rebuilt: DocumentBaseline,
): DocumentBaseline {
	const raised = { ...baseline };

	for (const [source, count] of Object.entries(rebuilt)) {
		raised[source] = Math.max(raised[source] ?? 0, count);
	}

	return raised;
}
