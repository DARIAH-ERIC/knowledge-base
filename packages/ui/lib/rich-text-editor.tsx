// oxlint-disable jsx-a11y/iframe-has-title

"use client";

import { type Extensions, type JSONContent, Node, mergeAttributes } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table/kit";
import { Typography } from "@tiptap/extension-typography";
import {
	EditorContent,
	NodeViewContent,
	type NodeViewProps,
	NodeViewWrapper,
	ReactNodeViewRenderer,
	useEditor,
	useEditorState,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import cn from "clsx/lite";
import {
	BoldIcon,
	CodeIcon,
	Heading2Icon,
	Heading3Icon,
	Heading4Icon,
	ItalicIcon,
	LinkIcon,
	ListIcon,
	ListOrderedIcon,
	PencilIcon,
	QuoteIcon,
	TableIcon,
	Trash2Icon,
	VariableIcon,
} from "lucide-react";
import { useExtracted } from "next-intl";
import {
	type ReactNode,
	useCallback,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { twMerge } from "tailwind-merge";

import { Button } from "@/lib/button";
import { ButtonLink } from "@/lib/button-link";
import { buttonStyles } from "@/lib/button-styles";
import { InlineRichTextEditor } from "@/lib/inline-rich-text-editor";
import { InlineRichTextRenderer } from "@/lib/inline-rich-text-renderer";
import { Input } from "@/lib/input";
import { Note } from "@/lib/note";
import { Popover, PopoverContent, PopoverTrigger } from "@/lib/popover";
import { formatPlaceholderValue, isEmptyRichTextDocument } from "@/lib/rich-text";
import { RichTextEditorToolbarButton } from "@/lib/rich-text-toolbar-button";
import { ToggleGroup, ToggleGroupItem } from "@/lib/toggle-group";
import { Tooltip, TooltipContent } from "@/lib/tooltip";

/** Serialize a richtext caption for storage in an HTML `data-caption` attribute (copy/paste). */
function serializeCaptionAttr(caption: JSONContent | null): string | null {
	return caption != null ? JSON.stringify(caption) : null;
}

/** Parse a `data-caption` attribute back into richtext JSON; invalid/empty values become null. */
function parseCaptionAttr(value: string | null | undefined): JSONContent | null {
	if (value == null || value === "") {
		return null;
	}
	try {
		return JSON.parse(value) as JSONContent;
	} catch {
		return null;
	}
}

type RichTextSize = "sm" | "md" | "lg";

const richtextSizeClass: Record<RichTextSize, string> = {
	sm: "richtext-sm",
	md: "richtext-base",
	lg: "richtext-lg",
};

interface RichTextEditorProps {
	"aria-label"?: string;
	className?: string;
	/** Scales the text of the content element. Defaults to the base `richtext` sizing when omitted. */
	size?: RichTextSize;
	content?: JSONContent;
	isEditable?: boolean;
	name?: string;
	onChange?: (content: JSONContent) => void;
	renderEmbedInsert?: (insertEmbed: () => void) => ReactNode;
	renderCalloutInsert?: (insertCallout: () => void) => ReactNode;
	renderMediaTextInsert?: (insertMediaText: () => void) => ReactNode;
	renderButtonLinkInsert?: (insertButtonLink: () => void) => ReactNode;
	renderPlaceholderValueInsert?: (
		insertPlaceholderValue: (value: { kind: string; label: string }) => void,
	) => ReactNode;
	renderImagePicker?: (
		insert: (
			imageKey: string,
			imageUrl: string,
			asset?: { alt?: string | null; caption?: JSONContent | null },
		) => void,
	) => ReactNode;
	/**
	 * Picker for linking selected text to a stored document. Lives in the toolbar rather than in the
	 * link popover: the picker is a modal dialog, and opening one from inside a popover dismisses the
	 * popover it was opened from.
	 */
	renderDocumentPicker?: (link: (assetKey: string, label: string) => void) => ReactNode;
	/** Picker for linking selected text to another entity. In the toolbar, for the same reason. */
	renderEntityPicker?: (link: (entityId: string, label: string) => void) => ReactNode;
}

function normalizeInitialContent(content: JSONContent | undefined): JSONContent | undefined {
	if (content == null) {
		return undefined;
	}

	if (typeof content !== "object" || typeof content.type !== "string") {
		return undefined;
	}

	return content;
}

type ImagePickerRenderer = NonNullable<RichTextEditorProps["renderImagePicker"]>;
type ImageCaptionMode = "hidden" | "inherit" | "override";

/** Mirrors `imageLayoutEnum` in `@dariah-eric/database` — the stored column is a closed set. */
type ImageLayout = "default" | "wide" | "full" | "float-start" | "float-end";

const imageLayouts = new Set<ImageLayout>(["default", "wide", "full", "float-start", "float-end"]);

function normalizeImageLayout(value: unknown): ImageLayout {
	return imageLayouts.has(value as ImageLayout) ? (value as ImageLayout) : "default";
}

function resolveImageCaption(
	captionMode: ImageCaptionMode,
	caption: JSONContent | null,
	assetCaption: JSONContent | null,
): JSONContent | null {
	if (captionMode === "hidden") {
		return null;
	}
	return captionMode === "override" ? caption : assetCaption;
}

// Re-export so existing consumers can keep importing from `@dariah-eric/ui/rich-text-editor`.
export { RichTextEditorToolbarButton };
export type { RichTextEditorToolbarButtonProps } from "@/lib/rich-text-toolbar-button";

// Keep the internal alias for backward-compat within this file.
const RichTextEditorIconButton = RichTextEditorToolbarButton;

/** One row/column command in the table popover — a labelled entry rather than another icon. */
function TableCommandButton({
	label,
	onPress,
}: Readonly<{ label: string; onPress: () => void }>): ReactNode {
	return (
		<Button className="justify-start" intent="plain" onPress={onPress} size="sm" type="button">
			{label}
		</Button>
	);
}

interface BlockNodeSurfaceProps {
	children: ReactNode;
	className?: string;
	isEditable: boolean;
	isEditing: boolean;
	isSelected?: boolean;
	label: string;
	onDoubleClick?: () => void;
}

function BlockNodeSurface({
	children,
	className,
	isEditable,
	isEditing,
	isSelected = false,
	label,
	onDoubleClick,
}: Readonly<BlockNodeSurfaceProps>): ReactNode {
	const wrapperRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		/** ProseMirror puts `draggable` on the node-view container outside `NodeViewWrapper`. */
		const nodeViewContainer = wrapperRef.current?.parentElement;
		if (nodeViewContainer == null) {
			return;
		}
		if (isEditing || !isEditable) {
			nodeViewContainer.removeAttribute("draggable");
		} else {
			nodeViewContainer.setAttribute("draggable", "true");
		}
	}, [isEditable, isEditing]);

	return (
		<NodeViewWrapper ref={wrapperRef} data-drag-handle={isEditing || !isEditable ? undefined : ""}>
			<div
				aria-label={label}
				className={twMerge(
					"my-2 overflow-clip rounded-lg border border-input bg-bg transition-shadow",
					isEditable && "cursor-default",
					isSelected && "border-primary ring-2 ring-primary/20",
					className,
				)}
				contentEditable={false}
				onDoubleClick={(e) => {
					if (isEditing || !isEditable || onDoubleClick == null) {
						return;
					}
					e.preventDefault();
					onDoubleClick();
				}}
			>
				{children}
			</div>
		</NodeViewWrapper>
	);
}

/**
 * Footer of a block edit panel. Its buttons act on the block as a whole rather than on the setting
 * directly above them, so they sit below a rule which spans the full panel — the panel's own `p-4`
 * is reversed out and then reapplied.
 */
const blockPanelFooterClassName =
	"-ms-4 -me-4 mbs-1 flex items-center gap-x-2 border-bs border-border px-4 pbs-3";

function getEmbedUrl(url: string): string {
	const watchMatch = /youtube\.com\/watch\?.*?v=([\w-]+)/.exec(url);
	if (watchMatch != null) {
		return `https://www.youtube-nocookie.com/embed/${watchMatch[1]!}`;
	}
	const shortMatch = /youtu\.be\/([\w-]+)/.exec(url);
	if (shortMatch != null) {
		return `https://www.youtube-nocookie.com/embed/${shortMatch[1]!}`;
	}
	return url;
}

