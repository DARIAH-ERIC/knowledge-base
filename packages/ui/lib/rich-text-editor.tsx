"use client";

import { type JSONContent, mergeAttributes, Node } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import {
	EditorContent,
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
	Trash2Icon,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import { Button as ButtonPrimitive } from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { Button } from "@/lib/button";
import { Input } from "@/lib/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/lib/popover";
import { Tooltip, TooltipContent } from "@/lib/tooltip";

interface RichTextEditorProps {
	"aria-label"?: string;
	className?: string;
	content?: JSONContent;
	isEditable?: boolean;
	name?: string;
	onChange?: (content: JSONContent) => void;
	renderEmbedInsert?: (insertEmbed: () => void) => ReactNode;
	renderImagePicker?: (insert: (imageKey: string, imageUrl: string) => void) => ReactNode;
}

export interface RichTextEditorToolbarButtonProps {
	"aria-label": string;
	icon: React.ComponentType<{ className?: string }>;
	isActive?: boolean;
	onClick: () => void;
}

export function RichTextEditorToolbarButton({
	"aria-label": ariaLabel,
	icon: Icon,
	isActive,
	onClick,
}: Readonly<RichTextEditorToolbarButtonProps>): ReactNode {
	return (
		<Tooltip>
			<ButtonPrimitive
				aria-label={ariaLabel}
				className={twMerge(
					"relative inline-flex size-8 items-center justify-center rounded-md transition-colors text-muted-fg hover:text-fg focus:outline-none focus:ring-2 focus:ring-ring",
					isActive === true && "bg-primary-subtle/50 text-fg",
				)}
				onPress={() => {
					onClick();
				}}
				type="button"
			>
				<Icon className="size-4" />
			</ButtonPrimitive>
			<TooltipContent inverse={true}>{ariaLabel}</TooltipContent>
		</Tooltip>
	);
}

// Keep the internal alias for backward-compat within this file.
const RichTextEditorIconButton = RichTextEditorToolbarButton;

function getEmbedUrl(url: string): string {
	const watchMatch = /youtube\.com\/watch\?.*?v=([\w-]+)/.exec(url);
	if (watchMatch != null) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]!}`;
	const shortMatch = /youtu\.be\/([\w-]+)/.exec(url);
	if (shortMatch != null) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]!}`;
	return url;
}

function EmbedNodeView({ node, updateAttributes, deleteNode }: Readonly<NodeViewProps>): ReactNode {
	const url = node.attrs.url as string | null;
	const title = node.attrs.title as string | null;
	const caption = node.attrs.caption as string | null;

	const [isEditing, setIsEditing] = useState(url == null);
	const [urlInput, setUrlInput] = useState(url ?? "");
	const [titleInput, setTitleInput] = useState(title ?? "");
	const [captionInput, setCaptionInput] = useState(caption ?? "");

	function handleApply() {
		if (!urlInput.trim() || !titleInput.trim()) return;
		updateAttributes({
			url: urlInput.trim(),
			title: titleInput.trim(),
			caption: captionInput.trim() || null,
		});
		setIsEditing(false);
	}

	const embedUrl = url != null ? getEmbedUrl(url) : null;

	const urlInputId = useId();
	const titleInputId = useId();
	const captionInputId = useId();

	return (
		<NodeViewWrapper>
			<div
				className="my-2 overflow-clip rounded-lg border border-input bg-bg"
				contentEditable={false}
			>
				{isEditing ? (
					<div className="flex flex-col gap-y-3 p-4">
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
							<label className="text-sm/6 font-medium" htmlFor={captionInputId}>
								{"Caption"}
							</label>
							<Input
								id={captionInputId}
								onChange={(e) => {
									setCaptionInput(e.target.value);
								}}
								type="text"
								value={captionInput}
							/>
						</div>
						<div className="flex items-center gap-x-2">
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
							<div className="aspect-video w-full">
								<iframe
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									allowFullScreen={true}
									className="size-full"
									referrerPolicy="strict-origin-when-cross-origin"
									sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
									src={embedUrl}
									title={title ?? embedUrl}
								/>
							</div>
						)}
						<div className="flex items-center justify-between gap-x-2 border-t border-border px-4 py-2">
							<span className="min-w-0 truncate text-xs text-muted-fg">{url}</span>
							<div className="flex shrink-0 gap-x-1">
								<button
									aria-label="Edit embed"
									className="rounded-sm p-1 text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={() => {
										setUrlInput(url ?? "");
										setTitleInput(title ?? "");
										setCaptionInput(caption ?? "");
										setIsEditing(true);
									}}
									type="button"
								>
									<PencilIcon className="size-3.5" />
								</button>
								<button
									aria-label="Remove embed"
									className="rounded-sm p-1 text-muted-fg hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									onClick={deleteNode}
									type="button"
								>
									<Trash2Icon className="size-3.5" />
								</button>
							</div>
						</div>
						{caption != null && caption !== "" && (
							<p className="border-t border-border px-4 py-2 text-sm text-muted-fg">{caption}</p>
						)}
					</div>
				)}
			</div>
		</NodeViewWrapper>
	);
}

