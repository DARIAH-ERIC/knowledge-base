import { type ImageCaptionMode, resolveImageCaption } from "@dariah-eric/database/image-captions";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import * as v from "valibot";

import { getEmbedUrl } from "@/lib/embed-url";
import { generateImageUrl, toImageAsset } from "@/lib/images";
import { ImageSchema, LicenseSchema } from "@/lib/schemas";
import type { Database, Transaction } from "@/middlewares/db";
import { alias, eq } from "@/services/db/sql";
import { imageWidth } from "~/config/api.config";

export const RichTextContentBlockSchema = v.object({
	type: v.literal("rich_text"),
	content: v.any(),
});

export const EmbedContentBlockSchema = v.object({
	type: v.literal("embed"),
	/** The URL as entered by the editor. */
	url: v.string(),
	/** `url` normalised to a `youtube-nocookie.com` embed URL, ready for an `<iframe src>`. */
	embedUrl: v.string(),
	caption: v.nullable(v.any()),
});

export const ImageContentBlockSchema = v.object({
	type: v.literal("image"),
	image: v.object({
		url: v.string(),
		alt: v.nullable(v.string()),
		license: v.nullable(LicenseSchema),
	}),
	caption: v.nullable(v.any()),
	captionSource: v.nullable(v.picklist(["asset", "block"])),
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
	image: v.nullable(ImageSchema),
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
const heroLicenses = alias(schema.licenses, "hero_licenses");

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
			imageCaptionMode: schema.imageContentBlocks.captionMode,
			imageKey: schema.assets.key,
			imageAlt: schema.assets.alt,
			imageAssetCaption: schema.assets.caption,
			imageLicenseName: schema.licenses.name,
			imageLicenseUrl: schema.licenses.url,
			dataLimit: schema.dataContentBlocks.limit,
			dataType: schema.dataContentBlockTypes.type,
			heroTitle: schema.heroContentBlocks.title,
			heroEyebrow: schema.heroContentBlocks.eyebrow,
			heroImageKey: heroAssets.key,
			heroImageAlt: heroAssets.alt,
			heroImageCaption: heroAssets.caption,
			heroLicenseName: heroLicenses.name,
			heroLicenseUrl: heroLicenses.url,
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
		.leftJoin(schema.licenses, eq(schema.licenses.id, schema.assets.licenseId))
		.leftJoin(schema.dataContentBlocks, eq(schema.dataContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(
			schema.dataContentBlockTypes,
			eq(schema.dataContentBlockTypes.id, schema.dataContentBlocks.typeId),
		)
		.leftJoin(schema.heroContentBlocks, eq(schema.heroContentBlocks.id, schema.contentBlocks.id))
		.leftJoin(heroAssets, eq(heroAssets.id, schema.heroContentBlocks.imageId))
		.leftJoin(heroLicenses, eq(heroLicenses.id, heroAssets.licenseId))
		.leftJoin(
			schema.accordionContentBlocks,
			eq(schema.accordionContentBlocks.id, schema.contentBlocks.id),
		)
		.where(eq(schema.fields.entityVersionId, entityId))
		.orderBy(schema.contentBlocks.position);

	// Group rows by field, preserving position order (already sorted by ORDER BY)
	const fieldMap = new Map<string, { name: string; blocks: Array<ContentBlock> }>();

	for (const row of rows) {
		if (!fieldMap.has(row.fieldId)) {
			fieldMap.set(row.fieldId, { name: row.fieldName, blocks: [] });
		}

		fieldMap.get(row.fieldId)!.blocks.push(normalizeRow(row));
	}

	return Object.fromEntries([...fieldMap.values()].map(({ name, blocks }) => [name, blocks]));
}

function normalizeRow(row: {
	blockType: string;
	richTextContent: unknown;
	embedUrl: string | null;
	embedCaption: JSONContent | null;
	imageCaption: JSONContent | null;
	imageCaptionMode: ImageCaptionMode | null;
	imageKey: string | null;
	imageAlt: string | null;
	imageAssetCaption: JSONContent | null;
	imageLicenseName: string | null;
	imageLicenseUrl: string | null;
	dataLimit: number | null;
	dataType: string | null;
	heroTitle: string | null;
	heroEyebrow: string | null;
	heroImageKey: string | null;
	heroImageAlt: string | null;
	heroImageCaption: JSONContent | null;
	heroLicenseName: string | null;
	heroLicenseUrl: string | null;
	heroCtas: unknown;
	accordionItems: unknown;
}): ContentBlock {
	switch (row.blockType) {
		case "rich_text": {
			return { type: "rich_text", content: row.richTextContent };
		}
		case "embed": {
			return {
				type: "embed",
				url: row.embedUrl!,
				embedUrl: getEmbedUrl(row.embedUrl!),
				caption: row.embedCaption,
			};
		}
		case "image": {
			const assetImage = generateImageUrl(
				toImageAsset({
					key: row.imageKey!,
					alt: row.imageAlt,
					caption: row.imageAssetCaption,
					licenseName: row.imageLicenseName,
					licenseUrl: row.imageLicenseUrl,
				}),
				imageWidth.featured,
			);
			const { caption: _assetCaption, ...image } = assetImage;
			const captionMode =
				row.imageCaptionMode ?? (row.imageCaption != null ? "override" : "inherit");
			const { caption, source: captionSource } = resolveImageCaption({
				assetCaption: row.imageAssetCaption,
				blockCaption: row.imageCaption,
				captionMode,
			});

			return {
				type: "image",
				image,
				caption,
				captionSource,
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
				image: generateImageUrl(
					toImageAsset({
						key: row.heroImageKey,
						alt: row.heroImageAlt,
						caption: row.heroImageCaption,
						licenseName: row.heroLicenseName,
						licenseUrl: row.heroLicenseUrl,
					}),
					imageWidth.featured,
				),
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