function EmbedNodeView({
	editor,
	getPos,
	node,
	selected,
	updateAttributes,
	deleteNode,
}: Readonly<NodeViewProps>): ReactNode {
	const url = node.attrs.url as string | null;
	const title = node.attrs.title as string | null;
	const caption = node.attrs.caption as JSONContent | null;

	const [isEditing, setIsEditing] = useState(url == null && editor.isEditable);
	const [urlInput, setUrlInput] = useState(url ?? "");
	const [titleInput, setTitleInput] = useState(title ?? "");
	const [captionJson, setCaptionJson] = useState<JSONContent | null>(caption);

	function handleApply() {
		if (!urlInput.trim() || !titleInput.trim()) {
			return;
		}
		updateAttributes({
			url: urlInput.trim(),
			title: titleInput.trim(),
			caption: isEmptyRichTextDocument(captionJson) ? null : captionJson,
		});
		setIsEditing(false);
	}

	const embedUrl = url != null ? getEmbedUrl(url) : null;

	const urlInputId = useId();
	const titleInputId = useId();

	function resetInputs() {
		setUrlInput(url ?? "");
		setTitleInput(title ?? "");
		setCaptionJson(caption);
	}

	function selectNode() {
		const pos = getPos();
		if (typeof pos !== "number") {
			return;
		}
		editor.commands.setNodeSelection(pos);
	}

	return (
		<BlockNodeSurface
			isEditable={editor.isEditable}
			isEditing={isEditing}
			isSelected={selected}
			label="Embed block"
			onDoubleClick={() => {
				selectNode();
				resetInputs();
				setIsEditing(true);
			}}
		>
			<div className={twMerge("transition-opacity", selected && "bg-primary-subtle/10")}>
				{isEditing ? (
					<div className="flex flex-col gap-y-3 p-4 select-none **:[[contenteditable]]:select-text [&_input]:select-text">
						<div className="flex flex-col gap-y-1">
							<label className="text-sm/6 font-medium" htmlFor={urlInputId}>
								{"URL"}
							</label>
							<Input
								id={urlInputId}
								onChange={(e) => {
									setUrlInput(e.target.value);
								}}
								placeholder="https://"
								type="url"
								value={urlInput}
							/>
						</div>
						<div className="flex flex-col gap-y-1">
							<label className="text-sm/6 font-medium" htmlFor={titleInputId}>
								{"Title"}
							</label>
							<Input
								id={titleInputId}
								onChange={(e) => {
									setTitleInput(e.target.value);
								}}
								placeholder="Descriptive title for screen readers"
								type="text"
								value={titleInput}
							/>
						</div>
						<div className="flex flex-col gap-y-1">
							<span className="text-sm/6 font-medium">{"Caption"}</span>
							<InlineRichTextEditor
								aria-label="Caption"
								content={caption ?? undefined}
								onChange={setCaptionJson}
							/>
						</div>
						<div className={blockPanelFooterClassName}>
							<Button
								intent="primary"
								isDisabled={!urlInput.trim() || !titleInput.trim()}
								onPress={handleApply}
								size="sm"
								type="button"
							>
								{"Apply"}
							</Button>
							{url != null ? (
								<Button
									intent="outline"
									onPress={() => {
										setIsEditing(false);
									}}
									size="sm"
									type="button"
								>
									{"Cancel"}
								</Button>
							) : (
								<Button intent="outline" onPress={deleteNode} size="sm" type="button">
									{"Remove"}
								</Button>
							)}
						</div>
					</div>
				) : (
					<div>
						{embedUrl != null && (
							<div className="aspect-video inline-full">
								<iframe
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									allowFullScreen={true}
									className="block-full inline-full"
									referrerPolicy="strict-origin-when-cross-origin"
									sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
									src={embedUrl}
									title={title ?? embedUrl}
								/>
							</div>
						)}
						{editor.isEditable ? (
							<div className="flex items-center justify-between gap-x-2 border-bs border-border px-4 py-2">
								<span className="min-inline-0 truncate text-xs text-muted-fg">{url}</span>
								<div className="flex shrink-0 gap-x-1">
									<button
										aria-label="Edit embed"
										className="rounded-sm p-1 text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={() => {
											selectNode();
											setUrlInput(url ?? "");
											setTitleInput(title ?? "");
											setCaptionJson(caption);
											setIsEditing(true);
										}}
										type="button"
									>
										<PencilIcon className="block-3.5 inline-3.5" />
									</button>
									<button
										aria-label="Remove embed"
										className="rounded-sm p-1 text-muted-fg hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onClick={deleteNode}
										type="button"
									>
										<Trash2Icon className="block-3.5 inline-3.5" />
									</button>
								</div>
							</div>
						) : (
							<div className="border-bs border-border px-4 py-2">
								<span className="min-inline-0 truncate text-xs text-muted-fg">{url}</span>
							</div>
						)}
						{!isEmptyRichTextDocument(caption) ? (
							<InlineRichTextRenderer
								className="border-bs border-border px-4 py-2 text-muted-fg"
								content={caption!}
							/>
						) : null}
					</div>
				)}
			</div>
		</BlockNodeSurface>
	);
}

/**
 * Block-level embed node (YouTube, iframes). Stores url/title/caption and renders an inline editing
 * UI via a React NodeView.
 */
export const EmbedNode = Node.create({
	name: "embedBlock",
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			url: { default: null },
			title: { default: null },
			caption: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: "div[data-embed-block]",
				getAttrs(dom) {
					const el = dom;
					return {
						url: el.dataset.url,
						title: el.dataset.title,
						caption: parseCaptionAttr(el.dataset.caption),
					};
				},
			},
		];
	},

	renderHTML({ node }) {
		return [
			"div",
			{
				"data-embed-block": "",
				"data-url": node.attrs.url as string | null,
				"data-title": node.attrs.title as string | null,
				"data-caption": serializeCaptionAttr(node.attrs.caption as JSONContent | null),
			},
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(EmbedNodeView);
	},
});

type CalloutIntent = "neutral" | "info" | "warning" | "danger" | "success";

function normalizeCalloutIntent(intent: unknown): CalloutIntent {
	if (intent === "default") {
		return "neutral";
	}
	if (
		intent === "neutral" ||
		intent === "info" ||
		intent === "warning" ||
		intent === "danger" ||
		intent === "success"
	) {
		return intent;
	}
	return "info";
}

function CalloutNodeView({
	editor,
	getPos,
	node,
	selected,
	updateAttributes,
	deleteNode,
}: Readonly<NodeViewProps>): ReactNode {
	const intent = normalizeCalloutIntent(node.attrs.intent);
	const title = node.attrs.title as string | null;
	const content = node.attrs.content as JSONContent | null;
	const [isEditing, setIsEditing] = useState(content == null && editor.isEditable);
	const [intentInput, setIntentInput] = useState<CalloutIntent>(intent);
	const [titleInput, setTitleInput] = useState(title ?? "");
	const [contentInput, setContentInput] = useState<JSONContent | null>(content);
	const titleInputId = useId();

	function selectNode() {
		const pos = getPos();
		if (typeof pos === "number") {
			editor.commands.setNodeSelection(pos);
		}
	}

	function resetInputs() {
		setIntentInput(intent);
		setTitleInput(title ?? "");
		setContentInput(content);
	}

	return (
		<BlockNodeSurface
			className="border-transparent"
			isEditable={editor.isEditable}
			isEditing={isEditing}
			isSelected={selected}
			label="Callout block"
			onDoubleClick={() => {
				selectNode();
				resetInputs();
				setIsEditing(true);
			}}
		>
			{isEditing ? (
				<div className="flex flex-col gap-y-3 border border-input bg-bg p-4 select-none **:[[contenteditable]]:select-text [&_input]:select-text">
					<div className="flex flex-col gap-y-1">
						<span className="text-sm/6 font-medium">{"Style"}</span>
						<ToggleGroup
							aria-label="Callout style"
							disallowEmptySelection={true}
							onSelectionChange={(keys) => {
								const nextIntent = [...keys][0] as CalloutIntent | undefined;
								if (nextIntent != null) {
									setIntentInput(nextIntent);
								}
							}}
							selectedKeys={[intentInput]}
							size="sm"
						>
							<ToggleGroupItem id="neutral">{"Neutral"}</ToggleGroupItem>
							<ToggleGroupItem id="info">{"Info"}</ToggleGroupItem>
							<ToggleGroupItem id="warning">{"Warning"}</ToggleGroupItem>
							<ToggleGroupItem id="danger">{"Danger"}</ToggleGroupItem>
							<ToggleGroupItem id="success">{"Success"}</ToggleGroupItem>
						</ToggleGroup>
					</div>
					<div className="flex flex-col gap-y-1">
						<label className="text-sm/6 font-medium" htmlFor={titleInputId}>
							{"Title (optional)"}
						</label>
						<Input
							id={titleInputId}
							onChange={(event) => {
								setTitleInput(event.target.value);
							}}
							value={titleInput}
						/>
					</div>
					<div className="flex flex-col gap-y-1">
						<span className="text-sm/6 font-medium">{"Content"}</span>
						<InlineRichTextEditor
							aria-label="Callout content"
							content={contentInput ?? undefined}
							onChange={setContentInput}
						/>
					</div>
					<div className={blockPanelFooterClassName}>
						<Button
							intent="primary"
							onPress={() => {
								updateAttributes({
									intent: intentInput,
									title: titleInput.trim() || null,
									content: contentInput ?? { type: "doc", content: [{ type: "paragraph" }] },
								});
								setIsEditing(false);
							}}
							size="sm"
							type="button"
						>
							{"Apply"}
						</Button>
						{content != null ? (
							<Button
								intent="outline"
								onPress={() => {
									setIsEditing(false);
								}}
								size="sm"
								type="button"
							>
								{"Cancel"}
							</Button>
						) : (
							<Button intent="outline" onPress={deleteNode} size="sm" type="button">
								{"Remove"}
							</Button>
						)}
					</div>
				</div>
			) : (
				<aside aria-label={title ?? `${intent} callout`} className="group relative">
					<Note intent={intent === "neutral" ? "default" : intent}>
						{title != null ? <strong className="mbe-1 block">{title}</strong> : null}
						{content != null ? <InlineRichTextRenderer content={content} /> : null}
					</Note>
					{editor.isEditable ? (
						<div className="absolute inset-e-2 inset-bs-2 flex gap-x-1 opacity-0 transition-opacity group-hover:opacity-100">
							<button
								aria-label="Edit callout"
								className="rounded-sm bg-bg/90 p-1 text-muted-fg shadow-sm hover:text-fg"
								onClick={() => {
									selectNode();
									resetInputs();
									setIsEditing(true);
								}}
								type="button"
							>
								<PencilIcon className="block-3.5 inline-3.5" />
							</button>
							<button
								aria-label="Remove callout"
								className="rounded-sm bg-bg/90 p-1 text-muted-fg shadow-sm hover:text-danger"
								onClick={deleteNode}
								type="button"
							>
								<Trash2Icon className="block-3.5 inline-3.5" />
							</button>
						</div>
					) : null}
				</aside>
			)}
		</BlockNodeSurface>
	);
}

