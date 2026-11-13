import { Extension } from "@tiptap/core";
import {
	Fragment,
	type NodeType,
	type Node as ProseMirrorNode,
	type ResolvedPos,
	Slice,
} from "@tiptap/pm/model";
import {
	type EditorState,
	NodeSelection,
	Plugin,
	PluginKey,
	type Transaction,
} from "@tiptap/pm/state";

/**
 * Where media nodes may go, beyond what the schema says.
 *
 * Media nodes (`assetImage`, `galleryBlock`, `mediaTextBlock`, `embedBlock`) are in their own
 * `media` group, which only the document and the bodies of callouts and accordion panels accept
 * (see `DocumentWithContainers` in `rich-text-editor`). ProseMirror still fits a media node in when
 * it is inserted or pasted somewhere else, by closing the nodes around the cursor until one can
 * hold it. That is fine for a list or a plain blockquote, which split cleanly in two around the
 * image. It is not fine for an isolating node: a table splits into two tables with different column
 * counts, and a media-text block or a quote with a byline is duplicated, attributes and all.
 *
 * So an isolating node that cannot hold media is a barrier. The insert actions are unavailable
 * behind one (see `canInsertBlock`), and a paste behind one keeps its text where the cursor is and
 * puts the media just after the block. Drops need nothing: ProseMirror's `dropPoint` already moves
 * a dropped node to the nearest position that can take it, without splitting anything.
 */

export const mediaGroup = "media";

export function isMediaNode(node: ProseMirrorNode): boolean {
	return node.type.isInGroup(mediaGroup);
}

/**
 * The depth of the innermost isolating ancestor that stops `type` from being placed at `$pos`, or
 * `null` when it can be placed there, splitting at most nodes that split cleanly.
 */
export function findIsolatingBarrier($pos: ResolvedPos, type: NodeType): number | null {
	for (let depth = $pos.depth; depth >= 0; depth -= 1) {
		const node = $pos.node(depth);
		const index = $pos.index(depth);

		if (node.canReplaceWith(index, index, type)) {
			return null;
		}
		if (depth > 0 && node.type.spec.isolating === true) {
			return depth;
		}
	}

	return null;
}

/**
 * The paste, with media that would land behind a barrier moved out of it: everything else is pasted
 * at the selection as usual, and the media nodes follow the block holding the barrier, in their
 * pasted order. `null` when ProseMirror's own paste is fine.
 *
 * Only closed media nodes at the top of the slice are moved. A slice that opens into one (part of a
 * media-text body, say) is pasted as it comes.
 */
export function placePastedMedia(state: EditorState, slice: Slice): Transaction | null {
	const { content, openStart, openEnd } = slice;
	const media: Array<ProseMirrorNode> = [];
	const rest: Array<ProseMirrorNode> = [];

	content.forEach((node, _offset, index) => {
		const isOpen =
			(index === 0 && openStart > 0) || (index === content.childCount - 1 && openEnd > 0);
		(isMediaNode(node) && !isOpen ? media : rest).push(node);
	});

	const [first] = media;
	if (first == null) {
		return null;
	}

	const { $from } = state.selection;
	// Every media node is in the same group, so any one of them stands for all.
	const barrier = findIsolatingBarrier($from, first.type);
	if (barrier == null) {
		return null;
	}

	// The nearest ancestor above the barrier with room for media, right after the child it holds.
	let target: number | null = null;
	for (let depth = barrier - 1; depth >= 0; depth -= 1) {
		const index = $from.indexAfter(depth);
		if ($from.node(depth).canReplaceWith(index, index, first.type)) {
			target = depth;
			break;
		}
	}
	if (target == null) {
		return null;
	}

	const after = $from.after(target + 1);
	const tr = state.tr;

	if (rest.length > 0) {
		tr.replaceSelection(new Slice(Fragment.fromArray(rest), openStart, openEnd));
	} else {
		tr.deleteSelection();
	}

	const insertAt = tr.mapping.map(after);
	tr.insert(insertAt, Fragment.fromArray(media));

	// With nothing else pasted, select what arrived, so the author sees where it went.
	if (rest.length === 0) {
		tr.setSelection(NodeSelection.create(tr.doc, insertAt));
	}

	return tr.scrollIntoView();
}

/** Applies {@link placePastedMedia} to pastes. Adds no node or mark types. */
export const MediaPasteGuard = Extension.create({
	name: "mediaPasteGuard",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("mediaPasteGuard"),
				props: {
					handlePaste(view, _event, slice) {
						const tr = placePastedMedia(view.state, slice);
						if (tr == null) {
							return false;
						}
						view.dispatch(tr.setMeta("paste", true).setMeta("uiEvent", "paste"));
						return true;
					},
				},
			}),
		];
	},
});
