/* eslint-disable react/jsx-no-literals */
"use client";

import type { ContentBlockTypes } from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { GridList, GridListItem } from "@dariah-eric/ui/grid-list";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@dariah-eric/ui/menu";
import { RichTextEditor } from "@dariah-eric/ui/rich-text-editor";
import {
	CodeBracketSquareIcon,
	PencilSquareIcon,
	PhotoIcon,
	PlusIcon,
	Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";
import type { Key } from "react-aria";
import { useDragAndDrop, useListData } from "react-aria-components";

export interface ContentBlock {
	id: Key;
	type: ContentBlockTypes["type"];
	position?: number;
	content?: JSONContent;
}

export interface ContentBlocksProps {
	items: Array<ContentBlock>;
}

export function ContentBlocks({ items: initialItems }: Readonly<ContentBlocksProps>): ReactNode {
	const list = useListData<ContentBlock>({
		initialItems,
		getKey(item) {
			return item.id;
		},
	});

	const addItem = (type: ContentBlock["type"]) => {
		const newItem: ContentBlock = {
			id: crypto.randomUUID(),
			type,
			content: {},
		};
		list.append(newItem);
	};

	const { dragAndDropHooks } = useDragAndDrop({
		getItems(keys) {
			return [...keys].map((key) => {
				return {
					"text/plain": list.getItem(key)?.type ?? "",
				};
			});
		},
		onReorder(e) {
			if (e.target.dropPosition === "before") list.moveBefore(e.target.key, e.keys);
			if (e.target.dropPosition === "after") list.moveAfter(e.target.key, e.keys);
		},
	});

	return (
		<>
			<GridList dragAndDropHooks={dragAndDropHooks} items={list.items}>
				{(item) => {
					switch (item.type) {
						case "data": {
							return <GridListItem id={item.id}>data</GridListItem>;
						}
						case "embed": {
							return <GridListItem id={item.id}>embed</GridListItem>;
						}
						case "image": {
							return <GridListItem id={item.id}>image</GridListItem>;
						}
						case "rich_text": {
							return (
								<GridListItem id={item.id} textValue={item.type}>
									<RichTextEditor
										className="w-full"
										content={item.content}
										onChange={(content) => {
											list.update(item.id, { ...item, content });
										}}
									/>
								</GridListItem>
							);
						}
						default: {
							return null;
						}
					}
				}}
			</GridList>
			{list.items.map((item, idx) => {
				<input name={`contentBlocks.${String(idx)}`} type="hidden" value={JSON.stringify(item)} />;
			})}
			<ContentBlockMenu onAdd={addItem} />
		</>
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