export const CalloutNode = Node.create({
	name: "calloutBlock",
	group: "block",
	atom: true,
	draggable: true,
	selectable: true,
	addAttributes() {
		return { intent: { default: "info" }, title: { default: null }, content: { default: null } };
	},
	parseHTML() {
		return [
			{
				tag: "aside[data-callout-block]",
				getAttrs(dom) {
					return {
						intent: normalizeCalloutIntent(dom.dataset.intent),
						title: dom.dataset.title ?? null,
						content: parseCaptionAttr(dom.dataset.content),
					};
				},
			},
			{
				tag: "div[data-callout-block]",
				getAttrs(dom) {
					return {
						intent: normalizeCalloutIntent(dom.dataset.intent),
						title: dom.dataset.title ?? null,
						content: parseCaptionAttr(dom.dataset.content),
					};
				},
			},
		];
	},
	renderHTML({ node }) {
		return [
			"aside",
			{
				"aria-label":
					(node.attrs.title as string | null) ?? `${node.attrs.intent as string} callout`,
				"data-callout-block": "",
				"data-intent": node.attrs.intent as string,
				"data-title": node.attrs.title as string | null,
				"data-content": serializeCaptionAttr(node.attrs.content as JSONContent | null),
			},
		];
	},
	addNodeView() {
		return ReactNodeViewRenderer(CalloutNodeView);
	},
});

type ButtonLinkVariant = "primary" | "secondary" | "outline";

function normalizeButtonLinkVariant(value: unknown): ButtonLinkVariant {
	if (value === "primary" || value === "secondary" || value === "outline") {
		return value;
	}
	return "primary";
}

/**
 * Inline call-to-action node: a link rendered to look like a button. Stored as structured
 * `href`/`label`/`variant` attributes (not styled text) and edited through a popover anchored to
 * the button itself, mirroring the `EmbedNode`/`CalloutNode` pattern but at the inline level.
 */
function ButtonLinkNodeView({
	editor,
	getPos,
	node,
	selected,
	updateAttributes,
	deleteNode,
}: Readonly<NodeViewProps>): ReactNode {
	const href = node.attrs.href as string | null;
	const label = node.attrs.label as string | null;
	const variant = normalizeButtonLinkVariant(node.attrs.variant);

	const [isOpen, setIsOpen] = useState(href == null && editor.isEditable);
	const [hrefInput, setHrefInput] = useState(href ?? "");
	const [labelInput, setLabelInput] = useState(label ?? "");
	const [variantInput, setVariantInput] = useState<ButtonLinkVariant>(variant);

	const hrefInputId = useId();
	const labelInputId = useId();

	const displayLabel = label ?? "Button";

	if (!editor.isEditable) {
		return (
			<NodeViewWrapper as="span" className="inline-block align-baseline">
				<ButtonLink href={href ?? "#"} intent={variant} size="sm">
					{displayLabel}
				</ButtonLink>
			</NodeViewWrapper>
		);
	}

	function selectNode() {
		const pos = getPos();
		if (typeof pos === "number") {
			editor.commands.setNodeSelection(pos);
		}
	}

	function resetInputs() {
		setHrefInput(href ?? "");
		setLabelInput(label ?? "");
		setVariantInput(variant);
	}

	function handleApply() {
		const nextHref = hrefInput.trim();
		const nextLabel = labelInput.trim();
		if (!nextHref || !nextLabel) {
			return;
		}
		updateAttributes({ href: nextHref, label: nextLabel, variant: variantInput });
		setIsOpen(false);
	}

	function handleOpenChange(open: boolean) {
		if (open) {
			selectNode();
			resetInputs();
			setIsOpen(true);
			return;
		}
		// Dismissing a button that was never configured removes the placeholder node.
		if (href == null) {
			deleteNode();
			return;
		}
		setIsOpen(false);
	}

	return (
		<NodeViewWrapper as="span" className="inline-block align-baseline" contentEditable={false}>
			<Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
				<PopoverTrigger
					aria-label="Edit button link"
					className={twMerge(
						buttonStyles({ intent: variant, size: "sm" }),
						"cursor-pointer",
						selected && "ring-2 ring-primary/40",
					)}
				>
					{displayLabel}
				</PopoverTrigger>
				<PopoverContent className="p-3">
					<form
						className="flex inline-64 flex-col gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							handleApply();
						}}
					>
						<div className="flex flex-col gap-y-1">
							<label className="text-sm/6 font-medium" htmlFor={labelInputId}>
								{"Label"}
							</label>
							<Input
								autoFocus={true}
								id={labelInputId}
								onChange={(e) => {
									setLabelInput(e.target.value);
								}}
								placeholder="Learn more"
								type="text"
								value={labelInput}
							/>
						</div>
						<div className="flex flex-col gap-y-1">
							<label className="text-sm/6 font-medium" htmlFor={hrefInputId}>
								{"URL"}
							</label>
							<Input
								id={hrefInputId}
								onChange={(e) => {
									setHrefInput(e.target.value);
								}}
								placeholder="https://example.com"
								type="text"
								value={hrefInput}
							/>
						</div>
						<div className="flex flex-col gap-y-1">
							<span className="text-sm/6 font-medium">{"Style"}</span>
							<ToggleGroup
								aria-label="Button style"
								disallowEmptySelection={true}
								onSelectionChange={(keys) => {
									const nextVariant = [...keys][0] as ButtonLinkVariant | undefined;
									if (nextVariant != null) {
										setVariantInput(nextVariant);
									}
								}}
								selectedKeys={[variantInput]}
								size="sm"
							>
								<ToggleGroupItem id="primary">{"Primary"}</ToggleGroupItem>
								<ToggleGroupItem id="secondary">{"Secondary"}</ToggleGroupItem>
								<ToggleGroupItem id="outline">{"Outline"}</ToggleGroupItem>
							</ToggleGroup>
						</div>
						<div className="flex gap-2">
							<Button
								className="flex-1"
								intent="primary"
								isDisabled={!hrefInput.trim() || !labelInput.trim()}
								size="sm"
								type="submit"
							>
								{"Apply"}
							</Button>
							<Button intent="outline" onPress={deleteNode} size="sm" type="button">
								{"Remove"}
							</Button>
						</div>
					</form>
				</PopoverContent>
			</Popover>
		</NodeViewWrapper>
	);
}

