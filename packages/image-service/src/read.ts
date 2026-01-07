import { createReadStream } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { faker as f } from "@faker-js/faker";

import { type AssetMetadata, getImageMetadata } from "./get-image-metadata";

interface Asset {
	fileName: string;
	imageStream: Readable;
	size: number | undefined;
	metadata: AssetMetadata;
}

export async function fromFilePath(filePath: string): Promise<Asset> {
	const inputStream = createReadStream(filePath);

	const metadata = await getImageMetadata(inputStream);

	const fileName = path.basename(filePath).slice(0, -path.extname(filePath).length);

	return { fileName, imageStream: inputStream, size: metadata.size, metadata };
}

export async function fromUrl(url: string): Promise<Asset> {
	const response = await fetch(url);
	const inputStream = Readable.fromWeb(response.body! as ReadableStream);

	const metadata = await getImageMetadata(inputStream);

	const fileName = f.lorem.words({ min: 1, max: 3 });

	return { fileName, imageStream: inputStream, size: metadata.size, metadata };
}
