import * as path from "node:path";

import { assert, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, inArray, isNull } from "@dariah-eric/database/sql";
import { createStorageService } from "@dariah-eric/storage";
import { getAspectRatio, getSvgAspectRatio, toDisplayDimensions } from "@dariah-eric/storage/lib";
import type { JSONContent } from "@tiptap/core";
import sharp from "sharp";

import { env } from "../config/env.config";
import {
	type EmbeddedImage,
	type ResolvedPart,
	type RewritePart,
	extractFromBody,
	hasEmbeddedImages,
	resolveParts,
	sourceId,
	splitRichText,
} from "../lib/embedded-images";
import { writeTsvReport } from "../lib/tsv-report";

/**
 * Moves every image a rich-text document holds itself into the media library and an `image` content
 * block. Dry run by default; `--apply` writes the changes.
 *
 * Every image on the site is meant to be an asset in our object store, referenced by an `image` (or
 * gallery, media) block. Two kinds of image escaped that and live inside rich-text jsonb instead:
 *
 * - Tiptap's plain `image` node, from an `<img>` pasted into the editor before it refused them, or
 *   imported that way. It points at whatever `src` it came with — usually someone else's server —
 *   so the image is fetched, stored as an asset labelled with that url, and referenced from a
 *   block.
 * - An `assetImage` the editor never split out, because it sat nested in a list or table. It names an
 *   asset by key already, so only the block is missing.
 *
 * A body is split at its images exactly as the editor splits a document on save: prose runs stay
 * `rich_text`, each image becomes an `image` block in place, and the field's later blocks shift
 * down. An image nested in a list, table or quote cannot be a block there, so it follows the
 * top-level node it sat in. Images inside a media block's prose are placed after the media block.
 * Both are marked `nested` in the report, for somebody to check the placement.
 *
 * Conservative and idempotent. A url is fetched once however often it appears, and an asset already
 * labelled with it — by a previous run — is reused rather than stored again. A body with an image
 * that cannot be resolved (a relative url, a download that fails, a key naming no asset) is left
 * exactly as it is and reported, since the stored node is the only record of what the author put
 * there. Once the report shows only images nobody can recover, `--drop-unresolved` removes them.
 *
 * Must have run to completion — no `skipped-unresolved` left — wherever the dashboard runs a build
 * without the plain `image` node in its schema: the editor and the details view cannot open a
 * document that still holds one (`Unknown node type: image`).
 *
 * Every version is rewritten, published ones included, so the website's caches and the search index
 * hold the old content until they next refresh.
 *
 * @example
 * 	pnpm run data:import:embedded-images
 * 	pnpm run data:import:embedded-images -- --apply
 * 	pnpm run data:import:embedded-images -- --apply --drop-unresolved
 */

const cacheFolderPath = path.join(process.cwd(), ".cache");
const reportFilePath = path.join(cacheFolderPath, "embedded-images.tsv");

/** Matches `imageSizeLimit` in `apps/knowledge-base/config/assets.config.ts`. */
const imageSizeLimit = 20 * 1024 * 1024;

/**
 * Maximum image resolution (total pixels) imgproxy will render. Must match `imageMaxResolution` in
 * `apps/knowledge-base/config/assets.config.ts` and the `IMGPROXY_MAX_SRC_RESOLUTION` setting (in
 * megapixels) of the imgproxy deployment.
 */
const imageMaxResolution = 50 * 1_000_000;

const downloadTimeout = 60_000;

/**
 * The formats the media library accepts (`imageMimeTypes` in the dashboard), keyed by what `sharp`
 * calls them. Anything else it can decode — a GIF, a TIFF — is converted to PNG on the way in.
 */
const storedMimeTypes = new Map([
	["avif", "image/avif"],
	["heif", "image/avif"],
	["jpeg", "image/jpeg"],
	["png", "image/png"],
	["svg", "image/svg+xml"],
	["webp", "image/webp"],
]);

const extensionsByMimeType = new Map([
	["image/avif", "avif"],
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/svg+xml", "svg"],
	["image/webp", "webp"],
]);

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
	},
	logger: false,
}).unwrap();

const storage = createStorageService({
	config: {
		accessKey: env.S3_ACCESS_KEY,
		bucketName: env.S3_BUCKET_NAME,
		endPoint: env.S3_HOST,
		port: env.S3_PORT,
		secretKey: env.S3_SECRET_KEY,
		useSSL: env.S3_PROTOCOL === "https",
	},
});

