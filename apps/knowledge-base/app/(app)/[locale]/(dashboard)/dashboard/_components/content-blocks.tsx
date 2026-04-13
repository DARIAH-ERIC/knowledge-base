/* eslint-disable react/jsx-no-literals */

"use client";

import type { ContentBlockTypes } from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { Checkbox } from "@dariah-eric/ui/checkbox";
import { Input } from "@dariah-eric/ui/input";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@dariah-eric/ui/menu";
import { NumberField, NumberInput } from "@dariah-eric/ui/number-field";
import { RichTextEditor, RichTextEditorToolbarButton } from "@dariah-eric/ui/rich-text-editor";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
} from "@dariah-eric/ui/select";
import { TextField } from "@dariah-eric/ui/text-field";
import { ToggleGroup, ToggleGroupItem } from "@dariah-eric/ui/toggle-group";
import {
	ChevronDownIcon,
	CodeBracketSquareIcon,
	PencilSquareIcon,
	PhotoIcon,
	PlusIcon,
	Square3Stack3DIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import { ImageIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { Fragment, type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { type Key, useDrag, useDrop } from "react-aria";
import {
	Button as AriaButton,
	Disclosure,
	DisclosureGroup,
	DisclosurePanel,
	Heading,
	useListData,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";

interface Asset {
	key: string;
	label: string;
	url: string;
}

export interface ContentBlock {
	id: Key;
	type: ContentBlockTypes["type"];
	position?: number;
	content?: JSONContent;
}

export interface ContentBlocksProps {
	initialAssets?: Array<Asset>;
	items: Array<ContentBlock>;
}

// Stable ID for the shared keyboard-shortcut description element.
const DRAG_HANDLE_DESCRIPTION_ID = "content-blocks-drag-handle-description";

export function ContentBlocks({
	initialAssets,
	items: initialItems,
}: Readonly<ContentBlocksProps>): ReactNode {
	const t = useExtracted();

	const list = useListData<ContentBlock>({
		initialItems,
		getKey(item) {
			return item.id;
		},
	});

	const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(() => {
		return new Set(
			initialItems.map((item) => {
				return String(item.id);
			}),
		);
	});

	const addItem = (type: ContentBlock["type"]) => {
		const newItem: ContentBlock = {
			id: crypto.randomUUID(),
			type,
		};
		list.append(newItem);
		setExpandedKeys((prev) => {
			return new Set([...prev, String(newItem.id)]);
		});
	};

	function handleKeyboardReorder(e: KeyboardEvent<HTMLButtonElement>, id: Key) {
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		e.preventDefault();
		const idx = list.items.findIndex((item) => {
			return item.id === id;
		});
		if (e.key === "ArrowUp" && idx > 0) {
			list.moveBefore(list.items[idx - 1]!.id, [id]);
		} else if (e.key === "ArrowDown" && idx < list.items.length - 1) {
			list.moveAfter(list.items[idx + 1]!.id, [id]);
		}
	}

	function handleReorder(sourceIdStr: string, targetId: Key, position: "before" | "after") {
		// getText() always returns a string; look up the actual Key to avoid type mismatches.
		const sourceItem = list.items.find((item) => {
			return String(item.id) === sourceIdStr;
		});
		if (sourceItem == null || sourceItem.id === targetId) return;
		if (position === "before") {
			list.moveBefore(targetId, [sourceItem.id]);
		} else {
			list.moveAfter(targetId, [sourceItem.id]);
		}
	}

	return (
		<Fragment>
			<span className="sr-only" id={DRAG_HANDLE_DESCRIPTION_ID}>
				{t("Press ArrowUp or ArrowDown to reorder")}
			</span>
			<DisclosureGroup
				allowsMultipleExpanded={true}
				className="flex flex-col gap-y-1"
				expandedKeys={expandedKeys}
				onExpandedChange={(keys) => {
					setExpandedKeys(keys);
				}}
			>
				{list.items.map((item) => {
					return (
						<ContentBlockItem
							key={String(item.id)}
							initialAssets={initialAssets}
							item={item}
							onDelete={() => {
								list.remove(item.id);
								setExpandedKeys((prev) => {
									const next = new Set(prev);
									next.delete(String(item.id));
									return next;
								});
							}}
							onKeyboardReorder={handleKeyboardReorder}
							onReorder={handleReorder}
							onUpdate={(content) => {
								list.update(item.id, { ...item, content });
							}}
						/>
					);
				})}
			</DisclosureGroup>
			{list.items.map((item, idx) => {
				return (
					<input
						key={item.id}
						name={`contentBlocks.${String(idx)}`}
						type="hidden"
						value={JSON.stringify(item)}
					/>
				);
			})}
			<ContentBlockMenu onAdd={addItem} />
		</Fragment>
	);
}

interface ContentBlockItemProps {
	initialAssets?: Array<Asset>;
	item: ContentBlock;
	onDelete: () => void;
	onReorder: (sourceIdStr: string, targetId: Key, position: "before" | "after") => void;
	onUpdate: (content: JSONContent) => void;
	onKeyboardReorder: (e: KeyboardEvent<HTMLButtonElement>, id: Key) => void;
}

function ContentBlockItem({
	initialAssets,
	item,
	onDelete,
	onReorder,
	onUpdate,
	onKeyboardReorder,
}: Readonly<ContentBlockItemProps>): ReactNode {
	const t = useExtracted();
	const dropRef = useRef<HTMLDivElement>(null);
	const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);

	// useDrag / useDrop coordinate via a shared DragManager global — no provider needed.
	// hasDragButton: true separates native drag events (dragProps → header div, for mouse)
	// from keyboard/screen reader activation (dragButtonProps.onPress → handle button,
	// which calls DragManager.beginDragging() enabling Tab-between-targets keyboard flow).
	const { dragProps, dragButtonProps, isDragging } = useDrag({
		hasDragButton: true,
		getItems() {
			return [{ "text/plain": String(item.id) }];
		},
		getAllowedDropOperations() {
			return ["move"];
		},
	});

	// DropEvent x/y are already relative to the target element (confirmed in @react-types/shared).
	// Use the approximate header height as the threshold so that tall expanded panels
	// don't push the "insert before" zone out of reach.
	const HEADER_HEIGHT = 48;
	function computeDropPosition(y: number): "before" | "after" {
		const height = dropRef.current?.getBoundingClientRect().height ?? 96;
		return y < Math.min(HEADER_HEIGHT, height / 2) ? "before" : "after";
	}

	// useDrop registers this element with DragManager.registerDropTarget(), which wires up
	// Tab navigation between drop targets during an active keyboard drag automatically.
	const { dropProps, isDropTarget } = useDrop({
		ref: dropRef,
		getDropOperation() {
			return "move";
		},
		onDropEnter(e) {
			setDropPosition(computeDropPosition(e.y));
		},
		onDropMove(e) {
			setDropPosition(computeDropPosition(e.y));
		},
		onDropExit() {
			setDropPosition(null);
		},
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		async onDrop(e) {
			// Capture position before clearing — onDrop is async.
			const position = dropPosition ?? "after";
			setDropPosition(null);
			for (const dragItem of e.items) {
				if (dragItem.kind === "text" && dragItem.types.has("text/plain")) {
					const sourceId = await dragItem.getText("text/plain");
					onReorder(sourceId, item.id, position);
				}
			}
		},
	});

	const contentBlockTypeNames: Record<ContentBlockTypes["type"], string> = {
		data: t("Data"),
		embed: t("Embed"),
		image: t("Image"),
		rich_text: t("Rich text"),
	};

	const contentBlockTypeIcons: Record<ContentBlockTypes["type"], ReactNode> = {
		data: <Square3Stack3DIcon className="size-4 shrink-0" />,
		embed: <CodeBracketSquareIcon className="size-4 shrink-0" />,
		image: <PhotoIcon className="size-4 shrink-0" />,
		rich_text: <PencilSquareIcon className="size-4 shrink-0" />,
	};

	return (
		<>
			{isDropTarget && dropPosition === "before" && (
				<div aria-hidden={true} className="mx-1 h-0.5 rounded-full bg-accent" />
			)}
			{/* tabIndex={-1} makes the element programmatically focusable for DragManager
			    keyboard navigation without adding it to the natural tab order. */}
			<div ref={dropRef} tabIndex={-1} {...dropProps}>
				<Disclosure
					className={twMerge(
						"group inset-ring inset-ring-border rounded-lg transition-opacity",
						isDragging && "opacity-50",
					)}
					id={String(item.id)}
				>
					{/* dragProps (draggable + native drag events) on the header div restricts
					    mouse-initiated drags to the header area, keeping the editor panel clear. */}
					<div className="flex items-center gap-x-2 px-3 py-2.5" {...dragProps}>
						<AriaButton
							aria-describedby={[dragButtonProps["aria-describedby"], DRAG_HANDLE_DESCRIPTION_ID]
								.filter(Boolean)
								.join(" ")}
							aria-label={t("Drag to reorder")}
							className="cursor-grab touch-none text-muted-fg"
							onKeyDown={(e) => {
								onKeyboardReorder(e, item.id);
							}}
							onPress={dragButtonProps.onPress}
						>
							<svg
								className="size-5 text-muted-fg sm:size-4"
								fill="none"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M11 5.5C11 6.32843 10.3284 7 9.5 7C8.67157 7 8 6.32843 8 5.5C8 4.67157 8.67157 4 9.5 4C10.3284 4 11 4.67157 11 5.5Z"
									fill="currentColor"
								/>
								<path
									d="M16 5.5C16 6.32843 15.3284 7 14.5 7C13.6716 7 13 6.32843 13 5.5C13 4.67157 13.6716 4 14.5 4C15.3284 4 16 4.67157 16 5.5Z"
									fill="currentColor"
								/>
								<path
									d="M11 18.5C11 19.3284 10.3284 20 9.5 20C8.67157 20 8 19.3284 8 18.5C8 17.6716 8.67157 17 9.5 17C10.3284 17 11 17.6716 11 18.5Z"
									fill="currentColor"
								/>
								<path
									d="M16 18.5C16 19.3284 15.3284 20 14.5 20C13.6716 20 13 19.3284 13 18.5C13 17.6716 13.6716 17 14.5 17C15.3284 17 16 17.6716 16 18.5Z"
									fill="currentColor"
								/>
								<path
									d="M11 12C11 12.8284 10.3284 13.5 9.5 13.5C8.67157 13.5 8 12.8284 8 12C8 11.1716 8.67157 10.5 9.5 10.5C10.3284 10.5 11 11.1716 11 12Z"
									fill="currentColor"
								/>
								<path
									d="M16 12C16 12.8284 15.3284 13.5 14.5 13.5C13.6716 13.5 13 12.8284 13 12C13 11.1716 13.6716 10.5 14.5 10.5C15.3284 10.5 16 11.1716 16 12Z"
									fill="currentColor"
								/>
							</svg>
						</AriaButton>
						<Heading className="flex flex-1 items-center">
							<AriaButton
								className="flex flex-1 items-center gap-x-2 text-left text-sm/6 font-medium outline-hidden"
								slot="trigger"
							>
								{contentBlockTypeIcons[item.type]}
								<span className="flex-1">{contentBlockTypeNames[item.type]}</span>
								<ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-expanded:rotate-180" />
							</AriaButton>
						</Heading>
						<AriaButton
							aria-label={t("Remove block")}
							className="shrink-0 text-muted-fg rounded-sm hover:text-danger focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
							onPress={onDelete}
						>
							<TrashIcon className="size-4" />
						</AriaButton>
					</div>
					<DisclosurePanel className="px-3 pb-3">
						<ContentBlockPanel initialAssets={initialAssets} item={item} onChange={onUpdate} />
					</DisclosurePanel>
				</Disclosure>
			</div>
			{isDropTarget && dropPosition === "after" && (
				<div aria-hidden={true} className="mx-1 h-0.5 rounded-full bg-accent" />
			)}
		</>
	);
}

interface ContentBlockPanelProps {
	initialAssets?: Array<Asset>;
	item: ContentBlock;
	onChange: (content: JSONContent) => void;
}

function ContentBlockPanel({
	initialAssets,
	item,
	onChange,
}: Readonly<ContentBlockPanelProps>): ReactNode {
	switch (item.type) {
		case "data": {
			return <DataContentBlockPanel item={item} onChange={onChange} />;
		}
		case "embed": {
			return <EmbedContentBlockPanel item={item} onChange={onChange} />;
		}
		case "image": {
			return (
				<ImageContentBlockPanel initialAssets={initialAssets} item={item} onChange={onChange} />
			);
		}
		case "rich_text": {
			return (
				<RichTextEditor
					className="w-full"
					content={item.content}
					onChange={onChange}
					renderImagePicker={
						initialAssets != null
							? (insert: (src: string) => void) => {
									return (
										<MediaLibraryDialog
											defaultPrefix="images"
											initialAssets={initialAssets}
											onSelect={(_key, url) => {
												insert(url);
											}}
											prefixes={["avatars", "images", "logos"]}
											trigger={({ open }) => {
												return (
													<RichTextEditorToolbarButton
														aria-label="Insert image"
														icon={ImageIcon}
														onClick={open}
													/>
												);
											}}
										/>
									);
								}
							: undefined
					}
				/>
			);
		}
		default: {
			return null;
		}
	}
}

interface ContentBlockEntry {
	id: string;
	title: string;
}

interface DataContentBlockPanelProps {
	item: ContentBlock;
	onChange: (content: JSONContent) => void;
}

function DataContentBlockPanel({
	item,
	onChange,
}: Readonly<DataContentBlockPanelProps>): ReactNode {
	const t = useExtracted();

	const dataType = item.content?.dataType as "events" | "news" | undefined;
	// selectedIds === undefined → recent mode; selectedIds is an array → explicit mode
	const selectedIds = item.content?.selectedIds as Array<string> | undefined;
	const isExplicit = selectedIds !== undefined;
	const limit = item.content?.limit as number | undefined;

	const [query, setQuery] = useState("");
	const [entries, setEntries] = useState<Array<ContentBlockEntry>>([]);

	async function fetchEntries(type: "events" | "news", q: string) {
		const params = new URLSearchParams({ type, limit: "20" });
		if (q.trim() !== "") params.set("q", q.trim());
		const res = await fetch(`/api/content-block-entries?${params.toString()}`);
		const data = (await res.json()) as { items: Array<ContentBlockEntry> };
		setEntries(data.items);
	}

	return (
		<div className="flex flex-col gap-y-4">
			<Select
				aria-label={t("Data type")}
				onChange={(key) => {
					onChange({ ...item.content, dataType: key as "events" | "news", selectedIds: undefined });
					setQuery("");
					setEntries([]);
				}}
				value={dataType ?? null}
			>
				<SelectTrigger />
				<SelectContent
					items={[
						{ id: "events", name: t("Events") },
						{ id: "news", name: t("News") },
					]}
				>
					{(entry) => {
						return (
							<SelectItem id={entry.id} textValue={entry.name}>
								<SelectLabel>{entry.name}</SelectLabel>
							</SelectItem>
						);
					}}
				</SelectContent>
			</Select>

			{dataType != null && (
				<ToggleGroup
					aria-label={t("Selection mode")}
					disallowEmptySelection={true}
					onSelectionChange={(keys) => {
						const key = [...keys][0];
						if (key === "explicit") {
							onChange({ ...item.content, selectedIds: [], limit: undefined });
							setQuery("");
							void fetchEntries(dataType, "");
						} else {
							onChange({ ...item.content, selectedIds: undefined, limit: limit ?? 5 });
							setQuery("");
							setEntries([]);
						}
					}}
					selectedKeys={isExplicit ? new Set(["explicit"]) : new Set(["recent"])}
					selectionMode="single"
				>
					<ToggleGroupItem id="recent">{t("Most recent")}</ToggleGroupItem>
					<ToggleGroupItem id="explicit">{t("Explicit selection")}</ToggleGroupItem>
				</ToggleGroup>
			)}

			{dataType != null && !isExplicit && (
				<NumberField
					aria-label={t("Number of entries")}
					maxValue={50}
					minValue={1}
					onChange={(value) => {
						onChange({ ...item.content, limit: value });
					}}
					value={limit ?? 5}
				>
					<NumberInput />
				</NumberField>
			)}

			{dataType != null && isExplicit && (
				<div className="flex flex-col gap-y-3">
					<SearchField
						aria-label={t("Search")}
						onChange={(q) => {
							setQuery(q);
							void fetchEntries(dataType, q);
						}}
						value={query}
					>
						<SearchInput />
					</SearchField>
					<div className="flex max-h-64 flex-col gap-y-2 overflow-y-auto rounded-lg border border-border p-2">
						{entries.length === 0 ? (
							<p className="px-2 py-1 text-sm text-muted-fg">
								{query.trim() !== "" ? t("No entries found.") : t("Search to browse entries.")}
							</p>
						) : (
							entries.map((entry) => {
								return (
									<Checkbox
										key={entry.id}
										// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
										isSelected={selectedIds?.includes(entry.id) ?? false}
										onChange={(checked) => {
											const next = checked
												? // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
													[...(selectedIds ?? []), entry.id]
												: // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
													(selectedIds ?? []).filter((id) => {
														return id !== entry.id;
													});
											onChange({ ...item.content, selectedIds: next });
										}}
									>
										{entry.title}
									</Checkbox>
								);
							})
						)}
					</div>
					{/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
					{selectedIds != null && selectedIds.length > 0 && (
						<p className="text-xs text-muted-fg">
							{selectedIds.length} {t("selected")}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

// Normalises watch/share URLs to embed format and uses youtube-nocookie for privacy.
function getEmbedUrl(url: string): string {
	const watchMatch = /youtube\.com\/watch\?.*?v=([\w-]+)/.exec(url);
	if (watchMatch != null) return `https://www.youtube-nocookie.com/embed/${watchMatch[1]!}`;

	const shortMatch = /youtu\.be\/([\w-]+)/.exec(url);
	if (shortMatch != null) return `https://www.youtube-nocookie.com/embed/${shortMatch[1]!}`;

	return url;
}

interface EmbedContentBlockPanelProps {
	item: ContentBlock;
	onChange: (content: JSONContent) => void;
}

function EmbedContentBlockPanel({
	item,
	onChange,
}: Readonly<EmbedContentBlockPanelProps>): ReactNode {
	const t = useExtracted();

	const url = item.content?.url as string | undefined;
	const title = item.content?.title as string | undefined;
	const caption = item.content?.caption as string | undefined;

	const embedUrl = url != null && url.trim() !== "" ? getEmbedUrl(url.trim()) : null;

	return (
		<div className="flex flex-col gap-y-4">
			<TextField
				aria-label={t("URL")}
				isRequired={true}
				onChange={(value) => {
					onChange({ ...item.content, url: value });
				}}
				value={url ?? ""}
			>
				<Input placeholder="https://" />
			</TextField>
			<TextField
				aria-label={t("Title")}
				isRequired={true}
				onChange={(value) => {
					onChange({ ...item.content, title: value });
				}}
				value={title ?? ""}
			>
				<Input placeholder={t("Descriptive title for screen readers")} />
			</TextField>
			<TextField
				aria-label={t("Caption")}
				onChange={(value) => {
					onChange({ ...item.content, caption: value });
				}}
				value={caption ?? ""}
			>
				<Input placeholder={t("Caption (optional)")} />
			</TextField>
			{embedUrl != null && (
				<div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
					<iframe
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen={true}
						className="size-full"
						sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
						src={embedUrl}
						title={title ?? embedUrl}
					/>
				</div>
			)}
		</div>
	);
}

interface ImageContentBlockPanelProps {
	initialAssets?: Array<Asset>;
	item: ContentBlock;
	onChange: (content: JSONContent) => void;
}

function ImageContentBlockPanel({
	initialAssets,
	item,
	onChange,
}: Readonly<ImageContentBlockPanelProps>): ReactNode {
	const t = useExtracted();

	const imageKey = item.content?.imageKey as string | undefined;
	const imageUrl = item.content?.imageUrl as string | undefined;
	const caption = item.content?.caption as string | undefined;

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-start gap-x-4">
				{imageUrl != null && (
					<img
						alt={caption ?? t("Selected image")}
						className="size-24 rounded-lg object-cover shrink-0"
						src={imageUrl}
					/>
				)}
				<MediaLibraryDialog
					defaultPrefix="images"
					initialAssets={initialAssets ?? []}
					onSelect={(key, url) => {
						onChange({ ...item.content, imageKey: key, imageUrl: url });
					}}
					prefixes={["avatars", "images", "logos"]}
				/>
				{imageKey != null && (
					<input name="imageContentBlock.imageKey" type="hidden" value={imageKey} />
				)}
			</div>
			<TextField
				aria-label={t("Caption")}
				onChange={(value) => {
					onChange({ ...item.content, caption: value });
				}}
				value={caption ?? ""}
			>
				<Input placeholder={t("Caption (optional)")} />
			</TextField>
		</div>
	);
}

interface ContentBlockMenuProps {
	onAdd: (type: ContentBlock["type"]) => void;
}

export function ContentBlockMenu({ onAdd }: Readonly<ContentBlockMenuProps>): ReactNode {
	const t = useExtracted();

	const contentBlockTypeNames: Record<ContentBlockTypes["type"], string> = {
		data: t("Data"),
		embed: t("Embed"),
		image: t("Image"),
		rich_text: t("Rich text"),
	};

	return (
		<Menu>
			<Button intent="secondary">
				<PlusIcon />
				Add block
			</Button>
			<MenuContent className="min-w-60" placement="bottom">
				{Object.entries(contentBlockTypeNames).map(([key, value]) => {
					return (
						<MenuItem
							key={key}
							onAction={() => {
								onAdd(key as ContentBlock["type"]);
							}}
						>
							{
								{
									data: <Square3Stack3DIcon />,
									embed: <CodeBracketSquareIcon />,
									image: <PhotoIcon />,
									rich_text: <PencilSquareIcon />,
								}[key]
							}
							<MenuLabel>{value}</MenuLabel>
						</MenuItem>
					);
				})}
			</MenuContent>
		</Menu>
	);
}
