import { omit } from "@acdh-oeaw/lib";

interface ItemWithEntityVersion {
	entityVersion: {
		updatedAt: Date;
		entity: { slug: string };
	};
}

/**
 * Columns that decide how an entity's featured image is captioned. They are an editing detail: the
 * choice is resolved into `image.caption` (see `withResolvedCaption`) before a response is built,
 * so consumers see one caption and never the rule that produced it.
 */
const featuredImageCaptionColumns = ["imageCaption", "imageCaptionMode"] as const;

export function flattenEntityVersion<T extends ItemWithEntityVersion>(
	item: T,
): Omit<T, "entityVersion" | "imageCaption" | "imageCaptionMode"> & {
	entity: { slug: string };
	publishedAt: string;
} {
	const { entityVersion, ...rest } = item;

	return {
		...omit(rest as Record<string, unknown>, [...featuredImageCaptionColumns]),
		entity: entityVersion.entity,
		publishedAt: entityVersion.updatedAt.toISOString(),
	} as Omit<T, "entityVersion" | "imageCaption" | "imageCaptionMode"> & {
		entity: { slug: string };
		publishedAt: string;
	};
}
