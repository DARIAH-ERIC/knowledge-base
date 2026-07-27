import { type ImageCaptionMode, resolveImageCaption } from "@dariah-eric/database/image-captions";
import {
	annotateEntityLinkTargets,
	annotateLinkTargets,
	collectLinkTargetAssetKeys,
	collectLinkTargetEntityIds,
} from "@dariah-eric/database/link-targets";
import { getLinkTargetAssets } from "@dariah-eric/database/link-targets-service";
import {
	annotatePlaceholderValues,
	collectPlaceholderValueKinds,
} from "@dariah-eric/database/placeholder-values";
import { getPlaceholderValues } from "@dariah-eric/database/placeholder-values-service";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import * as v from "valibot";

import { getAssetDownloadUrl, getDownloadFilename } from "@/lib/asset-download";
import { getEmbedUrl } from "@/lib/embed-url";
import { generateImageUrl, toImageAsset } from "@/lib/images";
import { getEntityRefsByDocumentId } from "@/lib/relations";
import { ImageSchema, LicenseSchema } from "@/lib/schemas";
import type { Database, Transaction } from "@/middlewares/db";
import { alias, eq } from "@/services/db/sql";
import { imageWidth } from "~/config/api.config";

export const RichTextContentBlockSchema = v.object({
	type: v.literal("rich_text"),
	content: v.any(),
});