interface Candidate {
	kind: "media_text" | "rich_text";
	contentBlockId: string;
	fieldId: string;
	parentBlockId: string | null;
	entityId: string;
	entityLabel: string | null;
	entitySlug: string;
	entityType: string;
	status: string;
	/** For a `rich_text` body: everything that replaces it. */
	parts: Array<RewritePart>;
	/** For a media block: its prose without the images, which follow it as blocks. */
	body: JSONContent | null;
}

function imagesOf(candidate: Candidate): Array<EmbeddedImage> {
	return candidate.parts.flatMap((part) => (part.kind === "image" ? [part.image] : []));
}

async function findCandidates(): Promise<Array<Candidate>> {
	function withEntity<T extends object>(columns: T) {
		return {
			...columns,
			contentBlockId: schema.contentBlocks.id,
			fieldId: schema.contentBlocks.fieldId,
			parentBlockId: schema.contentBlocks.parentBlockId,
			entityId: schema.entities.id,
			entityLabel: schema.entities.label,
			entitySlug: schema.entities.slug,
			entityType: schema.entityTypes.type,
			status: schema.entityStatus.type,
		};
	}

	const richTextRows = await db
		.select(withEntity({ content: schema.richTextContentBlocks.content }))
		.from(schema.richTextContentBlocks)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.id, schema.richTextContentBlocks.id))
		.innerJoin(schema.fields, eq(schema.fields.id, schema.contentBlocks.fieldId))
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.id, schema.fields.entityVersionId))
		.innerJoin(schema.entities, eq(schema.entities.id, schema.entityVersions.entityId))
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.innerJoin(schema.entityStatus, eq(schema.entityStatus.id, schema.entityVersions.statusId));

	const mediaTextRows = await db
		.select(withEntity({ content: schema.mediaTextContentBlocks.content }))
		.from(schema.mediaTextContentBlocks)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.id, schema.mediaTextContentBlocks.id))
		.innerJoin(schema.fields, eq(schema.fields.id, schema.contentBlocks.fieldId))
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.id, schema.fields.entityVersionId))
		.innerJoin(schema.entities, eq(schema.entities.id, schema.entityVersions.entityId))
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.innerJoin(schema.entityStatus, eq(schema.entityStatus.id, schema.entityVersions.statusId));

	const candidates: Array<Candidate> = [];

	for (const { content, ...row } of richTextRows) {
		if (hasEmbeddedImages(content)) {
			candidates.push({ ...row, kind: "rich_text", parts: splitRichText(content), body: null });
		}
	}

	for (const { content, ...row } of mediaTextRows) {
		if (hasEmbeddedImages(content)) {
			const extracted = extractFromBody(content);
			candidates.push({
				...row,
				kind: "media_text",
				parts: extracted.images.map((image) => {
					return { kind: "image", image };
				}),
				body: extracted.content,
			});
		}
	}

	return candidates;
}

// ---------------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------------

type SourceStatus =
	| "existing-asset"
	| "imported"
	| "to-import"
	| "download-failed"
	| "invalid-url"
	| "missing-source"
	| "unknown-key";

interface SourceState {
	status: SourceStatus;
	assetId?: string;
	assetKey?: string;
	note?: string;
}

function parseHttpUrl(src: string): URL | null {
	try {
		const url = new URL(src);
		return url.protocol === "http:" || url.protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}

async function download(url: URL): Promise<Buffer> {
	const response = await fetch(url, { signal: AbortSignal.timeout(downloadTimeout) });

	if (!response.ok) {
		throw new Error(`Answered ${String(response.status)}.`);
	}

	const declaredSize = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredSize) && declaredSize > imageSizeLimit) {
		throw new Error(`Larger than ${String(imageSizeLimit)} bytes.`);
	}

	const image = Buffer.from(await response.arrayBuffer());
	if (image.byteLength > imageSizeLimit) {
		throw new Error(`Larger than ${String(imageSizeLimit)} bytes.`);
	}

	return image;
}

/**
 * The image as the media library would store it, mirroring `prepareImageForUpload` in the
 * dashboard: vectors as they are, rasters past imgproxy's resolution limit downscaled to it, and
 * formats the library does not take converted to PNG. Throws for anything `sharp` cannot decode,
 * which is how an html error page served with a 200 is caught.
 */
