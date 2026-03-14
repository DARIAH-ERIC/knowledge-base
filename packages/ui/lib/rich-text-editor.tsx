"use client";

import type { JSONContent } from "@tiptap/react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReactNode } from "react";
import { useState, useRef, useCallback } from "react";
import {
	QuoteIcon,
	BoldIcon,
	ItalicIcon,
	ListIcon,
	ListOrderedIcon,
	Heading1Icon,
	Heading2Icon,
	Heading3Icon,
	CodeIcon,
	LinkIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import cn from "clsx/lite";
import { useExtracted } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/lib/popover";
import { Input } from "@/lib/input";
import { Button } from "@/lib/button";

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
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			className={twMerge(
				"relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors text-muted-fg hover:text-fg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
				isActive && "bg-primary-subtle/50 text-fg",
			)}
		>
			<Icon className="h-4 w-4" />
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
		onUpdate: () => {
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
		selector: (ctx) => ({
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
		}),
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

		if (sel && sel.from === sel.to && !activeState?.isLink) {
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
						onClick={() => editor.chain().focus().toggleBold().run()}
					/>
					<RichTextEditorIconButton
						aria-label={t("Italic")}
						icon={ItalicIcon}
						isActive={activeState?.isItalic}
						onClick={() => editor.chain().focus().toggleItalic().run()}
					/>
					<RichTextEditorIconButton
						aria-label={t("Code")}
						icon={CodeIcon}
						isActive={activeState?.isCode}
						onClick={() => editor.chain().focus().toggleCode().run()}
					/>
					<span className="mx-1 h-4 w-px bg-border" />
					<RichTextEditorIconButton
						aria-label={t("Heading 1")}
						icon={Heading1Icon}
						isActive={activeState?.isHeading1}
						onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
					/>
					<RichTextEditorIconButton
						aria-label={t("Heading 2")}
						icon={Heading2Icon}
						isActive={activeState?.isHeading2}
						onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
					/>
					<RichTextEditorIconButton
						aria-label={t("Heading 3")}
						icon={Heading3Icon}
						isActive={activeState?.isHeading3}
						onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
					/>
					<span className="mx-1 h-4 w-px bg-border" />
					<RichTextEditorIconButton
						aria-label={t("Bullet List")}
						icon={ListIcon}
						isActive={activeState?.isBulletList}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
					/>
					<RichTextEditorIconButton
						aria-label={t("Ordered List")}
						icon={ListOrderedIcon}
						isActive={activeState?.isOrderedList}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
					/>
					<RichTextEditorIconButton
						aria-label={t("Blockquote")}
						icon={QuoteIcon}
						isActive={activeState?.isBlockquote}
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
					/>
					<span className="mx-1 h-4 w-px bg-border" />
					<Popover isOpen={isLinkPopoverOpen} onOpenChange={handleLinkPopoverOpenChange}>
						<PopoverTrigger
							aria-label={t("Link")}
							className={twMerge(
								"relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-transparent bg-transparent transition-colors text-muted-fg hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								activeState?.isLink && "bg-primary-subtle/50 text-fg",
							)}
						>
							<LinkIcon className="h-4 w-4" />
						</PopoverTrigger>
						<PopoverContent className="p-3">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									applyLink();
								}}
								className="flex w-56 flex-col gap-2"
							>
								<Input
									autoFocus
									placeholder="https://example.com"
									required
									type="text"
									value={linkHrefInput}
									onChange={(e) => setLinkHrefInput(e.target.value)}
								/>
								<div className="flex gap-2">
									<Button className="flex-1" intent="primary" size="sm" type="submit">
										{t("Apply")}
									</Button>
									{activeState?.isLink && (
										<Button intent="outline" size="sm" type="button" onPress={removeLink}>
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
					type="hidden"
					name={name}
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
