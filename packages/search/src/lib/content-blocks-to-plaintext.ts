export interface ContentBlockLike {
	type: string;
	content?: unknown;
	title?: unknown;
	eyebrow?: unknown;
	caption?: unknown;
	url?: unknown;
	items?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pushText(parts: Array<string>, value: unknown): void {
	if (typeof value !== "string") return;

	const normalized = value.replace(/\s+/g, " ").trim();

	if (normalized.length > 0) {
		parts.push(normalized);
	}
}

function extractText(value: unknown): Array<string> {
	const parts: Array<string> = [];

	if (typeof value === "string") {
		pushText(parts, value);
		return parts;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			parts.push(...extractText(item));
		}

		return parts;
	}

	if (!isRecord(value)) {
		return parts;
	}

	const type = value.type;

	if (type === "text") {
		pushText(parts, value.text);
		return parts;
	}

	if (type === "hardBreak") {
		parts.push("\n");
		return parts;
	}

	pushText(parts, value.text);
	pushText(parts, value.title);
	pushText(parts, value.caption);
	pushText(parts, value.eyebrow);

	if ("content" in value) {
		parts.push(...extractText(value.content));
	}

	if ("items" in value && Array.isArray(value.items)) {
		for (const item of value.items) {
			if (!isRecord(item)) continue;

			pushText(parts, item.title);
			if ("content" in item) {
				parts.push(...extractText(item.content));
			}
		}
	}

	return parts;
}

function toPlaintext(value: unknown): string {
	return extractText(value)
		.join(" ")
		.replace(/\s+\n/g, "\n")
		.replace(/\n\s+/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Convert website content blocks into searchable plaintext.
 *
 * The extractor keeps the index decoupled from rendering details:
 * - rich text is flattened recursively from the serialized editor JSON
 * - captions, titles, and accordion headings are retained
 * - technical fields like image keys are intentionally ignored
 */
export function contentBlocksToPlaintext(blocks: Array<ContentBlockLike>): string {
	const parts: Array<string> = [];

	for (const block of blocks) {
		switch (block.type) {
			case "rich_text": {
				parts.push(toPlaintext(block.content));
				break;
			}

			case "image": {
				pushText(parts, block.caption);
				break;
			}

			case "embed": {
				pushText(parts, block.title);
				pushText(parts, block.caption);
				break;
			}

			case "data": {
				// Data blocks are intentionally not expanded here. If they become searchable,
				// the mapping layer should add explicit summaries instead of dumping raw JSON.
				break;
			}

			case "hero": {
				pushText(parts, block.eyebrow);
				pushText(parts, block.title);
				pushText(parts, block.caption);
				parts.push(toPlaintext(block.content));
				break;
			}

			case "accordion": {
				parts.push(toPlaintext(block.items));
				break;
			}

			default: {
				parts.push(toPlaintext(block.content));
				break;
			}
		}
	}

	return parts
		.join("\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
