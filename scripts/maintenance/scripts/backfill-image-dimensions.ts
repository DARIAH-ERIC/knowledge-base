import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq, isNull } from "@dariah-eric/database/sql";
import { createStorageService } from "@dariah-eric/storage";
import { type Dimensions, buffer, toDisplayDimensions } from "@dariah-eric/storage/lib";

import { env } from "../config/env.config";
import { writeTsvReport } from "../lib/tsv-report";

/**
 * Measures the stored object behind every image asset that has no recorded `width`/`height` and
 * writes them back. Dry run by default; `--apply` updates the rows.
 *
 * `uploadAsset` records dimensions for anything uploaded after the `assets.width`/`assets.height`
 * columns landed, but every asset that predates them — including everything migrated from WordPress
 * — has null. Consumers need the source's real resolution to build a `srcset` whose width
 * descriptors are true: imgproxy does not enlarge, so a request for a width above the source's own
 * quietly returns the source size, and a descriptor promising more sends the browser's candidate
 * selection off a cliff. Null therefore has to mean "vector, no upper bound" rather than "not
 * measured yet", which is what this closes.
 *
 * Nothing is re-encoded and no object is written. The stored bytes are read and measured, exactly
 * as they will be read and measured by imgproxy, so a re-run is a no-op and an asset whose object
 * has been replaced since is simply measured as it now stands.
 *
 * Vector images are skipped rather than measured. sharp will happily report an svg's viewBox as
 * pixel dimensions, but a vector has no native resolution and no width above which a request stops
 * gaining detail — recording one would truncate a `srcset` that should have no ceiling.
 *
 * @example
 * 	pnpm run data:backfill:image-dimensions
 * 	pnpm run data:backfill:image-dimensions -- --apply
 */

const cacheFolderPath = path.join(process.cwd(), ".cache");
const reportFilePath = path.join(cacheFolderPath, "image-dimensions.tsv");

/** Vector images have no raster resolution, so there is nothing meaningful to record. */
const vectorMimeType = "image/svg+xml";

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

interface CandidateAsset {
	id: string;
	key: string;
	label: string;
	mimeType: string;
}

/**
 * Only rows still missing dimensions are considered, so the script is restartable and a re-run
 * after a partial apply picks up exactly where it stopped.
 */
async function findCandidateAssets(): Promise<Array<CandidateAsset>> {
	return db
		.select({
			id: schema.assets.id,
			key: schema.assets.key,
			label: schema.assets.label,
			mimeType: schema.assets.mimeType,
		})
		.from(schema.assets)
		.where(isNull(schema.assets.width))
		.orderBy(schema.assets.key);
}

type SkipReason = "download-failed" | "unmeasurable" | "vector";

interface Decision {
	asset: CandidateAsset;
	dimensions: Dimensions | undefined;
	action: "measure" | SkipReason;
}

async function readStoredImage(key: string): Promise<Buffer> {
	const stream = (await storage.download(key)).unwrap();

	const chunks: Array<Buffer> = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBufferLike));
	}

	return Buffer.concat(chunks);
}

async function decide(asset: CandidateAsset): Promise<Decision> {
	const base = { asset, dimensions: undefined };

	if (asset.mimeType === vectorMimeType) {
		return { ...base, action: "vector" };
	}

	let dimensions: Dimensions;
	try {
		const image = await readStoredImage(asset.key);
		const metadata = await buffer.getMetadata(image);
		dimensions = toDisplayDimensions(metadata);
	} catch (error) {
		log.error(`Failed to read the stored object for \`${asset.key}\`: ${String(error)}`);
		return { ...base, action: "download-failed" };
	}

	/** Guards against a file sharp accepts but cannot measure, which would write `NaN` columns. */
	if (!Number.isFinite(dimensions.width * dimensions.height)) {
		return { ...base, action: "unmeasurable" };
	}

	return { asset, dimensions, action: "measure" };
}

const reportColumns = [
	"action",
	"asset_id",
	"asset_key",
	"asset_label",
	"mime_type",
	"dimensions",
] as const;

async function writeReport(decisions: Array<Decision>): Promise<void> {
	await writeTsvReport(
		reportFilePath,
		reportColumns,
		decisions.map((decision) => [
			decision.action,
			decision.asset.id,
			decision.asset.key,
			decision.asset.label,
			decision.asset.mimeType,
			decision.dimensions != null
				? `${String(decision.dimensions.width)}×${String(decision.dimensions.height)}`
				: "",
		]),
	);
}

async function applyDecision(decision: Decision): Promise<void> {
	const { asset, dimensions } = decision;

	if (dimensions == null) {
		return;
	}

	await db
		.update(schema.assets)
		.set({ width: dimensions.width, height: dimensions.height })
		.where(eq(schema.assets.id, asset.id));
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");

	log.info("Loading image assets without recorded dimensions…");
	const assets = await findCandidateAssets();

	const decisions: Array<Decision> = [];
	let measured = 0;

	for (const asset of assets) {
		const decision = await decide(asset);
		decisions.push(decision);

		if (decision.action !== "measure") {
			continue;
		}

		log.info(
			`  ${asset.key}: ${String(decision.dimensions!.width)}×${String(decision.dimensions!.height)}`,
		);

		if (apply) {
			await applyDecision(decision);
		}

		measured += 1;
	}

	await writeReport(decisions);

	const skipped = new Map<string, number>();
	for (const decision of decisions) {
		if (decision.action !== "measure") {
			skipped.set(decision.action, (skipped.get(decision.action) ?? 0) + 1);
		}
	}

	log.info(
		`${String(measured)} of ${String(assets.length)} assets ${apply ? "measured" : "to measure"}.`,
	);
	for (const [reason, count] of [...skipped].toSorted((a, b) => b[1] - a[1])) {
		log.info(`  ${String(count)} skipped: ${reason}`);
	}
	log.info(`Report written to \`${reportFilePath}\`.`);

	if (!apply) {
		log.info("Pass `--apply` to record the measured dimensions.");
		return;
	}

	log.success(`Recorded dimensions for ${String(measured)} assets.`);
}

main()
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	})
	// oxlint-disable-next-line typescript/no-misused-promises, typescript/strict-void-return
	.finally(() => db.$client.end());