/**
 * Block-level embed node (YouTube, iframes). Stores url/title/caption and
 * renders an inline editing UI via a React NodeView.
 */
export const EmbedNode = Node.create({
	name: "embedBlock",
	group: "block",
	atom: true,
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
						caption: el.dataset.caption,
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
				"data-caption": node.attrs.caption as string | null,
			},
		];
	},

	addNodeView() {
		return ReactNodeViewRenderer(EmbedNodeView);
	},
});

/**
 * Block-level image node that stores an asset key for referential integrity.
 * Used in the unified content editor; distinct from the plain `Image` extension
 * which is used for images embedded directly in rich text (e.g. accordion items).
 */
export const AssetImage = Node.create({
	name: "assetImage",
	group: "block",
	atom: true,

	addAttributes() {
		return {
			imageKey: { default: null },
			imageUrl: { default: null },
			caption: { default: null },
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
						caption: el.dataset.caption,
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
					"data-asset-image": "",
					"data-image-key": node.attrs.imageKey as string | null,
				},
				node.attrs.caption != null ? { "data-caption": node.attrs.caption as string } : {},
			),
		];
	},
});

export function RichTextEditor(props: Readonly<RichTextEditorProps>): ReactNode {
	const {
		"aria-label": ariaLabel,
		content,
		onChange,
		isEditable = true,
		name,
		className,
		renderEmbedInsert,
		renderImagePicker,
	} = props;

	const t = useExtracted("ui");

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: { levels: [2, 3, 4] },
				link: {
					openOnClick: false,
					defaultProtocol: "https",
				},
			}),
			Image,
			AssetImage,
			EmbedNode,
		],
		content,
		editable: isEditable,
		immediatelyRender: false,
		onUpdate() {
			if (editor) {
				const json = editor.getJSON();
				setEditorJson(json);
				onChange?.(json);
			}
		},
		editorProps: {
			attributes: {
				class: "richtext max-w-none focus:outline-none px-4 py-3 min-h-37.5",
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
				linkHref: ctx.editor?.getAttributes("link").href as string | undefined,
			};
		},
	});

	const [editorJson, setEditorJson] = useState<JSONContent | undefined>(content);

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
		if (!editor) return;
		const href = linkHrefInput.trim();
		if (!href) return;

		const sel = savedSelectionRef.current;
		const chain = editor.chain().focus();
		if (sel) chain.setTextSelection(sel);

		if (sel && sel.from === sel.to && !(activeState?.isLink ?? false)) {
			chain
				.insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
				.run();
		} else {
			chain.setLink({ href }).run();
		}

		setIsLinkPopoverOpen(false);
	}, [editor, linkHrefInput, activeState?.isLink]);

	const removeLink = useCallback(() => {
		if (!editor) return;
		const sel = savedSelectionRef.current;
		const chain = editor.chain().focus();
		if (sel) chain.setTextSelection(sel);
		chain.unsetLink().run();
		setIsLinkPopoverOpen(false);
	}, [editor]);

	const insertEmbed = useCallback(() => {
		if (!editor) return;
		editor
			.chain()
			.focus()
			.insertContent({ type: "embedBlock", attrs: { url: null, title: null, caption: null } })
			.run();
	}, [editor]);

	const insertImage = useCallback(
		(imageKey: string, imageUrl: string) => {
			if (!editor) return;
			if (imageKey) {
				editor
					.chain()
					.focus()
					.insertContent({ type: "assetImage", attrs: { imageKey, imageUrl } })
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
				<div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-muted px-2 py-1.5">
					<RichTextEditorIconButton
						aria-label={t("Bold")}
						icon={BoldIcon}
						isActive={activeState?.isBold}
						onClick={() => {
							return editor.chain().focus().toggleBold().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Italic")}
						icon={ItalicIcon}
						isActive={activeState?.isItalic}
						onClick={() => {
							return editor.chain().focus().toggleItalic().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Code")}
						icon={CodeIcon}
						isActive={activeState?.isCode}
						onClick={() => {
							return editor.chain().focus().toggleCode().run();
						}}
					/>
					<span className="mx-1 h-4 w-px bg-border" />
					<RichTextEditorIconButton
						aria-label={t("Heading 2")}
						icon={Heading2Icon}
						isActive={activeState?.isHeading2}
						onClick={() => {
							return editor.chain().focus().toggleHeading({ level: 2 }).run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Heading 3")}
						icon={Heading3Icon}
						isActive={activeState?.isHeading3}
						onClick={() => {
							return editor.chain().focus().toggleHeading({ level: 3 }).run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Heading 4")}
						icon={Heading4Icon}
						isActive={activeState?.isHeading4}
						onClick={() => {
							return editor.chain().focus().toggleHeading({ level: 4 }).run();
						}}
					/>
					<span className="mx-1 h-4 w-px bg-border" />
					<RichTextEditorIconButton
						aria-label={t("Bullet List")}
						icon={ListIcon}
						isActive={activeState?.isBulletList}
						onClick={() => {
							return editor.chain().focus().toggleBulletList().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Ordered List")}
						icon={ListOrderedIcon}
						isActive={activeState?.isOrderedList}
						onClick={() => {
							return editor.chain().focus().toggleOrderedList().run();
						}}
					/>
					<RichTextEditorIconButton
						aria-label={t("Blockquote")}
						icon={QuoteIcon}
						isActive={activeState?.isBlockquote}
						onClick={() => {
							return editor.chain().focus().toggleBlockquote().run();
						}}
					/>
					<span className="mx-1 h-4 w-px bg-border" />
					<Popover isOpen={isLinkPopoverOpen} onOpenChange={handleLinkPopoverOpenChange}>
						<Tooltip>
							<PopoverTrigger
								aria-label={t("Link")}
								className={twMerge(
									"relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-transparent bg-transparent transition-colors text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									activeState?.isLink === true && "bg-primary-subtle/50 text-fg",
								)}
							>
								<LinkIcon className="size-4" />
							</PopoverTrigger>
							<TooltipContent inverse={true}>{t("Link")}</TooltipContent>
						</Tooltip>
						<PopoverContent className="p-3">
							<form
								className="flex w-56 flex-col gap-2"
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
						</PopoverContent>
					</Popover>
					{renderImagePicker != null ? (
						<>
							<span className="mx-1 h-4 w-px bg-border" />
							{renderImagePicker(insertImage)}
						</>
					) : null}
					{renderEmbedInsert != null ? (
						<>
							{renderImagePicker == null ? <span className="mx-1 h-4 w-px bg-border" /> : null}
							{renderEmbedInsert(insertEmbed)}
						</>
					) : null}
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