async function prepareImage(input: Buffer): Promise<{
	image: Buffer;
	mimeType: string;
	width: number | null;
	height: number | null;
	aspectRatio: number | null;
}> {
	const metadata = await sharp(input).metadata();
	const mimeType = storedMimeTypes.get(metadata.format) ?? "image/png";

	if (mimeType === "image/svg+xml") {
		return {
			image: input,
			mimeType,
			width: null,
			height: null,
			aspectRatio: getSvgAspectRatio(input),
		};
	}

	const resolution = metadata.width * metadata.height;
	const needsResize = Number.isFinite(resolution) && resolution > imageMaxResolution;
	const needsConversion = !storedMimeTypes.has(metadata.format);

	if (!needsResize && !needsConversion) {
		const dimensions = toDisplayDimensions({
			width: metadata.width,
			height: metadata.height,
			orientation: metadata.orientation,
		});
		return {
			image: input,
			mimeType,
			...dimensions,
			aspectRatio: getAspectRatio(dimensions.width, dimensions.height),
		};
	}

	/** Bake EXIF orientation into the pixels before metadata is stripped by re-encoding. */
	let pipeline = sharp(input).rotate();
	if (needsResize) {
		const scale = Math.sqrt(imageMaxResolution / resolution);
		pipeline = pipeline.resize({
			fit: "inside",
			height: Math.floor(metadata.height * scale),
			width: Math.floor(metadata.width * scale),
		});
	}
	if (needsConversion) {
		pipeline = pipeline.png();
	}

	const image = await pipeline.toBuffer();
	const { width, height } = await sharp(image).metadata();

	return { image, mimeType, width, height, aspectRatio: getAspectRatio(width, height) };
}

function filenameFor(url: URL, mimeType: string): string {
	const extension = extensionsByMimeType.get(mimeType) ?? "png";
	const basename = decodeURIComponent(path.posix.basename(url.pathname)).replace(/\.[^.]*$/, "");

	return `${basename || "image"}.${extension}`;
}

async function importImage(url: URL, alt: string | null): Promise<{ id: string; key: string }> {
	const prepared = await prepareImage(await download(url));
	const filename = filenameFor(url, prepared.mimeType);

	const { key } = (
		await storage.upload({
			prefix: "images",
			input: prepared.image,
			metadata: { "content-type": prepared.mimeType, name: filename },
			size: prepared.image.byteLength,
		})
	).unwrap();

	const [asset] = await db
		.insert(schema.assets)
		.values({
			key,
			// The source url verbatim: what makes a re-run recognise this image as already imported.
			label: url.href,
			filename,
			mimeType: prepared.mimeType,
			size: prepared.image.byteLength,
			width: prepared.width,
			height: prepared.height,
			aspectRatio: prepared.aspectRatio,
			alt,
		})
		.returning({ id: schema.assets.id });
	assert(asset);

	return { id: asset.id, key };
}

