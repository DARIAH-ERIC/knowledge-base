/* eslint-disable react/jsx-no-literals */

"use client";

import type { ContentBlockTypes } from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@dariah-eric/ui/menu";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import {
	ChevronDownIcon,
	CodeBracketSquareIcon,
	PencilSquareIcon,
	PhotoIcon,
	PlusIcon,
	Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import {
	type DragEvent,
	Fragment,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import type { Key } from "react-aria";
import {
	Button as AriaButton,
	Disclosure,
	DisclosureGroup,
	DisclosurePanel,
	Heading,
	useListData,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

export interface ContentBlock {
	id: Key;
	type: ContentBlockTypes["type"];
	position?: number;
	content?: JSONContent;
}

export interface ContentBlocksProps {
	items: Array<ContentBlock>;
}

interface DropTarget {
	id: Key;
	position: "before" | "after";
}

export function ContentBlocks({ items: initialItems }: Readonly<ContentBlocksProps>): ReactNode {
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
	const [draggingId, setDraggingId] = useState<Key | null>(null);
	const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

	// Refs shadow the state values so event handlers can read the latest value
	// without stale closures and without triggering re-renders on every mousemove.
	const draggingIdRef = useRef<Key | null>(null);
	const dropTargetRef = useRef<DropTarget | null>(null);

	const addItem = (type: ContentBlock["type"]) => {
		const newItem: ContentBlock = {
			id: crypto.randomUUID(),
			type,
			content: {},
		};
		list.append(newItem);
		setExpandedKeys((prev) => {
			return new Set([...prev, String(newItem.id)]);
		});
	};

	// Use the approximate header height as the threshold instead of the full item
	// midpoint — otherwise, expanded panels (e.g. a tall rich text editor) push
	// the "insert before" zone out of reach.
	function getDropPosition(e: DragEvent<HTMLElement>): "before" | "after" {
		const rect = e.currentTarget.getBoundingClientRect();
		const HEADER_HEIGHT = 48;
		const threshold = rect.top + Math.min(HEADER_HEIGHT, rect.height / 2);
		return e.clientY < threshold ? "before" : "after";
	}

	function handleDragStart(id: Key) {
		draggingIdRef.current = id;
		setDraggingId(id);
	}

	function handleDragEnd() {
		draggingIdRef.current = null;
		dropTargetRef.current = null;
		setDraggingId(null);
		setDropTarget(null);
	}

	function handleDragOver(e: DragEvent<HTMLElement>, targetId: Key) {
		e.preventDefault();
		const position = getDropPosition(e);
		const current = dropTargetRef.current;
		// Only update state when the target actually changes to avoid re-rendering
		// on every mousemove while hovering over the same position.
		if (current?.id !== targetId || current.position !== position) {
			const next = { id: targetId, position };
			dropTargetRef.current = next;
			setDropTarget(next);
		}
	}

	function handleDrop(e: DragEvent<HTMLElement>, targetId: Key) {
		e.preventDefault();
		const id = draggingIdRef.current;
		draggingIdRef.current = null;
		dropTargetRef.current = null;
		setDraggingId(null);
		setDropTarget(null);
		if (id == null || id === targetId) return;
		if (getDropPosition(e) === "before") {
			list.moveBefore(targetId, [id]);
		} else {
			list.moveAfter(targetId, [id]);
		}
	}

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

	const dragHandleDescriptionId = "content-blocks-drag-handle-description";

	return (
		<Fragment>
			<span className="sr-only" id={dragHandleDescriptionId}>
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
						<Fragment key={String(item.id)}>
							{dropTarget?.id === item.id && dropTarget.position === "before" && (
								<div aria-hidden={true} className="mx-1 h-0.5 rounded-full bg-accent" />
							)}
							<div
								onDragOver={(e) => {
									handleDragOver(e, item.id);
								}}
								onDrop={(e) => {
									handleDrop(e, item.id);
								}}
							>
								<Disclosure
									className={twMerge(
										"group inset-ring inset-ring-border rounded-lg transition-opacity",
										draggingId === item.id && "opacity-50",
									)}
									id={String(item.id)}
								>
									<div className="flex items-center gap-x-2 px-3 py-2.5">
										<button
											aria-describedby={dragHandleDescriptionId}
											aria-label={t("Drag to reorder")}
											className="cursor-grab touch-none text-muted-fg"
											draggable={true}
											onDragEnd={handleDragEnd}
											onDragStart={() => {
												handleDragStart(item.id);
											}}
											onKeyDown={(e) => {
												handleKeyboardReorder(e, item.id);
											}}
											type="button"
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
										</button>
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
									</div>
									<DisclosurePanel className="px-3 pb-3">
										<ContentBlockPanel
											item={item}
											onChange={(content) => {
												list.update(item.id, { ...item, content });
											}}
										/>
									</DisclosurePanel>
								</Disclosure>
							</div>
							{dropTarget?.id === item.id && dropTarget.position === "after" && (
								<div aria-hidden={true} className="mx-1 h-0.5 rounded-full bg-accent" />
							)}
						</Fragment>
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

interface ContentBlockPanelProps {
	item: ContentBlock;
	onChange: (content: JSONContent) => void;
}

function ContentBlockPanel({ item, onChange }: Readonly<ContentBlockPanelProps>): ReactNode {
	switch (item.type) {
		case "data": {
			return <span>data</span>;
		}
		case "embed": {
			return <span>embed</span>;
		}
		case "image": {
			return <span>image</span>;
		}
		case "rich_text": {
			return <RichTextEditor className="w-full" content={item.content} onChange={onChange} />;
		}
		default: {
			return null;
		}
	}
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
