import * as v from "valibot";

import { maxLimit } from "~/config/api.config";

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