/** Looks up (and with `apply`, imports) every distinct source the candidates name. */
async function resolveSources(
	images: Array<EmbeddedImage>,
	apply: boolean,
): Promise<Map<string, SourceState>> {
	const states = new Map<string, SourceState>();

	const keys = new Set<string>();
	const urls = new Map<string, URL>();
	const alts = new Map<string, string | null>();

	for (const image of images) {
		const { source } = image;
		if (source.kind === "asset") {
			keys.add(source.imageKey);
		} else if (source.kind === "url") {
			const url = parseHttpUrl(source.src);
			if (url == null) {
				states.set(sourceId(source)!, {
					status: "invalid-url",
					note: "Not an absolute http(s) url.",
				});
				continue;
			}
			urls.set(source.src, url);
			// The first alt text found for a url describes the asset; later uses keep their own copy.
			if (!alts.has(source.src)) {
				alts.set(source.src, image.alt);
			}
		}
	}

	if (keys.size > 0) {
		const assets = await db
			.select({ id: schema.assets.id, key: schema.assets.key })
			.from(schema.assets)
			.where(inArray(schema.assets.key, [...keys]));
		const idsByKey = new Map(assets.map((asset) => [asset.key, asset.id]));

		for (const key of keys) {
			const id = idsByKey.get(key);
			states.set(
				`asset:${key}`,
				id != null
					? { status: "existing-asset", assetId: id, assetKey: key }
					: { status: "unknown-key" },
			);
		}
	}

	if (urls.size > 0) {
		const labels = [...new Set([...urls.values()].map((url) => url.href))];
		const assets = await db
			.select({ id: schema.assets.id, key: schema.assets.key, label: schema.assets.label })
			.from(schema.assets)
			.where(inArray(schema.assets.label, labels));
		const assetsByLabel = new Map(assets.map((asset) => [asset.label, asset]));

		for (const [src, url] of urls) {
			const id = `url:${src}`;
			const existing = assetsByLabel.get(url.href);

			if (existing != null) {
				states.set(id, { status: "existing-asset", assetId: existing.id, assetKey: existing.key });
				continue;
			}

			if (!apply) {
				states.set(id, { status: "to-import" });
				continue;
			}

			try {
				const asset = await importImage(url, alts.get(src) ?? null);
				// Two spellings of one url (`src` as stored vs. its normalised href) share the asset.
				assetsByLabel.set(url.href, { ...asset, label: url.href });
				states.set(id, { status: "imported", assetId: asset.id, assetKey: asset.key });
				log.info(`  imported ${url.href} → ${asset.key}`);
			} catch (error) {
				states.set(id, { status: "download-failed", note: String(error) });
				log.warn(`  failed ${url.href}: ${String(error)}`);
			}
		}
	}

	return states;
}

// ---------------------------------------------------------------------------------------------------
// Rewrite
// ---------------------------------------------------------------------------------------------------

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function shiftLaterSiblings(
	tx: Transaction,
	candidate: Candidate,
	position: number,
	shift: number,
): Promise<void> {
	if (shift <= 0) {
		return;
	}

	const siblings = await tx
		.select({ id: schema.contentBlocks.id, position: schema.contentBlocks.position })
		.from(schema.contentBlocks)
		.where(
			candidate.parentBlockId != null
				? eq(schema.contentBlocks.parentBlockId, candidate.parentBlockId)
				: and(
						eq(schema.contentBlocks.fieldId, candidate.fieldId),
						isNull(schema.contentBlocks.parentBlockId),
					),
		);

	// One update per row: an update whose `where` reads the column it writes cannot be trusted to see
	// the rows a sibling statement already moved.
	for (const sibling of siblings) {
		if (sibling.position > position) {
			await tx
				.update(schema.contentBlocks)
				.set({ position: sibling.position + shift })
				.where(eq(schema.contentBlocks.id, sibling.id));
		}
	}
}

async function applyCandidate(
	candidate: Candidate,
	parts: Array<ResolvedPart>,
	typeIds: { image: string; richText: string },
): Promise<void> {
	await db.transaction(async (tx) => {
		// Read afresh rather than taken from the candidate: rewriting an earlier body under the same
		// parent has shifted this one down since the candidates were collected.
		const [current] = await tx
			.select({ position: schema.contentBlocks.position })
			.from(schema.contentBlocks)
			.where(eq(schema.contentBlocks.id, candidate.contentBlockId));
		assert(current);
		const { position } = current;

		async function insertPart(part: ResolvedPart, at: number): Promise<void> {
			const [added] = await tx
				.insert(schema.contentBlocks)
				.values({
					fieldId: candidate.fieldId,
					typeId: part.kind === "image" ? typeIds.image : typeIds.richText,
					parentBlockId: candidate.parentBlockId,
					position: at,
				})
				.returning({ id: schema.contentBlocks.id });
			assert(added);

			if (part.kind === "image") {
				await tx.insert(schema.imageContentBlocks).values({
					id: added.id,
					imageId: part.assetId,
					caption: part.image.caption,
					captionMode: part.image.captionMode,
					layout: part.image.layout,
				});
			} else {
				await tx
					.insert(schema.richTextContentBlocks)
					.values({ id: added.id, content: part.content });
			}
		}

		if (candidate.kind === "media_text") {
			// The media block keeps its place and its prose, minus the images, which follow it.
			await shiftLaterSiblings(tx, candidate, position, parts.length);
			await tx
				.update(schema.mediaTextContentBlocks)
				.set({ content: candidate.body! })
				.where(eq(schema.mediaTextContentBlocks.id, candidate.contentBlockId));
			for (const [index, part] of parts.entries()) {
				await insertPart(part, position + 1 + index);
			}
			return;
		}

		// The old body goes (its typed row cascades with it) and its parts take its place.
		await shiftLaterSiblings(tx, candidate, position, parts.length - 1);
		await tx
			.delete(schema.contentBlocks)
			.where(eq(schema.contentBlocks.id, candidate.contentBlockId));
		for (const [index, part] of parts.entries()) {
			await insertPart(part, position + index);
		}
	});
}