export const ButtonLinkNode = Node.create({
	name: "buttonLink",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	draggable: false,

	addAttributes() {
		return {
			href: { default: null },
			label: { default: null },
			variant: { default: "primary" },
		};
	},

	parseHTML() {
		return [
			{
				tag: "a[data-button-link]",
				getAttrs(dom) {
					return {
						href: dom.getAttribute("href"),
						label: dom.textContent,
						variant: normalizeButtonLinkVariant(dom.dataset.variant),
					};
				},
			},
		];
	},

	renderHTML({ node }) {
		return [
			"a",
			mergeAttributes({
				"data-button-link": "",
				href: node.attrs.href as string | null,
				"data-variant": node.attrs.variant as string,
			}),
			(node.attrs.label as string | null) ?? "",
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(ButtonLinkNodeView);
	},
});

/**
 * Inline reference to a placeholder value (e.g. the current number of member countries). The
 * document stores only a `kind` reference plus a display `label`; read paths substitute the current
 * value server-side, so the editor renders a placeholder chip instead of text.
 */
function PlaceholderValueNodeView({
	editor,
	getPos,
	node,
	selected,
	deleteNode,
}: Readonly<NodeViewProps>): ReactNode {
	const kind = node.attrs.kind as string | null;
	const label = (node.attrs.label as string | null) ?? kind ?? "Placeholder value";

	const chipClassName = twMerge(
		"inline-flex items-center gap-x-1 rounded-full border border-border bg-muted px-2 py-0.5 text-sm text-muted-fg",
		selected && "ring-2 ring-ring",
	);

	if (!editor.isEditable) {
		// Read views receive annotated nodes (a resolved `value` attribute) and render the plain
		// value; nodes without one (unknown kind) degrade to the labelled chip.
		const resolved = formatPlaceholderValue(node.attrs);
		if (resolved != null) {
			return (
				<NodeViewWrapper as="span" className="inline align-baseline">
					{resolved}
				</NodeViewWrapper>
			);
		}

		return (
			<NodeViewWrapper as="span" className="inline-block align-baseline">
				<span className={chipClassName}>
					<VariableIcon aria-hidden={true} className="block-3.5 inline-3.5" />
					{label}
				</span>
			</NodeViewWrapper>
		);
	}

	function selectNode() {
		const pos = getPos();
		if (typeof pos === "number") {
			editor.commands.setNodeSelection(pos);
		}
	}

	return (
		<NodeViewWrapper as="span" className="inline-block align-baseline" contentEditable={false}>
			<Popover
				onOpenChange={(open) => {
					if (open) {
						selectNode();
					}
				}}
			>
				<PopoverTrigger aria-label={label} className={chipClassName}>
					<VariableIcon aria-hidden={true} className="block-3.5 inline-3.5" />
					{label}
				</PopoverTrigger>
				<PopoverContent className="p-3">
					<div className="flex inline-64 flex-col gap-2">
						<span className="text-sm font-medium">{label}</span>
						<p className="text-xs text-muted-fg">
							{"Replaced with the current value whenever the content is displayed."}
						</p>
						<Button intent="outline" onPress={deleteNode} size="sm" type="button">
							{"Remove"}
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</NodeViewWrapper>
	);
}

export const PlaceholderValueNode = Node.create({
	name: "placeholderValue",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	draggable: false,

	addAttributes() {
		return {
			kind: { default: null },
			label: { default: null },
			/** Resolved data attached by the server on read paths; never present in editor content. */
			value: { default: null },
		};
	},

	parseHTML() {
		return [
			{
				tag: "span[data-placeholder-value]",
				getAttrs(dom) {
					return {
						kind: dom.dataset.placeholderValue ?? null,
						label: dom.textContent,
					};
				},
			},
		];
	},

	renderHTML({ node }) {
		const resolved = formatPlaceholderValue(node.attrs as Record<string, unknown>);

		return [
			"span",
			mergeAttributes({
				"data-placeholder-value": node.attrs.kind as string | null,
			}),
			resolved ?? (node.attrs.label as string | null) ?? (node.attrs.kind as string | null) ?? "",
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(PlaceholderValueNodeView);
	},
});

interface AssetImageNodeViewProps extends NodeViewProps {
	renderImagePicker?: ImagePickerRenderer;
}

function AssetImageNodeView({
	editor,
	getPos,
	node,
	selected,
	updateAttributes,
	deleteNode,
	renderImagePicker,
}: Readonly<AssetImageNodeViewProps>): ReactNode {
	const imageKey = node.attrs.imageKey as string | null;
	const imageUrl = node.attrs.imageUrl as string | null;
	const alt = node.attrs.alt as string | null;
	const assetCaption = node.attrs.assetCaption as JSONContent | null;
	const caption = node.attrs.caption as JSONContent | null;
	const captionMode = node.attrs.captionMode as ImageCaptionMode;
	const layout = normalizeImageLayout(node.attrs.layout);
	const resolvedCaption = resolveImageCaption(captionMode, caption, assetCaption);

	const [isEditing, setIsEditing] = useState(
		(editor.isEditable && (imageKey == null || imageUrl == null)) || false,
	);
	const [imageKeyInput, setImageKeyInput] = useState(imageKey ?? "");
	const [imageUrlInput, setImageUrlInput] = useState(imageUrl ?? "");
	const [captionJson, setCaptionJson] = useState<JSONContent | null>(caption);
	const [captionModeInput, setCaptionModeInput] = useState<ImageCaptionMode>(captionMode);
	const [layoutInput, setLayoutInput] = useState<ImageLayout>(layout);

	const imageKeyInputId = useId();
	const imageUrlInputId = useId();

	function resetInputs() {
		setImageKeyInput(imageKey ?? "");
		setImageUrlInput(imageUrl ?? "");
		setCaptionJson(caption);
		setCaptionModeInput(captionMode);
		setLayoutInput(layout);
	}

	function selectNode() {
		const pos = getPos();
		if (typeof pos !== "number") {
			return;
		}
		editor.commands.setNodeSelection(pos);
	}

	function handleApply() {
		const nextImageUrl = imageUrlInput.trim();
		if (!nextImageUrl) {
			return;
		}

		updateAttributes({
			imageKey: imageKeyInput.trim() || null,
			imageUrl: nextImageUrl,
			caption: isEmptyRichTextDocument(captionJson) ? null : captionJson,
			captionMode: captionModeInput,
			layout: layoutInput,
		});
		setIsEditing(false);
	}

	return (
		<BlockNodeSurface
			isEditable={editor.isEditable}
			isEditing={isEditing}
			isSelected={selected}
			label="Image block"
			onDoubleClick={() => {
				selectNode();
				resetInputs();
				setIsEditing(true);
			}}
		>
			{isEditing ? (
				/* Opening the panel puts a ProseMirror NodeSelection on the image, which spans this
				   node's DOM — so every label rendered inside it comes up highlighted as if the user
				   had dragged across it. The panel is a form, not document text, so nothing in its
				   chrome is selectable; the fields inside it opt back in. */
				<div className="flex select-none flex-col gap-y-3 p-4 **:[[contenteditable]]:select-text [&_input]:select-text">
					{renderImagePicker != null ? (
						<div className="flex flex-col gap-y-2">
							<div className="text-sm/6 font-medium">{"Pick image"}</div>
							{renderImagePicker((nextImageKey, nextImageUrl, asset) => {
								updateAttributes({
									imageKey: nextImageKey,
									imageUrl: nextImageUrl,
									alt: asset?.alt ?? null,
									assetCaption: asset?.caption ?? null,
									caption: isEmptyRichTextDocument(captionJson) ? null : captionJson,
									captionMode: captionModeInput,
								});
								setImageKeyInput(nextImageKey);
								setImageUrlInput(nextImageUrl);
							})}
						</div>
					) : null}
					{renderImagePicker == null ? (
						<>
							<div className="flex flex-col gap-y-1">
								<label className="text-sm/6 font-medium" htmlFor={imageKeyInputId}>
									{"Asset key"}
								</label>
								<Input
									id={imageKeyInputId}
									onChange={(e) => {
										setImageKeyInput(e.target.value);
									}}
									placeholder="Asset key"
									type="text"
									value={imageKeyInput}
								/>
							</div>
							<div className="flex flex-col gap-y-1">
								<label className="text-sm/6 font-medium" htmlFor={imageUrlInputId}>
									{"Image URL"}
								</label>
								<Input
									id={imageUrlInputId}
									onChange={(e) => {
										setImageUrlInput(e.target.value);
									}}
									placeholder="https://"
									type="url"
									value={imageUrlInput}
								/>
							</div>
						</>
					) : null}
					<div className="flex flex-col gap-y-1">
						<span className="text-sm/6 font-medium">{"Layout"}</span>
						<ToggleGroup
							aria-label="Layout"
							disallowEmptySelection={true}
							onSelectionChange={(keys) => {
								const nextLayout = [...keys][0] as ImageLayout | undefined;
								if (nextLayout != null) {
									setLayoutInput(nextLayout);
								}
							}}
							selectedKeys={[layoutInput]}
							size="sm"
						>
							<ToggleGroupItem id="default">{"Default"}</ToggleGroupItem>
							<ToggleGroupItem id="wide">{"Wide"}</ToggleGroupItem>
							<ToggleGroupItem id="full">{"Full width"}</ToggleGroupItem>
							<ToggleGroupItem id="float-start">{"Float left"}</ToggleGroupItem>
							<ToggleGroupItem id="float-end">{"Float right"}</ToggleGroupItem>
						</ToggleGroup>
					</div>
					<div className="flex flex-col gap-y-1">
						<span className="text-sm/6 font-medium">{"Caption behavior"}</span>
						<ToggleGroup
							aria-label="Caption behavior"
							disallowEmptySelection={true}
							onSelectionChange={(keys) => {
								const mode = [...keys][0] as ImageCaptionMode | undefined;
								if (mode != null) {
									setCaptionModeInput(mode);
								}
							}}
							selectedKeys={[captionModeInput]}
							size="sm"
						>
							<ToggleGroupItem id="inherit">{"Use asset caption"}</ToggleGroupItem>
							<ToggleGroupItem id="override">{"Custom caption"}</ToggleGroupItem>
							<ToggleGroupItem id="hidden">{"No caption"}</ToggleGroupItem>
						</ToggleGroup>
						{captionModeInput === "override" ? (
							<InlineRichTextEditor
								aria-label="Custom caption"
								content={captionJson ?? undefined}
								onChange={setCaptionJson}
							/>
						) : null}
						{captionModeInput === "inherit" && !isEmptyRichTextDocument(assetCaption) ? (
							<InlineRichTextRenderer
								className="rounded-lg border border-border px-3 py-2 text-muted-fg"
								content={assetCaption!}
							/>
						) : null}
					</div>
					<div className={blockPanelFooterClassName}>
						<Button
							intent="primary"
							isDisabled={imageUrlInput.trim() === ""}
							onPress={handleApply}
							size="sm"
							type="button"
						>
							{"Apply"}
						</Button>
						{imageKey != null || imageUrl != null ? (
							<Button
								intent="outline"
								onPress={() => {
									resetInputs();
									setIsEditing(false);
								}}
								size="sm"
								type="button"
							>
								{"Cancel"}
							</Button>
						) : null}
						{(imageKey != null || imageUrl != null) && editor.isEditable ? (
							<Button intent="outline" onPress={deleteNode} size="sm" type="button">
								{"Remove"}
							</Button>
						) : null}
					</div>
				</div>
			) : (
				<div className="group">
					<div className="relative">
						<img
							alt={alt ?? ""}
							className="block inline-full max-block-96 object-contain"
							data-asset-image=""
							data-image-key={imageKey ?? undefined}
							draggable={false}
							src={imageUrl ?? ""}
						/>
						<div className="absolute inset-x-0 inset-bs-0 flex justify-end gap-x-1 p-2 opacity-0 transition-opacity group-hover:opacity-100">
							<button
								aria-label="Edit image"
								className="rounded-sm bg-bg/90 p-1 text-muted-fg shadow-sm hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => {
									selectNode();
									resetInputs();
									setIsEditing(true);
								}}
								type="button"
							>
								<PencilIcon className="block-3.5 inline-3.5" />
							</button>
							<button
								aria-label="Remove image"
								className="rounded-sm bg-bg/90 p-1 text-muted-fg shadow-sm hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={deleteNode}
								type="button"
							>
								<Trash2Icon className="block-3.5 inline-3.5" />
							</button>
						</div>
					</div>
					{!isEmptyRichTextDocument(resolvedCaption) ? (
						<InlineRichTextRenderer
							className="border-bs border-border px-4 py-2 text-muted-fg"
							content={resolvedCaption!}
						/>
					) : null}
				</div>
			)}
		</BlockNodeSurface>
	);
}

