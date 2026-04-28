import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import type { Database, Transaction } from "@/middlewares/db";
import { alias, eq } from "@/services/db/sql";
import { images } from "@/services/images";
import { imageWidth } from "~/config/api.config";

export const RichTextContentBlockSchema = v.object({
	type: v.literal("rich_text"),
	content: v.any(),
});

export const EmbedContentBlockSchema = v.object({
	type: v.literal("embed"),
	url: v.string(),
	caption: v.nullable(v.string()),
});

export const ImageContentBlockSchema = v.object({
	type: v.literal("image"),
	image: v.object({ url: v.string() }),
	caption: v.nullable(v.string()),
});

export const DataContentBlockSchema = v.object({
	type: v.literal("data"),
	dataType: v.picklist(schema.dataContentBlockTypesEnum),
	limit: v.nullable(v.number()),
});

export const HeroContentBlockSchema = v.object({
	type: v.literal("hero"),
	title: v.string(),
	eyebrow: v.nullable(v.string()),
	image: v.nullable(v.object({ url: v.string() })),
	ctas: v.nullable(v.array(v.object({ label: v.string(), url: v.string() }))),
});

export const AccordionContentBlockSchema = v.object({
	type: v.literal("accordion"),
	items: v.array(v.object({ title: v.string(), content: v.optional(v.any()) })),
});

export const ContentBlockSchema = v.union([
	RichTextContentBlockSchema,
	EmbedContentBlockSchema,
	ImageContentBlockSchema,
	DataContentBlockSchema,
	HeroContentBlockSchema,
	AccordionContentBlockSchema,
]);

export type ContentBlock = v.InferOutput<typeof ContentBlockSchema>;

const heroAssets = alias(schema.assets, "hero_assets");

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContentBlocks(db: Database | Transaction, entityId: string) {
	const rows = await db
		.select({
			fieldId: schema.fields.id,
			fieldName: schema.entityTypesFieldsNames.fieldName,
			blockId: schema.contentBlocks.id,
			blockType: schema.contentBlockTypes.type,
			richTextContent: schema.richTextContentBlocks.content,
			embedUrl: schema.embedContentBlocks.url,
			embedCaption: schema.embedContentBlocks.caption,
			imageCaption: schema.imageContentBlocks.caption,
			imageKey: schema.assets.key,
			dataLimit: schema.dataContentBlocks.limit,
			dataType: schema.dataContentBlockTypes.type,
			heroTitle: schema.heroContentBlocks.title,
			heroEyebrow: schema.heroContentBlocks.eyebrow,
			heroImageKey: heroAssets.key,
			heroCtas: schema.heroContentBlocks.ctas,
			accordionItems: schema.accordionContentBlocks.items,
		})
		.from(schema.fields)
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
		)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.fieldId, schema.fields.id))
		.innerJoin(
			schema.contentBlockTypes,
			eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
		)
		.leftJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.leftJoin(schema.embedContentBlocks, eq(schema.embedContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(schema.imageContentBlocks, eq(schema.imageContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(schema.assets, eq(schema.assets.id, schema.imageContentBlocks.imageId))
		.leftJoin(schema.dataContentBlocks, eq(schema.dataContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(
			schema.dataContentBlockTypes,
			eq(schema.dataContentBlockTypes.id, schema.dataContentBlocks.typeId),
		)
		.leftJoin(schema.heroContentBlocks, eq(schema.heroContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(heroAssets, eq(heroAssets.id, schema.heroContentBlocks.imageId))
		.leftJoin(
			schema.accordionContentBlocks,
			eq(schema.accordionContentBlocks.id, schema.contentBlocks.id),
		)
		.where(eq(schema.fields.entityId, entityId))
		.orderBy(schema.contentBlocks.position);

	// Group rows by field, preserving position order (already sorted by ORDER BY)
	const fieldMap = new Map<string, { name: string; blocks: Array<ContentBlock> }>();

	for (const row of rows) {
		if (!fieldMap.has(row.fieldId)) {
			fieldMap.set(row.fieldId, { name: row.fieldName, blocks: [] });
		}

		fieldMap.get(row.fieldId)!.blocks.push(normalizeRow(row));
	}

	return Object.fromEntries(
		[...fieldMap.values()].map(({ name, blocks }) => {
			return [name, blocks];
		}),
	);
}

function normalizeRow(row: {
	blockType: string;
	richTextContent: unknown;
	embedUrl: string | null;
	embedCaption: string | null;
	imageCaption: string | null;
	imageKey: string | null;
	dataLimit: number | null;
	dataType: string | null;
	heroTitle: string | null;
	heroEyebrow: string | null;
	heroImageKey: string | null;
	heroCtas: unknown;
	accordionItems: unknown;
}): ContentBlock {
	switch (row.blockType) {
		case "rich_text": {
			return { type: "rich_text", content: row.richTextContent };
		}
		case "embed": {
			return { type: "embed", url: row.embedUrl!, caption: row.embedCaption };
		}
		case "image": {
			return {
				type: "image",
				image: images.generateSignedImageUrl({
					key: row.imageKey!,
					options: { width: imageWidth.featured },
				}),
				caption: row.imageCaption,
			};
		}
		case "data": {
			return {
				type: "data",
				dataType: row.dataType as (typeof schema.dataContentBlockTypesEnum)[number],
				limit: row.dataLimit,
			};
		}
		case "hero": {
			return {
				type: "hero",
				title: row.heroTitle!,
				eyebrow: row.heroEyebrow,
				image:
					row.heroImageKey != null
						? images.generateSignedImageUrl({
								key: row.heroImageKey,
								options: { width: imageWidth.featured },
							})
						: null,
				ctas: row.heroCtas as Array<{ label: string; url: string }> | null,
			};
		}
		case "accordion": {
			return {
				type: "accordion",
				items: (row.accordionItems as Array<{ title: string; content?: unknown }> | null) ?? [],
			};
		}
		default: {
			throw new Error(`Unknown content block type: ${row.blockType}`);
		}
	}
}