// ---------------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------------

const reportColumns = [
	"entity_type",
	"entity_id",
	"entity",
	"status",
	"content_block_id",
	"block_type",
	"nested",
	"source",
	"source_status",
	"asset_key",
	"block_action",
	"note",
] as const;

function describeSource(image: EmbeddedImage): string {
	switch (image.source.kind) {
		case "asset": {
			return `asset:${image.source.imageKey}`;
		}
		case "url": {
			return image.source.src;
		}
		case "none": {
			return "";
		}
	}
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");
	const dropUnresolved = process.argv.includes("--drop-unresolved");

	log.info(
		apply
			? "Moving images embedded in rich text into image blocks..."
			: "Finding images embedded in rich text (dry run)...",
	);

	const candidates = await findCandidates();
	const images = candidates.flatMap((candidate) => imagesOf(candidate));
	const affectedEntities = new Set(candidates.map((candidate) => candidate.entityId)).size;

	log.info(
		`Found ${String(images.length)} embedded image(s) in ${String(candidates.length)} block(s) across ${String(affectedEntities)} entity/entities.`,
	);

	const states = await resolveSources(images, apply);
	const assetIdsBySource = new Map(
		[...states].flatMap(([id, state]) =>
			state.assetId != null ? [[id, state.assetId] as const] : [],
		),
	);

	let typeIds: { image: string; richText: string } | null = null;
	if (apply) {
		const types = await db
			.select({ id: schema.contentBlockTypes.id, type: schema.contentBlockTypes.type })
			.from(schema.contentBlockTypes)
			.where(inArray(schema.contentBlockTypes.type, ["image", "rich_text"]));
		const image = types.find((type) => type.type === "image")?.id;
		const richText = types.find((type) => type.type === "rich_text")?.id;
		assert(image);
		assert(richText);
		typeIds = { image, richText };
	}

	const rows: Array<Array<string>> = [];
	const counts = new Map<string, number>();

	for (const candidate of candidates) {
		const parts = resolveParts(candidate.parts, assetIdsBySource, dropUnresolved);

		let blockAction: string;
		if (parts == null) {
			blockAction = "skipped-unresolved";
		} else if (!apply) {
			blockAction = "to-rewrite";
		} else {
			await applyCandidate(candidate, parts, typeIds!);
			blockAction = "rewritten";
		}
		counts.set(blockAction, (counts.get(blockAction) ?? 0) + 1);

		for (const image of imagesOf(candidate)) {
			const id = sourceId(image.source);
			const state: SourceState =
				id != null
					? (states.get(id) ?? { status: "missing-source" })
					: { status: "missing-source" };

			rows.push([
				candidate.entityType,
				candidate.entityId,
				(candidate.entityLabel ?? candidate.entitySlug).replaceAll(/\s+/g, " ").trim(),
				candidate.status,
				candidate.contentBlockId,
				candidate.kind,
				image.isNested ? "yes" : "",
				describeSource(image),
				state.status,
				state.assetKey ?? "",
				blockAction,
				state.note ?? "",
			]);
		}
	}

	await writeTsvReport(reportFilePath, reportColumns, rows);

	for (const [action, count] of counts) {
		log.info(`  ${String(count)} block(s): ${action}`);
	}
	log.info(`Report written to \`${reportFilePath}\`.`);

	if (!apply) {
		log.info("Pass `--apply` to import the images and rewrite the blocks.");
	} else if ((counts.get("skipped-unresolved") ?? 0) > 0 && !dropUnresolved) {
		log.warn(
			"Some blocks hold images that could not be resolved and were left as they are. Fix them by hand, or pass `--drop-unresolved` to remove those images.",
		);
	}
}

try {
	await main();
} catch (error) {
	log.error(error);
	process.exitCode = 1;
} finally {
	await db.$client.end().catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	});
}
