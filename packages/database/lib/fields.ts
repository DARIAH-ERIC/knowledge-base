/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as p from "drizzle-orm/pg-core";
import * as v from "valibot";

import { now } from "./functions";

export function timestamp(name: string) {
	return p.timestamp(name, {
		mode: "date",
		precision: 3,
		withTimezone: true,
	});
}

export function timestamps() {
	return {
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => now()),
		// deletedAt: timestamp("deleted_at"),
	};
}

type RangeBound = "required" | "optional";

interface TimestampRangeBounds<TStart extends RangeBound, TEnd extends RangeBound> {
	/** Defaults to `"required"`. */
	start?: TStart;
	/** Defaults to `"optional"`. */
	end?: TEnd;
}

type TimestampRangeBound<
	TKey extends "start" | "end",
	TBound extends RangeBound,
> = TBound extends "required" ? Record<TKey, Date> : Partial<Record<TKey, Date>>;

export type TimestampRange<
	TStart extends RangeBound = "required",
	TEnd extends RangeBound = "optional",
> = TimestampRangeBound<"start", TStart> & TimestampRangeBound<"end", TEnd>;

export function timestampRangeSchema<
	TStart extends RangeBound = "required",
	TEnd extends RangeBound = "optional",
>(bounds?: TimestampRangeBounds<TStart, TEnd>): v.GenericSchema<TimestampRange<TStart, TEnd>> {
	const start = bounds?.start === "optional" ? v.optional(v.date()) : v.date();
	const end = bounds?.end === "required" ? v.date() : v.optional(v.date());

	return v.pipe(
		v.object({ start, end }),
		v.check(({ start, end }) => start == null || end == null || start <= end),
	) as v.GenericSchema<TimestampRange<TStart, TEnd>>;
}

export const TimestampRange = timestampRangeSchema();

export const NullableTimestampRange = v.nullable(TimestampRange);

/**
 * Parses the postgres text output of a range, e.g. `["2024-01-15 00:00:00+00",)`. An empty or
 * infinite bound means the range is unbounded on that side.
 */
function parseTimestampRange(value: string): { start?: Date; end?: Date } {
	if (value === "empty") {
		throw new Error("Empty timestamp ranges are not supported.");
	}

	const [lower = "", upper = ""] = value.slice(1, -1).split(",");

	return { start: parseTimestampRangeBound(lower), end: parseTimestampRangeBound(upper) };
}

function parseTimestampRangeBound(value: string): Date | undefined {
	const unquoted = value.replace(/^"(.*)"$/, "$1");

	if (unquoted === "" || unquoted === "infinity" || unquoted === "-infinity") {
		return undefined;
	}

	return new Date(unquoted);
}

export function timestampRange<
	TStart extends RangeBound = "required",
	TEnd extends RangeBound = "optional",
>(name: string, bounds?: TimestampRangeBounds<TStart, TEnd>) {
	const isStartRequired = bounds?.start !== "optional";
	const isEndRequired = bounds?.end === "required";

	return p.customType<{
		data: TimestampRange<TStart, TEnd>;
		driverData: string;
	}>({
		dataType() {
			return "tstzrange";
		},
		toDriver({ start, end }) {
			return `[${start?.toISOString() ?? ""},${end?.toISOString() ?? ""}]`;
		},
		fromDriver(value) {
			const range = parseTimestampRange(value);

			if (isStartRequired && range.start == null) {
				throw new Error(`Timestamp range "${name}" is missing its required start.`);
			}
			if (isEndRequired && range.end == null) {
				throw new Error(`Timestamp range "${name}" is missing its required end.`);
			}

			return range as TimestampRange<TStart, TEnd>;
		},
	})(name);
}
