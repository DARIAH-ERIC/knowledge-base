import type { JSONContent } from "@tiptap/core";

/**
 * Where a rich-text link points. A plain link stores its `href` and needs nothing else; a link that
 * points at something we own stores a _reference_ instead, and read paths resolve it (see
 * `annotateLinkTargets`).
 *
 * The indirection is the point. An `href` typed into the editor is a copy of a url that lives
 * somewhere else: an asset's download url embeds infrastructure the editor should not know about,
 * and an entity's url is derived from a slug that can be renamed out from under it. A reference
 * survives both.
 *
 * `asset` is the only kind so far. `entity` is the planned second one, which is why the target is a
 * discriminated `targetKind` from the start rather than an `assetKey` attribute that would have to
 * be widened later — the mark, the resolution pass and the pickers all key off the discriminant.
 */
export const linkTargetKindsEnum = ["asset"] as const;

export type LinkTargetKind = (typeof linkTargetKindsEnum)[number];

/** Tiptap's built-in link mark, which carries the target attributes. */
export const linkMarkType = "link";

export function isLinkTargetKind(value: unknown): value is LinkTargetKind {
	return (linkTargetKindsEnum as ReadonlyArray<unknown>).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The asset key an `asset`-targeted link mark references, or `null` for anything else — an ordinary
 * `href` link, a non-link mark, a node.
 *
 * Marks and nodes share the `{ type, attrs }` shape, so this doubles as the predicate for both and
 * the generic walkers below need no special case for `marks` arrays.
 */
function getLinkTargetAssetKey(value: unknown): string | null {
	if (!isRecord(value) || value.type !== linkMarkType) {
		return null;
	}

	const attrs = value.attrs;
	if (!isRecord(attrs) || attrs.targetKind !== "asset") {
		return null;
	}

	return typeof attrs.assetKey === "string" && attrs.assetKey !== "" ? attrs.assetKey : null;
}

/**
 * Collects the distinct asset keys referenced by `asset`-targeted links anywhere in a JSON
 * structure. Accepts arbitrary JSON (one richtext document, an array of content blocks, ...) so
 * callers can pass whatever shape they hold and resolve each key once.
 *
 * Mirrors `collectPlaceholderValueKinds`, including its tolerance for unknown shapes: anything that
 * is not a recognisable target is walked through, never rejected.
 */
export function collectLinkTargetAssetKeys(value: unknown): Set<string> {
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

		const key = getLinkTargetAssetKey(node);
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

/** A resolved `asset` target: everything a renderer needs to present and name the download. */
export interface ResolvedAssetLinkTarget {
	url: string;
	filename: string;
	mimeType: string;
	/** File size in bytes, or `null` for assets uploaded before size tracking was added. */
	size: number | null;
}

export type ResolvedAssetLinkTargets = ReadonlyMap<string, ResolvedAssetLinkTarget>;

/**
 * Attaches the resolved download to every `asset`-targeted link mark: an `asset` attribute holding
 * the full metadata, plus `href` set to the download url so a consumer that understands nothing
 * about targets still renders a working link.
 *
 * The url is only ever written onto the outgoing copy, never stored — the same contract as
 * `annotatePlaceholderValues`. Storing it would reintroduce exactly the staleness the reference
 * exists to avoid.
 *
 * A key with no entry (asset deleted since authoring) is left untouched, so it keeps whatever
 * `href` it had — for a stored reference that is none, and the renderer sees a link mark with no
 * href and can degrade to plain text rather than emitting a dead link.
 *
 * Returns the input reference unchanged when nothing matched.
 */
export function annotateLinkTargets<T>(value: T, assets: ResolvedAssetLinkTargets): T {
	function annotate(node: unknown): unknown {
		if (Array.isArray(node)) {
			let changed = false;
			const result: Array<unknown> = [];
			for (const item of node) {
				const next = annotate(item);
				if (next !== item) {
					changed = true;
				}
				result.push(next);
			}
			return changed ? result : node;
		}

		if (!isRecord(node)) {
			return node;
		}

		const key = getLinkTargetAssetKey(node);
		if (key != null) {
			const resolved = assets.get(key);
			if (resolved == null) {
				return node;
			}

			return {
				...node,
				attrs: {
					...(node.attrs as Record<string, unknown>),
					href: resolved.url,
					asset: resolved,
				},
			} satisfies JSONContent;
		}

		let changed = false;
		const result: Record<string, unknown> = {};
		for (const [entry, item] of Object.entries(node)) {
			const next = annotate(item);
			if (next !== item) {
				changed = true;
			}
			result[entry] = next;
		}
		return changed ? result : node;
	}

	return annotate(value) as T;
}
