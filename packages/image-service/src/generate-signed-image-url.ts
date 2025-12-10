import { generateImageUrl, type IGenerateImageUrl } from "@imgproxy/imgproxy-node";

import { env } from "../config/env.config";

export type Options = NonNullable<IGenerateImageUrl["options"]>;

export function generateSignedImageUrl(
	bucketName: string,
	objectName: string,
	options: Options,
): string {
	const url = generateImageUrl({
		endpoint: env.IMGPROXY_BASE_URL,
		key: env.IMGPROXY_KEY,
		options,
		salt: env.IMGPROXY_SALT,
		url: `s3://${bucketName}/${objectName}`,
	});

	return url;
}
