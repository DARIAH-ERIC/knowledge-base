import { faker as f } from "@faker-js/faker";

import type { Client } from "./admin-client";
import { read } from "./read";

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

	for (const { url } of avatars) {
		const { fileName, stream, metadata } = await read.fromUrl(new URL(url));
		const { objectName } = await client.images.upload(
			`avatar-${fileName}`,
			stream,
			metadata.size,
			metadata,
		);

		seedManifest.avatars.push({ key: objectName });
	}

	for (const { url } of images) {
		const { fileName, stream, metadata } = await read.fromUrl(new URL(url));
		const { objectName } = await client.images.upload(
			`image-${fileName}`,
			stream,
			metadata.size,
			metadata,
		);

		seedManifest.images.push({ key: objectName });
	}

	return seedManifest;
}
