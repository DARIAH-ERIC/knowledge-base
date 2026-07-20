import slugify from "@sindresorhus/slugify";
import * as v from "valibot";

/**
 * Normalise a user-typed page path into a canonical, root-relative website pathname: a leading
 * slash followed by slugified segments (`/About/Our Strategy` → `/about/our-strategy`). Returns
 * null when nothing usable remains (empty, or only separators/punctuation), which the caller reads
 * as "no path".
 */
export function normalizePath(value: string): string | null {
	const segments = value
		.split("/")
		.map((segment) => slugify(segment))
		.filter((segment) => segment.length > 0);

	if (segments.length === 0) {
		return null;
	}

	return `/${segments.join("/")}`;
}

/**
 * A page path as typed into the page form. Always optional: only `pages` have a path, it is
 * author-defined (a page's nested URL cannot be derived from its single-segment slug), and the
 * field is not offered once a document is published (its path is then a live URL — see
 * [[updateDraftDocumentPath]]). Normalised with the same rules the value is stored under, so the
 * field accepts what a user naturally types and only refuses input that survives normalisation as
 * nothing at all.
 */
export const EntityPathInputSchema = v.optional(
	v.pipe(
		v.string(),
		v.trim(),
		v.check(
			(value) => value === "" || normalizePath(value) != null,
			"The path must contain letters or numbers that can be used in a URL.",
		),
	),
);

/**
 * The normalised path the user asked for, or null when they left the field empty. Null is the
 * caller's signal to leave the stored path unchanged (paths are never derived, only authored).
 */
export function getRequestedPath(value: string | undefined): string | null {
	if (value == null) {
		return null;
	}

	return normalizePath(value);
}
