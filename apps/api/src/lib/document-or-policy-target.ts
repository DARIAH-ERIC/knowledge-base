/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { env } from "~/config/env.config";

function documentUrl(slug: string) {
	return new URL(`/api/v1/documents-policies/slugs/${slug}/document`, env.API_BASE_URL).href;
}

/**
 * Replaces the stored target columns with what a client follows: a download url for an uploaded
 * document, or the external link. Exactly one of `document` and `link` is set.
 */
export function withTarget<
	T extends { documentId: string | null; linkUrl: string | null; entity: { slug: string } },
>(item: T) {
	const { documentId, linkUrl, ...rest } = item;

	return {
		...rest,
		document: documentId != null ? { url: documentUrl(item.entity.slug) } : null,
		link: linkUrl != null ? { url: linkUrl } : null,
	};
}
