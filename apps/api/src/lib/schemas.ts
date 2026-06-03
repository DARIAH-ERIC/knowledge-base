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

export const PaginationQuerySchema = v.object({
	limit: v.pipe(
		v.optional(
			v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1), v.maxValue(maxLimit)),
			"10",
		),
		v.description("Maximum number of items in paginated list"),
		v.metadata({ ref: "LimitParam" }),
	),
	offset: v.pipe(
		v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)), "0"),
		v.description("Offset in paginated list"),
		v.metadata({ ref: "OffsetParam" }),
	),
});

export const PaginatedResponseSchema = v.object({
	limit: v.number(),
	offset: v.number(),
	total: v.number(),
});

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
		links: v.array(v.string()),
	}),
);
