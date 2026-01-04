/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { client } from "@dariah-eric/dariah-knowledge-base-image-service/client";

export async function getAssets() {
	const { images } = await client.images.get();

	const urls = images.map((image) => {
		const { url } = client.urls.generate(image.objectName, { width: 400 });

		return url;
	});

	return urls;
}
