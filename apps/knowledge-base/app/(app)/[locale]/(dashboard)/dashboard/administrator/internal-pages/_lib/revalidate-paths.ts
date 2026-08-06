/**
 * Internal pages are edited in the dashboard but rendered by fixed public routes, so every action
 * which changes what is live — update, publish, discard — has to revalidate all of them.
 *
 * `"/[locale]"` is the home page route. Revalidation runs in "layout" mode, which makes that entry
 * subsume the others; they are listed anyway so the set of affected routes stays readable, and so
 * that narrowing the home-page entry later does not silently drop them.
 */
export const internalPagesRevalidatePaths = [
	"/[locale]/dashboard/administrator/internal-pages",
	"/[locale]",
	"/[locale]/contact",
	"/[locale]/privacy-policy",
	"/[locale]/terms-of-use",
] as const;
