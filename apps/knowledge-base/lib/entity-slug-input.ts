import slugify from "@sindresorhus/slugify";
import * as v from "valibot";

/**
 * A slug as typed into an entity form. Always optional: leaving it empty on create means "derive
 * one from the title", and the field is not offered at all once a document is published.
 *
 * Normalised with the same slugifier that derives slugs from titles, so the field accepts what a
 * user naturally types ("My Page") and stores what a URL needs ("my-page") rather than rejecting
 * it. Only input that survives slugification as nothing at all is refused, since that cannot
 * address a page.
 */
export const EntitySlugInputSchema = v.optional(
	v.pipe(
		v.string(),
		v.trim(),
		v.check(
			(value) => value === "" || slugify(value) !== "",
			"The slug must contain letters or numbers that can be used in a URL.",
		),
	),
);

/**
 * The normalised slug the user asked for, or null when they left the field empty.
 *
 * Null is the caller's signal to derive a slug from the title instead — the two cases must stay
 * distinguishable, because a slug the user chose is held to a collision error while a derived one
 * is quietly deduplicated.
 */
export function getRequestedSlug(value: string | undefined): string | null {
	if (value == null) {
		return null;
	}

	const slug = slugify(value);

	return slug === "" ? null : slug;
}