function createAssetImageNode(renderImagePicker?: ImagePickerRenderer): Node {
	return Node.create({
		name: "assetImage",
		group: "block",
		atom: true,
		draggable: true,
		selectable: true,

		addAttributes() {
			return {
				imageKey: { default: null },
				imageUrl: { default: null },
				alt: { default: null },
				assetCaption: { default: null },
				caption: { default: null },
				captionMode: { default: "inherit" },
				layout: { default: "default" },
			};
		},

		parseHTML() {
			return [
				{
					tag: "img[data-asset-image]",
					getAttrs(dom) {
						const el = dom;
						return {
							imageKey: el.dataset.imageKey,
							imageUrl: el.getAttribute("src"),
							alt: el.getAttribute("alt"),
							assetCaption: parseCaptionAttr(el.dataset.assetCaption),
							caption: parseCaptionAttr(el.dataset.caption),
							captionMode: el.dataset.captionMode ?? "inherit",
							layout: normalizeImageLayout(el.dataset.layout),
						};
					},
				},
			];
		},

		renderHTML({ node }) {
			return [
				"img",
				mergeAttributes(
					{
						src: node.attrs.imageUrl as string | null,
						alt: node.attrs.alt as string | null,
						"data-asset-image": "",
						"data-image-key": node.attrs.imageKey as string | null,
						"data-caption-mode": node.attrs.captionMode as ImageCaptionMode,
						"data-layout": normalizeImageLayout(node.attrs.layout),
					},
					node.attrs.assetCaption != null
						? {
								"data-asset-caption": serializeCaptionAttr(
									node.attrs.assetCaption as JSONContent | null,
								),
							}
						: {},
					node.attrs.caption != null
						? { "data-caption": serializeCaptionAttr(node.attrs.caption as JSONContent | null) }
						: {},
				),
			];
		},

		addNodeView() {
			return ReactNodeViewRenderer((props) => (
				<AssetImageNodeView {...props} renderImagePicker={renderImagePicker} />
			));
		},
	});
}

type MediaTextSide = "start" | "end";

function normalizeMediaTextSide(value: unknown): MediaTextSide {
	return value === "end" ? "end" : "start";
}

interface MediaTextNodeViewProps extends NodeViewProps {
	renderImagePicker?: ImagePickerRenderer;
}

/**
 * Unlike the other custom nodes here, this one is not an atom: its prose is real document content
 * rendered through `NodeViewContent`, so authors type into it with the outer toolbar and a single
 * undo stack. Only the media settings are a form — those commit on Apply, because a nested
 * `InlineRichTextEditor` writing to `updateAttributes` on every keystroke would dispatch a
 * transaction into the outer editor per character and fight it for focus.
 */
