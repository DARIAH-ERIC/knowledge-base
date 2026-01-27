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
			.$onUpdate(() => {
				return now();
			}),
		// deletedAt: timestamp("deleted_at"),
	};
}

export const DateRangeSchema = v.pipe(
	v.object({
		start: v.date(),
		end: v.optional(v.date()),
	}),
	v.check(({ start, end }) => {
		return !end || start <= end;
	}),
);

type DateRange = v.InferInput<typeof DateRangeSchema>;

export const dateRange = p.customType<{
	data: DateRange;
	driverData: string;
}>({
	dataType() {
		return "tstzrange";
	},
	toDriver({ start, end }) {
		return `[${start.toISOString()},${end?.toISOString() ?? ""}]`;
	},
	fromDriver(value: string): DateRange {
		const [start, end] = value.slice(1, -1).split(",");

		return {
			start: new Date(String(start)),
			end: new Date(String(end)),
		};
	},
});
