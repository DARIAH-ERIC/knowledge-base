import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

export const StatisticBaseSchema = v.pipe(
	v.object({
		...v.pick(schema.StatisticSelectSchema, ["status", "type", "total"]).entries,
	}),
	v.description("Statistics"),
	v.metadata({ ref: "StatisticsBase" }),
);

export type StatisticsBase = v.InferOutput<typeof StatisticBaseSchema>;

export const StatisticsSchema = v.pipe(
	v.array(StatisticBaseSchema),
	v.description("Statistics"),
	v.metadata({ ref: "GetStatistics" }),
);

export type Statistics = v.InferOutput<typeof StatisticsSchema>;

export const GetStatistics = {
	ResponseSchema: v.pipe(
		StatisticsSchema,
		v.description("statistics for organisational units"),
		v.metadata({ ref: "GetStatisticsResponse" }),
	),
};