export const CalloutContentBlockSchema = v.object({
	type: v.literal("callout"),
	intent: v.picklist(schema.calloutIntentsEnum),
	title: v.nullable(v.string()),
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
	layout: v.picklist(schema.imageLayoutEnum),
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

export const MediaTextContentBlockSchema = v.object({
	type: v.literal("media_text"),
	image: v.object({
		url: v.string(),
		alt: v.nullable(v.string()),
		license: v.nullable(LicenseSchema),
	}),
	side: v.picklist(schema.mediaTextSideEnum),
	content: v.any(),
	caption: v.nullable(v.any()),
	captionSource: v.nullable(v.picklist(["asset", "block"])),
});

export const ContentBlockSchema = v.union([
	RichTextContentBlockSchema,
	CalloutContentBlockSchema,
	EmbedContentBlockSchema,
	ImageContentBlockSchema,
	DataContentBlockSchema,
	HeroContentBlockSchema,
	AccordionContentBlockSchema,
	MediaTextContentBlockSchema,
]);

export type ContentBlock = v.InferOutput<typeof ContentBlockSchema>;

const heroAssets = alias(schema.assets, "hero_assets");
const heroLicenses = alias(schema.licenses, "hero_licenses");
const mediaTextAssets = alias(schema.assets, "media_text_assets");
const mediaTextLicenses = alias(schema.licenses, "media_text_licenses");

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContentBlocks(db: Database | Transaction, entityId: string) {
	const rows = await db
		.select({
			fieldId: schema.fields.id,
			fieldName: schema.entityTypesFieldsNames.fieldName,
			blockId: schema.contentBlocks.id,
			blockType: schema.contentBlockTypes.type,
			calloutIntent: schema.calloutContentBlocks.intent,
			calloutTitle: schema.calloutContentBlocks.title,
			calloutContent: schema.calloutContentBlocks.content,
			richTextContent: schema.richTextContentBlocks.content,
			embedUrl: schema.embedContentBlocks.url,
			embedCaption: schema.embedContentBlocks.caption,
			imageCaption: schema.imageContentBlocks.caption,
			imageCaptionMode: schema.imageContentBlocks.captionMode,
			imageLayout: schema.imageContentBlocks.layout,
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
			mediaTextSide: schema.mediaTextContentBlocks.side,
			mediaTextContent: schema.mediaTextContentBlocks.content,
			mediaTextCaption: schema.mediaTextContentBlocks.caption,
			mediaTextCaptionMode: schema.mediaTextContentBlocks.captionMode,
			mediaTextImageKey: mediaTextAssets.key,
			mediaTextImageAlt: mediaTextAssets.alt,
			mediaTextImageCaption: mediaTextAssets.caption,
			mediaTextLicenseName: mediaTextLicenses.name,
			mediaTextLicenseUrl: mediaTextLicenses.url,
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
		.leftJoin(
			schema.calloutContentBlocks,
			eq(schema.calloutContentBlocks.id, schema.contentBlocks.id),
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
		.leftJoin(
			schema.mediaTextContentBlocks,
			eq(schema.mediaTextContentBlocks.id, schema.contentBlocks.id),
		)
		.leftJoin(mediaTextAssets, eq(mediaTextAssets.id, schema.mediaTextContentBlocks.imageId))
		.leftJoin(mediaTextLicenses, eq(mediaTextLicenses.id, mediaTextAssets.licenseId))
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

	const fields = Object.fromEntries(
		[...fieldMap.values()].map(({ name, blocks }) => [name, blocks]),
	);

	// Both passes below resolve references the editor stored deliberately, so that nothing derived —
	// a count, a download url — is ever frozen into the document at authoring time.

	// Placeholder-value nodes are stored as references; attach the current data here (a `value`
	// attribute: number for counts, name array for lists) so consumers render it themselves.
	const placeholderValueKinds = collectPlaceholderValueKinds(fields);
	const withPlaceholderValues =
		placeholderValueKinds.size === 0
			? fields
			: annotatePlaceholderValues(fields, await getPlaceholderValues(db, placeholderValueKinds));

	// Asset-targeted links store only the asset's storage key; attach the download url, filename and
	// size so consumers can render the link (and any file chrome) without knowing our storage layout.
	const withAssetLinks = await annotateAssetLinks(db, withPlaceholderValues);

	// Entity-targeted links store only a document id; attach the page it currently lives at, so a
	// renamed slug moves every link to it.
	return annotateEntityLinks(db, withAssetLinks);
}

/**
 * Resolves `entity`-targeted link marks. Unpublished, deleted and page-less entities all resolve to
 * nothing and stay unannotated, so a renderer sees one "no href" case rather than three.
 */
async function annotateEntityLinks<T>(db: Database | Transaction, value: T): Promise<T> {
	const ids = collectLinkTargetEntityIds(value);
	if (ids.size === 0) {
		return value;
	}

	const refs = await getEntityRefsByDocumentId(db, [...ids]);

	const resolved = new Map(
		[...refs]
			.filter(([, ref]) => ref.href != null)
			.map(([id, ref]) => [id, { href: ref.href!, label: ref.label, type: ref.type }] as const),
	);

	return annotateEntityLinkTargets(value, resolved);
}

/**
 * Resolves `asset`-targeted link marks anywhere in the given structure. A key whose asset has been
 * deleted stays unresolved — the link keeps no href, and renderers degrade to plain text rather
 * than emitting a dead download.
 */
async function annotateAssetLinks<T>(db: Database | Transaction, value: T): Promise<T> {
	const keys = collectLinkTargetAssetKeys(value);
	if (keys.size === 0) {
		return value;
	}

	const assets = await getLinkTargetAssets(db, keys);

	const resolved = new Map(
		[...assets].map(
			([key, asset]) =>
				[
					key,
					{
						url: getAssetDownloadUrl(key),
						filename: getDownloadFilename(asset),
						mimeType: asset.mimeType,
						size: asset.size,
					},
				] as const,
		),
	);

	return annotateLinkTargets(value, resolved);
}

function normalizeRow(row: {
	blockType: string;
	calloutIntent: (typeof schema.calloutIntentsEnum)[number] | null;
	calloutTitle: string | null;
	calloutContent: JSONContent | null;
	richTextContent: unknown;
	embedUrl: string | null;
	embedCaption: JSONContent | null;
	imageCaption: JSONContent | null;
	imageCaptionMode: ImageCaptionMode | null;
	imageLayout: (typeof schema.imageLayoutEnum)[number] | null;
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
	mediaTextSide: (typeof schema.mediaTextSideEnum)[number] | null;
	mediaTextContent: JSONContent | null;
	mediaTextCaption: JSONContent | null;
	mediaTextCaptionMode: ImageCaptionMode | null;
	mediaTextImageKey: string | null;
	mediaTextImageAlt: string | null;
	mediaTextImageCaption: JSONContent | null;
	mediaTextLicenseName: string | null;
	mediaTextLicenseUrl: string | null;
}): ContentBlock {
	switch (row.blockType) {
		case "callout": {
			return {
				type: "callout",
				intent: row.calloutIntent!,
				title: row.calloutTitle,
				content: row.calloutContent,
			};
		}
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
			const layout = row.imageLayout ?? "default";
			// Floated images render at a constrained width; centred layouts (default/wide/full) keep
			// the full featured width so a breakout image stays sharp.
			const isFloated = layout === "float-start" || layout === "float-end";
			const assetImage = generateImageUrl(
				toImageAsset({
					key: row.imageKey!,
					alt: row.imageAlt,
					caption: row.imageAssetCaption,
					licenseName: row.imageLicenseName,
					licenseUrl: row.imageLicenseUrl,
				}),
				isFloated ? imageWidth.preview : imageWidth.featured,
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
				layout,
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
		case "media_text": {
			const assetImage = generateImageUrl(
				toImageAsset({
					key: row.mediaTextImageKey!,
					alt: row.mediaTextImageAlt,
					caption: row.mediaTextImageCaption,
					licenseName: row.mediaTextLicenseName,
					licenseUrl: row.mediaTextLicenseUrl,
				}),
				imageWidth.avatar,
			);
			const { caption: _assetCaption, ...image } = assetImage;
			const captionMode =
				row.mediaTextCaptionMode ?? (row.mediaTextCaption != null ? "override" : "inherit");
			const { caption, source: captionSource } = resolveImageCaption({
				assetCaption: row.mediaTextImageCaption,
				blockCaption: row.mediaTextCaption,
				captionMode,
			});

			return {
				type: "media_text",
				image,
				side: row.mediaTextSide!,
				content: row.mediaTextContent,
				caption,
				captionSource,
			};
		}
		default: {
			throw new Error(`Unknown content block type: ${row.blockType}`);
		}
	}
}
