import { createReadStream } from "node:fs";
import * as path from "node:path";

import sharp from "sharp";

import { createClient } from "./client";

interface SeedConfig {
	images: Array<{
		filePath: string;
	}>;
}

interface SeedManifest {
	assets: Array<{
		key: string;
	}>;
}

export async function seed(config: SeedConfig): Promise<SeedManifest> {
	const { images } = config;

	const client = createClient();

	if (!(await client.bucket.exists())) {
		await client.bucket.create();
	}

	const assets: Array<{ key: string }> = [];

	for (const { filePath } of images) {
		const fileName = path.basename(filePath);

		const inputStream = createReadStream(filePath);
		const imageStream = inputStream.pipe(sharp());
		const { format, size } = await imageStream.metadata();
		const metadata = { "Content-Type": `image/${format}` };

		const { objectName } = await client.images.upload(fileName, imageStream, size, metadata);

		assets.push({ key: objectName });
	}

	return { assets };
}
