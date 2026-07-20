import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { maxLimit } from "~/config/api.config";

export const publicRelatedEntityTypesEnum = [
	"documents_policies",
	"events",
	"funding_calls",
	"impact_case_studies",
	"news",
	"opportunities",
	"pages",
	"persons",
	"projects",
	"spotlight_articles",
	...schema.organisationalUnitTypesEnum,
] as const satisfies ReadonlyArray<
	(typeof schema.entityTypesEnum)[number] | (typeof schema.organisationalUnitTypesEnum)[number]
>;

export type PublicRelatedEntityType = (typeof publicRelatedEntityTypesEnum)[number];

/** Entity types not in the public vocabulary (documentation and internal pages) are never exposed. */
export function isPublicRelatedEntityType(type: string): type is PublicRelatedEntityType {
	return (publicRelatedEntityTypesEnum as ReadonlyArray<string>).includes(type);
}

export const LicenseSchema = v.object({
	name: v.string(),
	url: v.string(),
});

export const ImageSchema = v.object({
	url: v.string(),
	alt: v.nullable(v.string()),
	/** Richtext caption as Tiptap JSON (bold/italic/link); consumers render it like other richtext. */
	caption: v.nullable(v.any()),
	license: v.nullable(LicenseSchema),
});

export const PaginationQuerySchema = v.object({
	limit: v.pipe(
		v.optional(
			v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1), v.maxValue(maxLimit)),
			"10",
		),
		v.description("Maximum number of items in paginated list"),
	),
	offset: v.pipe(
		v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)), "0"),
		v.description("Offset in paginated list"),
	),
});

export const PaginatedResponseSchema = v.object({
	limit: v.number(),
	offset: v.number(),
	total: v.number(),
});

/**
 * Duration/date fields are stored as a UTC calendar date — the time is pinned to midnight UTC as a
 * placeholder, so consumers should treat the value as a plain date and never localize it.
 */
export const CalendarDateSchema = v.pipe(
	v.string(),
	v.isoTimestamp(),
	v.description(
		"Calendar date (day granularity); the time-of-day component carries no meaning. Do not convert to local time, or the day may shift.",
	),
);

/**
 * A reference to another entity. Every place that points at an entity — positions, related
 * entities, navigation items, article credits — uses this exact shape, so consumers need a single
 * code path to render a link, and a new field (e.g. `href`) is added in one place.
 */
export const EntityRefSchema = v.pipe(
	v.object({
		/** Document id (stable across versions), not the id of a particular version. */
		id: v.pipe(v.string(), v.uuid()),
		type: v.picklist(publicRelatedEntityTypesEnum),
		slug: v.string(),
		/**
		 * Display name of the entity; null when the source has none to offer (e.g. navigation items,
		 * which carry their own author-chosen label).
		 */
		label: v.nullable(v.string()),
		href: v.pipe(
			v.nullable(v.string()),
			v.description(
				"Root-relative, locale-less website href; null when the entity has no page. Prepend locale and origin.",
			),
		),
	}),
	v.description("Reference to an entity, with its website href"),
	v.metadata({ ref: "EntityRef" }),
);

export type EntityRef = v.InferOutput<typeof EntityRefSchema>;

/**
 * A person's current roles in organisational units — a relation, so the role and its note sit
 * alongside a reference to the unit itself.
 */
export const PersonPositionsSchema = v.nullable(
	v.array(
		v.object({
			role: v.picklist(schema.personRoleTypesEnum),
			description: v.nullable(v.string()),
			entity: EntityRefSchema,
		}),
	),
);

export const RelatedEntitiesSchema = v.array(EntityRefSchema);

export const RelatedResourcesSchema = v.array(
	v.object({
		id: v.string(),
		label: v.string(),
		type: v.nullable(v.string()),
		sourceUrl: v.nullable(v.string()),
		links: v.array(v.string()),
	}),
);