function MediaTextNodeView({
	editor,
	node,
	selected,
	updateAttributes,
	deleteNode,
	renderImagePicker,
}: Readonly<MediaTextNodeViewProps>): ReactNode {
	const imageKey = node.attrs.imageKey as string | null;
	const imageUrl = node.attrs.imageUrl as string | null;
	const alt = node.attrs.alt as string | null;
	const assetCaption = node.attrs.assetCaption as JSONContent | null;
	const caption = node.attrs.caption as JSONContent | null;
	const captionMode = (node.attrs.captionMode as ImageCaptionMode | null) ?? "inherit";
	const side = normalizeMediaTextSide(node.attrs.side);

	// Settings open while the block has no image: `upsertTypedContentBlock` cannot store a media
	// block without one, so picking the image is the first thing an author needs to do.
	const [isEditing, setIsEditing] = useState(imageKey == null && editor.isEditable);
	const [captionModeInput, setCaptionModeInput] = useState<ImageCaptionMode>(captionMode);
	const [captionInput, setCaptionInput] = useState<JSONContent | null>(caption);

	const resolvedCaption = resolveImageCaption(captionMode, caption, assetCaption);

	function resetInputs() {
		setCaptionModeInput(captionMode);
		setCaptionInput(caption);
	}

	return (
		<NodeViewWrapper
			aria-label="Media with text block"
			className={twMerge(
				"my-2 overflow-clip rounded-lg border border-input bg-bg transition-shadow",
				selected && "border-primary ring-2 ring-primary/20",
			)}
		>
			{isEditing && editor.isEditable ? (
				<div
					className="flex flex-col gap-y-3 border-be border-border bg-muted p-4 select-none **:[[contenteditable]]:select-text [&_input]:select-text"
					contentEditable={false}
				>
					{renderImagePicker != null ? (
						<div className="flex flex-col gap-y-2">
							<span className="text-sm/6 font-medium">{"Pick image"}</span>
							{renderImagePicker((nextImageKey, nextImageUrl, asset) => {
								updateAttributes({
									imageKey: nextImageKey,
									imageUrl: nextImageUrl,
									alt: asset?.alt ?? null,
									assetCaption: asset?.caption ?? null,
								});
							})}
						</div>
					) : null}
					<div className="flex flex-col gap-y-1">
						<span className="text-sm/6 font-medium">{"Image placement"}</span>
						<ToggleGroup
							aria-label="Image placement"
							disallowEmptySelection={true}
							onSelectionChange={(keys) => {
								const nextSide = [...keys][0] as MediaTextSide | undefined;
								if (nextSide != null) {
									updateAttributes({ side: nextSide });
								}
							}}
							selectedKeys={[side]}
							size="sm"
						>
							<ToggleGroupItem id="start">{"Left"}</ToggleGroupItem>
							<ToggleGroupItem id="end">{"Right"}</ToggleGroupItem>
						</ToggleGroup>
					</div>
					<div className="flex flex-col gap-y-1">
						<span className="text-sm/6 font-medium">{"Caption behavior"}</span>
						<ToggleGroup
							aria-label="Caption behavior"
							disallowEmptySelection={true}
							onSelectionChange={(keys) => {
								const mode = [...keys][0] as ImageCaptionMode | undefined;
								if (mode != null) {
									setCaptionModeInput(mode);
								}
							}}
							selectedKeys={[captionModeInput]}
							size="sm"
						>
							<ToggleGroupItem id="inherit">{"Use asset caption"}</ToggleGroupItem>
							<ToggleGroupItem id="override">{"Custom caption"}</ToggleGroupItem>
							<ToggleGroupItem id="hidden">{"No caption"}</ToggleGroupItem>
						</ToggleGroup>
						{captionModeInput === "override" ? (
							<InlineRichTextEditor
								aria-label="Custom caption"
								content={captionInput ?? undefined}
								onChange={setCaptionInput}
							/>
						) : null}
						{captionModeInput === "inherit" && !isEmptyRichTextDocument(assetCaption) ? (
							<InlineRichTextRenderer
								className="rounded-lg border border-border px-3 py-2 text-muted-fg"
								content={assetCaption!}
							/>
						) : null}
					</div>
					<div className={blockPanelFooterClassName}>
						<Button
							intent="primary"
							isDisabled={imageKey == null}
							onPress={() => {
								updateAttributes({
									caption: isEmptyRichTextDocument(captionInput) ? null : captionInput,
									captionMode: captionModeInput,
								});
								setIsEditing(false);
							}}
							size="sm"
							type="button"
						>
							{"Apply"}
						</Button>
						{imageKey != null ? (
							<Button
								intent="outline"
								onPress={() => {
									resetInputs();
									setIsEditing(false);
								}}
								size="sm"
								type="button"
							>
								{"Cancel"}
							</Button>
						) : null}
						<Button intent="outline" onPress={deleteNode} size="sm" type="button">
							{"Remove"}
						</Button>
					</div>
				</div>
			) : null}
			<div
				className={twMerge(
					"group flex flex-col gap-4 p-4 sm:flex-row",
					side === "end" && "sm:flex-row-reverse",
				)}
			>
				{/* The media column is chrome, not content — ProseMirror must not treat it as either
				    editable text or a second content hole. It doubles as the drag handle so that
				    dragging the block never competes with selecting its prose. */}
				<div
					className="relative shrink-0 sm:inline-1/3"
					contentEditable={false}
					data-drag-handle={editor.isEditable ? "" : undefined}
				>
					{imageUrl != null ? (
						<img
							alt={alt ?? ""}
							className="block inline-full rounded-md object-cover"
							draggable={false}
							src={imageUrl}
						/>
					) : (
						<div className="flex block-32 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-fg">
							{"No image"}
						</div>
					)}
					{!isEmptyRichTextDocument(resolvedCaption) ? (
						<InlineRichTextRenderer
							className="mbs-1 text-sm text-muted-fg"
							content={resolvedCaption!}
						/>
					) : null}
					{editor.isEditable && !isEditing ? (
						<div className="absolute inset-e-1 inset-bs-1 flex gap-x-1 opacity-0 transition-opacity group-hover:opacity-100">
							<button
								aria-label="Edit media settings"
								className="rounded-sm bg-bg/90 p-1 text-muted-fg shadow-sm hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => {
									resetInputs();
									setIsEditing(true);
								}}
								type="button"
							>
								<PencilIcon className="block-3.5 inline-3.5" />
							</button>
							<button
								aria-label="Remove media with text"
								className="rounded-sm bg-bg/90 p-1 text-muted-fg shadow-sm hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={deleteNode}
								type="button"
							>
								<Trash2Icon className="block-3.5 inline-3.5" />
							</button>
						</div>
					) : null}
				</div>
				<NodeViewContent className="min-inline-0 flex-1" data-media-text-content="" />
			</div>
		</NodeViewWrapper>
	);
}

function createMediaTextNode(renderImagePicker?: ImagePickerRenderer): Node {
	return Node.create({
		name: "mediaTextBlock",
		group: "block",
		// Prose only. The body is a passage bound to the image — a speaker bio, typically — so
		// excluding headings keeps the document outline meaningful and makes a heading nested inside
		// a media block impossible by construction rather than something the toolbar has to police.
		content: "(paragraph | bulletList | orderedList)+",
		// `defining` keeps the wrapper when its content is replaced by a paste; `isolating` stops
		// backspace at the start of the body from lifting the prose out into the paragraph above.
		defining: true,
		isolating: true,
		draggable: true,
		selectable: true,

		addAttributes() {
			return {
				imageKey: { default: null },
				imageUrl: { default: null },
				alt: { default: null },
				assetCaption: { default: null },
				caption: { default: null },
				captionMode: { default: "inherit" },
				side: { default: "start" },
			};
		},

		parseHTML() {
			return [
				{
					tag: "div[data-media-text-block]",
					getAttrs(dom) {
						return {
							imageKey: dom.dataset.imageKey ?? null,
							imageUrl: dom.dataset.imageUrl ?? null,
							alt: dom.dataset.alt ?? null,
							assetCaption: parseCaptionAttr(dom.dataset.assetCaption),
							caption: parseCaptionAttr(dom.dataset.caption),
							captionMode: dom.dataset.captionMode ?? "inherit",
							side: normalizeMediaTextSide(dom.dataset.side),
						};
					},
				},
			];
		},

		renderHTML({ node }) {
			return [
				"div",
				mergeAttributes(
					{
						"data-media-text-block": "",
						"data-image-key": node.attrs.imageKey as string | null,
						"data-image-url": node.attrs.imageUrl as string | null,
						"data-alt": node.attrs.alt as string | null,
						"data-caption-mode": node.attrs.captionMode as ImageCaptionMode,
						"data-side": normalizeMediaTextSide(node.attrs.side),
					},
					node.attrs.assetCaption != null
						? {
								"data-asset-caption": serializeCaptionAttr(
									node.attrs.assetCaption as JSONContent | null,
								),
							}
						: {},
					node.attrs.caption != null
						? { "data-caption": serializeCaptionAttr(node.attrs.caption as JSONContent | null) }
						: {},
				),
				0,
			];
		},

		addNodeView() {
			return ReactNodeViewRenderer((props) => (
				<MediaTextNodeView {...props} renderImagePicker={renderImagePicker} />
			));
		},
	});
}

/**
 * The built-in `link` mark, widened so a link can point at one of our own assets instead of a typed
 * url — see `link-targets.ts` in `@dariah-eric/database` for the model and the read-time
 * resolution.
 *
 * The extension is replaced rather than merely given extra attributes, because the target also
 * changes when a link _parses_: an asset link stores a reference and no href, and the stock parse
 * rule is `a[href]`, so a round-trip through HTML (copy/paste, the WordPress import) would drop the
 * mark and leave bare text behind. The rules below are the stock ones plus one for our own markup.
 *
 * `asset` is write-only from the editor's point of view: read paths attach it (url, filename, size)
 * and it is deliberately neither parsed nor serialised, so a resolved url can never end up in
 * stored content and go stale.
 */
const LinkWithTargets = Link.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			targetKind: {
				default: null,
				parseHTML: (element) => element.dataset.targetKind ?? null,
				renderHTML: (attributes) => {
					const targetKind = attributes.targetKind as string | null;
					return targetKind == null ? {} : { "data-target-kind": targetKind };
				},
			},
			assetKey: {
				default: null,
				parseHTML: (element) => element.dataset.assetKey ?? null,
				renderHTML: (attributes) => {
					const assetKey = attributes.assetKey as string | null;
					return assetKey == null ? {} : { "data-asset-key": assetKey };
				},
			},
			entityId: {
				default: null,
				parseHTML: (element) => element.dataset.entityId ?? null,
				renderHTML: (attributes) => {
					const entityId = attributes.entityId as string | null;
					return entityId == null ? {} : { "data-entity-id": entityId };
				},
			},
			asset: {
				default: null,
				parseHTML: () => null,
				renderHTML: () => {
					return {};
				},
			},
			entity: {
				default: null,
				parseHTML: () => null,
				renderHTML: () => {
					return {};
				},
			},
		};
	},

	parseHTML() {
		return [...(this.parent?.() ?? []), { tag: "a[data-asset-key]" }, { tag: "a[data-entity-id]" }];
	},
}).configure({ openOnClick: false, defaultProtocol: "https" });

interface CreateRichTextExtensionsOptions {
	renderImagePicker?: ImagePickerRenderer;
}

/**
 * Canonical extension set for the rich text editor. Shared with the static renderer so that the
 * read-only details views resolve the same node types the editor can produce (e.g. `image`,
 * `assetImage`, `embedBlock`); otherwise rendering content authored in the editor or imported from
 * WordPress throws `Unknown node type`.
 */
