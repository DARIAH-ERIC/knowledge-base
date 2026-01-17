import type { Options } from "@imgproxy/imgproxy-js-core";
import { generateImageUrl } from "@imgproxy/imgproxy-node";

import { env } from "../config/env.config";

export type ImageUrlOptions = Options

export function generateSignedImageUrl(
	bucketName: string,
	key: string,
	options: ImageUrlOptions,
): string {
	const url = generateImageUrl({
		endpoint: env.IMGPROXY_BASE_URL,
		key: env.IMGPROXY_KEY,
		options,
		salt: env.IMGPROXY_SALT,
		url: `s3://${bucketName}/${key}`,
	});

	return url;
}
