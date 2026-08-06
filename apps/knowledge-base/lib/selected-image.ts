import type { JSONContent } from "@tiptap/core";

/**
 * A picked asset as an editing screen knows it. Only `key` and `url` are needed to submit and
 * preview the selection; the rest is metadata the summary surfaces so authors can see - and correct
 * - what they picked without leaving the form.
 *
 * Lives here rather than beside the card that renders it because the content-block types embed it,
 * and those are read by the public site's renderer as well as by the dashboard's editor.
 */
export interface SelectedImage {
	key: string;
	url: string;
	id?: string | null;
	label?: string | null;
	alt?: string | null;
	caption?: JSONContent | null;
	license?: { code: string; name: string } | null;
	licenseId?: string | null;
	mimeType?: string | null;
	size?: number | null;
}
