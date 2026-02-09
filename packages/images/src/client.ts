import { client as s3 } from "@dariah-eric/storage/client";

import { generateSignedImageUrl, type ImageUrlOptions } from "./generate-signed-image-url";

export type { ImageUrlOptions };

export interface Client {
	urls: {
		generateSignedImageUrl: (params: { key: string; options: ImageUrlOptions }) => { url: string };
	};
}

export function createClient(): Client {
	const urls = {
		generateSignedImageUrl(params: { key: string; options: ImageUrlOptions }) {
			const { key, options } = params;

			const url = generateSignedImageUrl(s3.bucket.name, key, options);

			return { url };
		},
	};

	return {
		urls,
	};
}

export const client = createClient();
