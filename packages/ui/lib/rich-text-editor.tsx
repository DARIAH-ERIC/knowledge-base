"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import cn from "clsx/lite";
import {
	BoldIcon,
	CodeIcon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	ItalicIcon,
	LinkIcon,
	ListIcon,
	ListOrderedIcon,
	QuoteIcon,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { Button } from "@/lib/button";
import { Input } from "@/lib/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/lib/popover";

interface RichTextEditorProps {
	className?: string;
	content?: JSONContent;
	isEditable?: boolean;
	name?: string;
	onChange?: (content: JSONContent) => void;
}

interface RichTextEditorIconButtonProps {
	"aria-label": string;
	icon: React.ComponentType<{ className?: string }>;
	isActive?: boolean;
	onClick: () => void;
}

function RichTextEditorIconButton({
	"aria-label": ariaLabel,
	icon: Icon,
	isActive,
	onClick,
}: Readonly<RichTextEditorIconButtonProps>): ReactNode {
	return (
		<button
			aria-label={ariaLabel}
			className={twMerge(
				"relative inline-flex size-8 items-center justify-center rounded-md transition-colors text-muted-fg hover:text-fg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
				isActive === true && "bg-primary-subtle/50 text-fg",
			)}
			onClick={onClick}
			type="button"
		>
			<Icon className="size-4" />
		</button>
	);
}

export function RichTextEditor(props: Readonly<RichTextEditorProps>): ReactNode {
	const { content, onChange, isEditable = true, name, className } = props;

	const t = useExtracted("ui");

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				link: {
					openOnClick: false,
					defaultProtocol: "https",
				},
			}),
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
				isHeading1: ctx.editor?.isActive("heading", { level: 1 }),
				isHeading2: ctx.editor?.isActive("heading", { level: 2 }),
				isHeading3: ctx.editor?.isActive("heading", { level: 3 }),
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
	const savedSelection = useRef<{ from: number; to: number } | null>(null);

	const handleLinkPopoverOpenChange = useCallback(
		(open: boolean) => {
			if (open && editor) {
				savedSelection.current = {
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

		const sel = savedSelection.current;
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
		const sel = savedSelection.current;
		const chain = editor.chain().focus();
		if (sel) chain.setTextSelection(sel);
		chain.unsetLink().run();
		setIsLinkPopoverOpen(false);
	}, [editor]);

	if (editor == null) {
		return null;
	}

	return (
		<div
			className={twMerge(
				"relative overflow-hidden rounded-lg border border-input bg-bg",
				className,
			)}
		>
			{isEditable ? (
				<div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
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
						aria-label={t("Heading 1")}
						icon={Heading1Icon}
						isActive={activeState?.isHeading1}
						onClick={() => {
							return editor.chain().focus().toggleHeading({ level: 1 }).run();
						}}
					/>
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
						<PopoverTrigger
							aria-label={t("Link")}
							className={twMerge(
								"relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md border-transparent bg-transparent transition-colors text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								activeState?.isLink === true && "bg-primary-subtle/50 text-fg",
							)}
						>
							<LinkIcon className="size-4" />
						</PopoverTrigger>
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
