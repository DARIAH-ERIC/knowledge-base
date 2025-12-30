import { createReadStream } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { faker as f } from "@faker-js/faker";
import sharp, { type Metadata } from "sharp";

import type { Client } from "./admin-client";

export interface SeedConfig {
	/** @default "2025-01-01" */
	defaultRefDate?: Date;
	/** default 42 */
	seed?: number;
}

export interface SeedManifest {
	avatars: Array<{
		key: string;
	}>;
	images: Array<{
		key: string;
	}>;
}

export async function seed(client: Client, config: SeedConfig = {}): Promise<SeedManifest> {
	const { defaultRefDate = new Date(Date.UTC(2025, 0, 1)), seed = 42 } = config;

	f.seed(seed);
	f.setDefaultRefDate(defaultRefDate);

	const avatars = f.helpers.multiple(
		() => {
			return { url: f.image.personPortrait() };
		},
		{ count: 25 },
	);

	const images = f.helpers.multiple(
		() => {
			return {
				url: f.image.url({
					height: f.number.int({ min: 600, max: 1200 }),
					width: f.number.int({ min: 600, max: 1200 }),
				}),
			};
		},
		{ count: 25 },
	);

	const seedManifest: SeedManifest = { avatars: [], images: [] };

	function getImageMetadata(metadata: Metadata) {
		const { format, height, orientation, size, width } = metadata;

		return {
			height,
			"mime-type": `image/${format}`,
			orientation,
			size,
			width,
		};
	}

	async function _fromFilePath(filePath: string) {
		const inputStream = createReadStream(filePath);

		const imageStream = inputStream.pipe(sharp());
		const metadata = getImageMetadata(await imageStream.metadata());

		const fileName = path.basename(filePath).slice(0, -path.extname(filePath).length);

		return { fileName, imageStream, size: metadata.size, metadata };
	}

	async function fromUrl(url: string) {
		const response = await fetch(url);
		const inputStream = Readable.fromWeb(response.body! as ReadableStream);

		const imageStream = inputStream.pipe(sharp());
		const metadata = getImageMetadata(await imageStream.metadata());

		const fileName = f.lorem.words({ min: 1, max: 3 });

		return { fileName, imageStream, size: metadata.size, metadata };
	}

	for (const { url } of avatars) {
		const { fileName, imageStream, size, metadata } = await fromUrl(url);
		const { objectName } = await client.images.upload(
			`avatar-${fileName}`,
			imageStream,
			size,
			metadata,
		);

		seedManifest.avatars.push({ key: objectName });
	}

	for (const { url } of images) {
		const { fileName, imageStream, size, metadata } = await fromUrl(url);
		const { objectName } = await client.images.upload(
			`image-${fileName}`,
			imageStream,
			size,
			metadata,
		);

		seedManifest.images.push({ key: objectName });
	}

	return seedManifest;
}