export function createRichTextExtensions(
	options?: Readonly<CreateRichTextExtensionsOptions>,
): Extensions {
	return [
		// The link mark comes from `LinkWithTargets` below instead, which extends it to carry asset
		// targets; two link extensions would collide on the same mark name.
		StarterKit.configure({
			heading: { levels: [2, 3, 4] },
			link: false,
		}),
		// Normalise typography as authors type. Keep the unambiguous substitutions (smart
		// quotes/apostrophes, `--` → em dash, `...` → ellipsis) and disable the rest, which corrupt
		// legitimate technical/academic text — e.g. `(c)` as a list marker → ©, `1/2` → ½, `->` → →,
		// `!=` → ≠, `<<`/`>>` → «/».
		Typography.configure({
			copyright: false,
			registeredTrademark: false,
			trademark: false,
			servicemark: false,
			oneHalf: false,
			oneQuarter: false,
			threeQuarters: false,
			plusMinus: false,
			notEqual: false,
			laquo: false,
			raquo: false,
			leftArrow: false,
			rightArrow: false,
			multiplication: false,
			superscriptTwo: false,
			superscriptThree: false,
		}),
		// Tables carry data, not layout: column widths are left to the stylesheet (`resizable: false`,
		// so no `colwidth` attributes are ever written) and cells hold ordinary block content. Without
		// these node types a pasted or imported `<table>` is silently flattened into one paragraph of
		// run-together cell text — which is exactly what the WordPress migration produced.
		TableKit.configure({ table: { resizable: false } }),
		LinkWithTargets,
		Image,
		createAssetImageNode(options?.renderImagePicker),
		createMediaTextNode(options?.renderImagePicker),
		EmbedNode,
		CalloutNode,
		ButtonLinkNode,
		PlaceholderValueNode,
	];
}

