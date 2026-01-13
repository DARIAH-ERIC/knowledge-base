import { createReadStream } from "node:fs";
import * as path from "node:path";
import { PassThrough, Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { isErr, request } from "@acdh-oeaw/lib";
import slugify from "@sindresorhus/slugify";

import { getImageMetadata } from "./get-image-metadata";

function tee(source: Readable): [PassThrough, PassThrough] {
	const a = new PassThrough();
	const b = new PassThrough();

	source.pipe(a);
	source.pipe(b);

	return [a, b];
}

async function fromFilePath(filePath: string) {
	const [stream, meta] = tee(createReadStream(filePath));
	const metadata = await getImageMetadata(meta);

	const fileName = slugify(path.basename(filePath).slice(0, -path.extname(filePath).length));

	return { fileName, stream, metadata };
}

async function fromUrl(url: URL) {
	const result = await request(url, { responseType: "stream" });

	if (isErr(result)) {
		throw result.error;
	}

	const [stream, meta] = tee(Readable.fromWeb(result.value.data as ReadableStream));
	const metadata = await getImageMetadata(meta);

	const filePath = url.pathname;
	const fileName = slugify(path.basename(filePath).slice(0, -path.extname(filePath).length));

	return { fileName, stream, metadata };
}

export const read = {
	fromFilePath,
	fromUrl,
};
