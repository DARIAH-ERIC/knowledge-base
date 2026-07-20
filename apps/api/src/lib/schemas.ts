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
 * A person's current roles in organisational units. Shared by every endpoint that embeds persons,
 * so the shape stays identical across them.
 */
export const PersonPositionSchema = v.nullable(
	v.array(
		v.object({
			role: v.picklist(schema.personRoleTypesEnum),
			name: v.string(),
			slug: v.string(),
			type: v.picklist(schema.organisationalUnitTypesEnum),
			href: v.pipe(
				v.nullable(v.string()),
				v.description(
					"Root-relative, locale-less website href of the organisational unit; null when it has no page. Prepend locale and origin.",
				),
			),
			description: v.nullable(v.string()),
		}),
	),
);

export const RelatedEntitiesSchema = v.array(
	v.object({
		id: v.pipe(v.string(), v.uuid()),
		slug: v.string(),
		entityType: v.picklist(publicRelatedEntityTypesEnum),
		label: v.nullable(v.string()),
	}),
);

export const RelatedResourcesSchema = v.array(
	v.object({
		id: v.string(),
		label: v.string(),
		type: v.nullable(v.string()),
		sourceUrl: v.nullable(v.string()),
		links: v.array(v.string()),
	}),
);
