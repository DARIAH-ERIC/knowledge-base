/**
 * Images inside a list item or a plain blockquote (see `ListItemWithImages` in `@dariah-eric/ui`),
 * as the save path, read paths and maintenance see them.
 *
 * Everywhere else an image is an `image` content block with a foreign key to its asset. A list item
 * cannot be split out into a block of its own without breaking the list, so an image there stays an
 * `assetImage` node inside the `rich_text` (or `media_text`) json, keeping only its asset's key,
 * its caption and its caption mode. The key is covered by a foreign key all the same: a database
 * trigger derives `content_block_asset_references` from the json on every write. Read paths resolve
 * the key — the api to the usual image shape, the dashboard to a signed url it can display — so
 * this module only finds the nodes and rewrites them.
 *
 * Every walker accepts arbitrary JSON (one document, an array of content blocks, a whole response)
 * and copies only what it changes, so callers can hand over whatever shape they hold.
 */

export const nestedImageNodeType = "assetImage";

/** The nodes an image may sit in directly, other than the places it becomes an image block. */
export const nestedImageParentTypes: ReadonlySet<string> = new Set(["blockquote", "listItem"]);

/** The editor's media nodes, plus the stock `image` node it no longer has. */
const mediaNodeTypes: ReadonlySet<string> = new Set([
	"assetImage",
	"embedBlock",
	"galleryBlock",
	"image",
	"mediaTextBlock",
]);

/** The attributes stored for a nested image; everything else is resolved from its asset on read. */
const storedAttributes = ["imageKey", "caption", "captionMode"] as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNestedImageNode(node: JsonRecord): node is JsonRecord & { attrs: JsonRecord } {
	return node.type === nestedImageNodeType && isRecord(node.attrs);
}

function getImageKey(node: JsonRecord): string | null {
	const key = isNestedImageNode(node) ? node.attrs.imageKey : null;
	return typeof key === "string" && key !== "" ? key : null;
}

/** The asset key of every image node anywhere in `value`. */
export function collectNestedImageKeys(value: unknown): Set<string> {
	const keys = new Set<string>();

	function visit(node: unknown) {
		if (Array.isArray(node)) {
			for (const item of node) {
				visit(item);
			}
			return;
		}
		if (!isRecord(node)) {
			return;
		}

		const key = getImageKey(node);
		if (key != null) {
			keys.add(key);
		}

		for (const item of Object.values(node)) {
			visit(item);
		}
	}

	visit(value);

	return keys;
}

/**
 * Rewrites the attributes of every image node anywhere in `value` through `transform`. The rest of
 * the structure is copied only along the paths to a changed image, so a document without one is
 * passed on unchanged.
 */
export function mapNestedImages<T>(value: T, transform: (attrs: JsonRecord) => JsonRecord): T {
	function visit(node: unknown): unknown {
		if (Array.isArray(node)) {
			const items = node.map((item) => visit(item));
			return items.some((item, index) => item !== node[index]) ? items : node;
		}
		if (!isRecord(node)) {
			return node;
		}

		if (isNestedImageNode(node)) {
			const attrs = transform(node.attrs);
			return JSON.stringify(attrs) === JSON.stringify(node.attrs) ? node : { ...node, attrs };
		}

		const entries = Object.entries(node).map(([key, item]) => [key, visit(item)] as const);
		return entries.some(([key, item]) => item !== node[key]) ? Object.fromEntries(entries) : node;
	}

	return visit(value) as T;
}

/**
 * Keeps only what is stored for a nested image: its key, caption and caption mode. The url, alt
 * text and asset caption the dashboard puts on for display come from the asset, and a layout means
 * nothing inside a list item; all of them are resolved again on the next read.
 */
export function stripNestedImageDisplayAttrs<T>(value: T): T {
	return mapNestedImages(value, (attrs) => {
		const stored: JsonRecord = {};
		for (const name of storedAttributes) {
			if (attrs[name] !== undefined) {
				stored[name] = attrs[name];
			}
		}
		return stored;
	});
}

export interface DisallowedMediaNode {
	type: string;
	/** The node it sits in directly; `null` at the top of the document. */
	parentType: string | null;
}

/**
 * The media nodes in a stored `rich_text` or `media_text` body that may not be there. The editor's
 * splitter turns media at the top of a document, or of a callout or accordion panel, into typed
 * blocks before saving, so the only media a body may still hold is an image with an asset key,
 * directly inside a list item or a plain blockquote. Anything else did not come from the editor as
 * it is.
 */
export function findDisallowedMedia(content: unknown): Array<DisallowedMediaNode> {
	const found: Array<DisallowedMediaNode> = [];

	function visit(node: unknown, parentType: string | null) {
		if (!isRecord(node)) {
			return;
		}

		const type = typeof node.type === "string" ? node.type : null;

		if (type != null && mediaNodeTypes.has(type)) {
			const isAllowed =
				type === nestedImageNodeType &&
				parentType != null &&
				nestedImageParentTypes.has(parentType) &&
				getImageKey(node) != null;
			if (!isAllowed) {
				found.push({ type, parentType });
			}
		}

		if (Array.isArray(node.content)) {
			// The document node is the body itself, not a container its children sit in.
			const childParent = type === "doc" ? null : type;
			for (const child of node.content) {
				visit(child, childParent);
			}
		}
	}

	visit(content, null);

	return found;
}
