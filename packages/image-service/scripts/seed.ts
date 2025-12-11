import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { log } from "@acdh-oeaw/lib";
import sharp from "sharp";
import * as v from "valibot";

import { env } from "../config/env.config";
import { createMinioClient } from "../src/create-minio-client";
import { generateObjectName } from "../src/generate-object-name";

const bucketName = env.S3_BUCKET;

const ArgsSchema = v.object(
	{ folder: v.pipe(v.string(), v.nonEmpty()) },
	"Please provide a valid image folder path via `--folder`",
);

async function seed() {
	const { values } = parseArgs({ options: { folder: { type: "string", short: "f" } } });
	const { folder } = v.parse(ArgsSchema, values);
	const imagesFolder = path.resolve(folder);

	const client = createMinioClient();

	if (!(await client.bucketExists(bucketName))) {
		await client.makeBucket(bucketName);
	}

	for (const entry of await fs.readdir(imagesFolder, { withFileTypes: true })) {
		if (!entry.isFile()) {
			continue;
		}

		const imageFilePath = path.join(imagesFolder, entry.name);

		const inputStream = createReadStream(imageFilePath);
		const imageStream = inputStream.pipe(sharp());
		const { format, size } = await imageStream.metadata();

		const objectName = generateObjectName(entry.name);
		const metadata = { "Content-Type": `image/${format}` };

		/**
		 * Intentionally not just using `client.fPutObject`, because that derives the mime type
		 * from the file extension.
		 */
		await client.putObject(bucketName, objectName, imageStream, size, metadata);
	}

	log.success("Successfully uploaded images.");
}

seed().catch((error: unknown) => {
	log.error("Failed to upload images.\n", error);
	process.exitCode = 1;
});
