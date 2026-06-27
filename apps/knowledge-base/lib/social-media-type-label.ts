/**
 * Human-readable labels for social media account types, used in the social media picker (list +
 * tags) and on read-only detail pages.
 */

const socialMediaTypeLabels: Record<string, string> = {
	bluesky: "Bluesky",
	facebook: "Facebook",
	instagram: "Instagram",
	linkedin: "LinkedIn",
	mastodon: "Mastodon",
	twitter: "Twitter",
	vimeo: "Vimeo",
	website: "Website",
	youtube: "YouTube",
	other: "Other",
};

/** Fallback: capitalize the first letter of an unmapped type token. */
function humanize(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getSocialMediaTypeLabel(type: string): string {
	return socialMediaTypeLabels[type] ?? humanize(type);
}
