import { faker as f } from "@faker-js/faker";

import type { Client } from "./admin-client";
import { stream } from "./stream";

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
		const input = await stream.fromUrl(new URL(url));
		const [metadata, _stream] = await stream.getMetadata(input);

		const { key } = await client.images.upload({
			input: _stream,
			metadata,
			prefix: "avatars",
			size: metadata.size,
		});

		seedManifest.avatars.push({ key });
	}

	for (const { url } of images) {
		const input = await stream.fromUrl(new URL(url));
		const [metadata, _stream] = await stream.getMetadata(input);

		const { key } = await client.images.upload({
			input: _stream,
			metadata,
			prefix: "images",
			size: metadata.size,
		});

		seedManifest.images.push({ key });
	}

	return seedManifest;
}