export function RichTextEditor(props: Readonly<RichTextEditorProps>): ReactNode {
	const {
		"aria-label": ariaLabel,
		content,
		onChange,
		isEditable = true,
		name,
		className,
		size,
		renderEmbedInsert,
		renderCalloutInsert,
		renderMediaTextInsert,
		renderButtonLinkInsert,
		renderPlaceholderValueInsert,
		renderImagePicker,
		renderDocumentPicker,
		renderEntityPicker,
	} = props;

	const t = useExtracted("ui");

	const initialContent = useMemo(() => normalizeInitialContent(content), [content]);

	const extensions = useMemo(
		() => createRichTextExtensions({ renderImagePicker }),
		[renderImagePicker],
	);

	const editor = useEditor({
		extensions,
		content: initialContent,
		editable: isEditable,
		immediatelyRender: false,
		onUpdate() {
			if (editor) {
				const json = editor.getJSON();
				// oxlint-disable-next-line no-use-before-define
				setEditorJson(json);
				onChange?.(json);
			}
		},
		editorProps: {
			attributes: {
				class: twMerge(
					"richtext max-inline-none px-4 py-3 min-block-37.5 focus:outline-none",
					size != null ? richtextSizeClass[size] : undefined,
				),
				role: "textbox",
				"aria-multiline": "true",
				...(ariaLabel != null ? { "aria-label": ariaLabel } : {}),
			},
		},
	});

	const activeState = useEditorState({
		editor,
		selector(ctx) {
			return {
				isBold: ctx.editor?.isActive("bold"),
				isItalic: ctx.editor?.isActive("italic"),
				isCode: ctx.editor?.isActive("code"),
				isHeading2: ctx.editor?.isActive("heading", { level: 2 }),
				isHeading3: ctx.editor?.isActive("heading", { level: 3 }),
				isHeading4: ctx.editor?.isActive("heading", { level: 4 }),
				isBulletList: ctx.editor?.isActive("bulletList"),
				isOrderedList: ctx.editor?.isActive("orderedList"),
				isBlockquote: ctx.editor?.isActive("blockquote"),
				isLink: ctx.editor?.isActive("link"),
				isInTable: ctx.editor?.isActive("table"),
				linkHref: ctx.editor?.getAttributes("link").href as string | undefined,
				linkTargetKind: ctx.editor?.getAttributes("link").targetKind as string | undefined,
			};
		},
	});

	const [editorJson, setEditorJson] = useState<JSONContent | undefined>(initialContent);

	const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
	const [linkHrefInput, setLinkHrefInput] = useState("");
	const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

	const handleLinkPopoverOpenChange = useCallback(
		(open: boolean) => {
			if (open && editor) {
				savedSelectionRef.current = {
					from: editor.state.selection.from,
					to: editor.state.selection.to,
				};
				setLinkHrefInput(activeState?.linkHref ?? "");
			}
			setIsLinkPopoverOpen(open);
		},
		[editor, activeState?.linkHref],
	);

	const applyLink = useCallback(() => {
		if (!editor) {
			return;
		}
		const href = linkHrefInput.trim();
		if (!href) {
			return;
		}

		const sel = savedSelectionRef.current;
		const chain = editor.chain().focus();
		if (sel) {
			chain.setTextSelection(sel);
		}

		if (sel && sel.from === sel.to && !(activeState?.isLink ?? false)) {
			chain
				.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
				.run();
		} else {
			if (activeState?.isLink === true) {
				chain.extendMarkRange("link");
			}
			chain.setLink({ href }).run();
		}

		setIsLinkPopoverOpen(false);
	}, [editor, linkHrefInput, activeState?.isLink]);

	const removeLink = useCallback(() => {
		if (!editor) {
			return;
		}
		const sel = savedSelectionRef.current;
		const chain = editor.chain().focus();
		if (sel) {
			chain.setTextSelection(sel);
		}
		if (activeState?.isLink === true) {
			chain.extendMarkRange("link");
		}
		chain.unsetLink().run();
		setIsLinkPopoverOpen(false);
	}, [editor, activeState?.isLink]);

	const insertEmbed = useCallback(() => {
		if (!editor) {
			return;
		}
		editor
			.chain()
			.focus()
			.insertContent({ type: "embedBlock", attrs: { url: null, title: null, caption: null } })
			.run();
	}, [editor]);

	const insertCallout = useCallback(() => {
		if (!editor) {
			return;
		}
		editor
			.chain()
			.focus()
			.insertContent({
				type: "calloutBlock",
				attrs: { intent: "info", title: null, content: null },
			})
			.run();
	}, [editor]);

	const insertMediaText = useCallback(() => {
		if (!editor) {
			return;
		}
		editor
			.chain()
			.focus()
			.insertContent({
				type: "mediaTextBlock",
				attrs: {
					imageKey: null,
					imageUrl: null,
					alt: null,
					assetCaption: null,
					caption: null,
					captionMode: "inherit",
					side: "start",
				},
				// The content expression requires at least one child; an empty node would be rejected.
				content: [{ type: "paragraph" }],
			})
			.run();
	}, [editor]);

	const insertButtonLink = useCallback(() => {
		if (!editor) {
			return;
		}
		editor
			.chain()
			.focus()
			.insertContent({
				type: "buttonLink",
				attrs: { href: null, label: null, variant: "primary" },
			})
			.run();
	}, [editor]);

	const insertPlaceholderValue = useCallback(
		(value: { kind: string; label: string }) => {
			if (!editor) {
				return;
			}
			editor
				.chain()
				.focus()
				.insertContent({
					type: "placeholderValue",
					attrs: { kind: value.kind, label: value.label },
				})
				.run();
		},
		[editor],
	);

	/**
	 * Turns the selection into a link to something we own — or, with nothing selected, inserts the
	 * target's label as the link text, so a picked target always ends up readable.
	 *
	 * No href is stored: the reference is, and read paths resolve it to wherever the target currently
	 * lives.
	 */
	const linkTarget = useCallback(
		(attrs: Record<string, unknown>, label: string) => {
			if (!editor) {
				return;
			}

			const { from, to } = editor.state.selection;
			const chain = editor.chain().focus();

			if (from === to) {
				chain.insertContent({ type: "text", text: label, marks: [{ type: "link", attrs }] }).run();
				return;
			}

			if (editor.isActive("link")) {
				chain.extendMarkRange("link");
			}

			// `setMark` rather than `setLink`: the link extension's setter takes (and validates) an href,
			// and these links deliberately have none — the reference is the target.
			chain.setMark("link", attrs).run();
		},
		[editor],
	);

	const linkDocument = useCallback(
		(assetKey: string, label: string) => {
			linkTarget({ href: null, targetKind: "asset", assetKey }, label);
		},
		[linkTarget],
	);

	const linkEntity = useCallback(
		(entityId: string, label: string) => {
			linkTarget({ href: null, targetKind: "entity", entityId }, label);
		},
		[linkTarget],
	);

	const insertImage = useCallback(
		(
			imageKey: string,
			imageUrl: string,
			asset?: { alt?: string | null; caption?: JSONContent | null },
		) => {
			if (!editor) {
				return;
			}
			if (imageKey) {
				editor
					.chain()
					.focus()
					.insertContent({
						type: "assetImage",
						attrs: {
							imageKey,
							imageUrl,
							alt: asset?.alt ?? null,
							assetCaption: asset?.caption ?? null,
							captionMode: "inherit",
						},
					})
					.run();
			} else {
				editor.chain().focus().setImage({ src: imageUrl }).run();
			}
		},
		[editor],
	);

	if (editor == null) {
		return null;
	}

	return (
		<div
			className={twMerge("relative overflow-clip rounded-lg border border-input bg-bg", className)}
		>
			{isEditable ? (
				<div className="sticky inset-bs-0 z-10 flex flex-wrap items-center gap-0.5 border-be border-border bg-muted px-2 py-1.5">
					<RichTextEditorIconButton
						aria-label={t("Bold")}
						icon={BoldIcon}
						isActive={activeState?.isBold}
						onClick={() => {
							editor.chain().focus().toggleBold().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Italic")}
						icon={ItalicIcon}
						isActive={activeState?.isItalic}
						onClick={() => {
							editor.chain().focus().toggleItalic().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Code")}
						icon={CodeIcon}
						isActive={activeState?.isCode}
						onClick={() => {
							editor.chain().focus().toggleCode().run();
						}}
					/>
					<span className="mx-1 block-4 inline-px bg-border" />
					<RichTextEditorIconButton
						aria-label={t("Heading 2")}
						icon={Heading2Icon}
						isActive={activeState?.isHeading2}
						onClick={() => {
							editor.chain().focus().toggleHeading({ level: 2 }).run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Heading 3")}
						icon={Heading3Icon}
						isActive={activeState?.isHeading3}
						onClick={() => {
							editor.chain().focus().toggleHeading({ level: 3 }).run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Heading 4")}
						icon={Heading4Icon}
						isActive={activeState?.isHeading4}
						onClick={() => {
							editor.chain().focus().toggleHeading({ level: 4 }).run();
						}}
					/>
					<span className="mx-1 block-4 inline-px bg-border" />
					<RichTextEditorIconButton
						aria-label={t("Bullet List")}
						icon={ListIcon}
						isActive={activeState?.isBulletList}
						onClick={() => {
							editor.chain().focus().toggleBulletList().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Ordered List")}
						icon={ListOrderedIcon}
						isActive={activeState?.isOrderedList}
						onClick={() => {
							editor.chain().focus().toggleOrderedList().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Blockquote")}
						icon={QuoteIcon}
						isActive={activeState?.isBlockquote}
						onClick={() => {
							editor.chain().focus().toggleBlockquote().run();
						}}
					/>
					<span className="mx-1 block-4 inline-px bg-border" />
					<Popover>
						<Tooltip>
							<PopoverTrigger
								aria-label={t("Table")}
								className={twMerge(
									"relative inline-flex block-8 inline-8 cursor-pointer items-center justify-center rounded-md border-transparent bg-transparent transition-colors text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									activeState?.isInTable === true && "bg-primary-subtle/50 text-fg",
								)}
							>
								<TableIcon className="block-4 inline-4" />
							</PopoverTrigger>
							<TooltipContent inverse={true}>{t("Table")}</TooltipContent>
						</Tooltip>
						{/* The row and column commands act on the cell holding the cursor, so they are only
							    offered once the selection is inside a table. */}
						<PopoverContent className="flex inline-56 flex-col gap-1 p-2">
							{activeState?.isInTable === true ? (
								<>
									<TableCommandButton
										label={t("Toggle header row")}
										onPress={() => {
											editor.chain().focus().toggleHeaderRow().run();
										}}
									/>
									<TableCommandButton
										label={t("Add row above")}
										onPress={() => {
											editor.chain().focus().addRowBefore().run();
										}}
									/>
									<TableCommandButton
										label={t("Add row below")}
										onPress={() => {
											editor.chain().focus().addRowAfter().run();
										}}
									/>
									<TableCommandButton
										label={t("Delete row")}
										onPress={() => {
											editor.chain().focus().deleteRow().run();
										}}
									/>
									<span className="my-1 block-px inline-full bg-border" />
									<TableCommandButton
										label={t("Add column before")}
										onPress={() => {
											editor.chain().focus().addColumnBefore().run();
										}}
									/>
									<TableCommandButton
										label={t("Add column after")}
										onPress={() => {
											editor.chain().focus().addColumnAfter().run();
										}}
									/>
									<TableCommandButton
										label={t("Delete column")}
										onPress={() => {
											editor.chain().focus().deleteColumn().run();
										}}
									/>
									<span className="my-1 block-px inline-full bg-border" />
									<TableCommandButton
										label={t("Delete table")}
										onPress={() => {
											editor.chain().focus().deleteTable().run();
										}}
									/>
								</>
							) : (
								<TableCommandButton
									label={t("Insert table")}
									onPress={() => {
										editor
											.chain()
											.focus()
											.insertTable({ rows: 3, cols: 2, withHeaderRow: true })
											.run();
									}}
								/>
							)}
						</PopoverContent>
					</Popover>
					<span className="mx-1 block-4 inline-px bg-border" />
					<Popover isOpen={isLinkPopoverOpen} onOpenChange={handleLinkPopoverOpenChange}>
						<Tooltip>
							<PopoverTrigger
								aria-label={t("Link")}
								className={twMerge(
									"relative inline-flex block-8 inline-8 cursor-pointer items-center justify-center rounded-md border-transparent bg-transparent transition-colors text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									activeState?.isLink === true && "bg-primary-subtle/50 text-fg",
								)}
							>
								<LinkIcon className="block-4 inline-4" />
							</PopoverTrigger>
							<TooltipContent inverse={true}>{t("Link")}</TooltipContent>
						</Tooltip>
						<PopoverContent className="p-3">
							{activeState?.linkTargetKind != null ? (
								// These links hold a reference, not an href, so the url field would have nothing
								// to show and applying it would silently replace the target.
								<div className="flex inline-56 flex-col gap-2">
									<Note intent="info">
										{activeState.linkTargetKind === "asset"
											? t("This link points to a document.")
											: t("This link points to another page.")}
									</Note>
									<Button intent="outline" onPress={removeLink} size="sm" type="button">
										{t("Remove")}
									</Button>
								</div>
							) : (
								<form
									className="flex inline-56 flex-col gap-2"
									onSubmit={(e) => {
										e.preventDefault();
										applyLink();
									}}
								>
									<Input
										autoFocus={true}
										onChange={(e) => {
											setLinkHrefInput(e.target.value);
										}}
										placeholder="https://example.com"
										required={true}
										type="text"
										value={linkHrefInput}
									/>
									<div className="flex gap-2">
										<Button className="flex-1" intent="primary" size="sm" type="submit">
											{t("Apply")}
										</Button>
										{activeState?.isLink === true && (
											<Button intent="outline" onPress={removeLink} size="sm" type="button">
												{t("Remove")}
											</Button>
										)}
									</div>
								</form>
							)}
						</PopoverContent>
					</Popover>
					{renderImagePicker != null ? (
						<>
							<span className="mx-1 block-4 inline-px bg-border" />
							{renderImagePicker(insertImage)}
						</>
					) : null}
					{renderDocumentPicker != null ? renderDocumentPicker(linkDocument) : null}
					{renderEntityPicker != null ? renderEntityPicker(linkEntity) : null}
					{renderEmbedInsert != null ? (
						<>
							{renderImagePicker == null && renderDocumentPicker == null ? (
								<span className="mx-1 block-4 inline-px bg-border" />
							) : null}
							{renderEmbedInsert(insertEmbed)}
						</>
					) : null}
					{renderCalloutInsert != null ? renderCalloutInsert(insertCallout) : null}
					{renderMediaTextInsert != null ? renderMediaTextInsert(insertMediaText) : null}
					{renderButtonLinkInsert != null ? renderButtonLinkInsert(insertButtonLink) : null}
					{renderPlaceholderValueInsert != null
						? renderPlaceholderValueInsert(insertPlaceholderValue)
						: null}
				</div>
			) : null}
			{name != null && (
				<input
					name={name}
					type="hidden"
					value={JSON.stringify(editorJson ?? { type: "doc", content: [] })}
				/>
			)}
			<EditorContent editor={editor} />
		</div>
	);
}

interface RichTextRendererProps {
	content: JSONContent;
	className?: string;
}

export function RichTextRenderer(props: Readonly<RichTextRendererProps>): ReactNode {
	const { content, className } = props;

	return (
		<RichTextEditor
			className={cn("[&_.ProseMirror]:cursor-default", className)}
			content={content}
			isEditable={false}
		/>
	);
}
