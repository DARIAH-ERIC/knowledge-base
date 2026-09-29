import * as p from "drizzle-orm/pg-core";
import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { timestampRange, timestampRangeSchema } from "./fields";

const table = p.pgTable("ranges", {
	required: timestampRange("required"),
	openStart: timestampRange("open_start", { start: "optional" }),
	closed: timestampRange("closed", { end: "required" }),
});

describe("timestampRange", () => {
	it("should parse quoted postgres bounds", () => {
		expect(
			table.required.mapFromDriverValue('["2024-01-15 00:00:00+00","2024-12-31 00:00:00+00"]'),
		).toStrictEqual({
			start: new Date("2024-01-15T00:00:00.000Z"),
			end: new Date("2024-12-31T00:00:00.000Z"),
		});
	});

	it("should parse an unbounded end", () => {
		expect(table.required.mapFromDriverValue('["2024-01-15 00:00:00+00",)')).toStrictEqual({
			start: new Date("2024-01-15T00:00:00.000Z"),
			end: undefined,
		});
		expect(table.required.mapFromDriverValue('["2024-01-15 00:00:00+00",infinity)')).toStrictEqual({
			start: new Date("2024-01-15T00:00:00.000Z"),
			end: undefined,
		});
	});

	it("should parse an unbounded start when the start is optional", () => {
		expect(table.openStart.mapFromDriverValue('(,"2024-12-31 00:00:00+00"]')).toStrictEqual({
			start: undefined,
			end: new Date("2024-12-31T00:00:00.000Z"),
		});
	});

	it("should reject a missing required bound", () => {
		expect(() => {
			table.required.mapFromDriverValue('(,"2024-12-31 00:00:00+00"]');
		}).toThrow(/required start/);
		expect(() => {
			table.closed.mapFromDriverValue('["2024-01-15 00:00:00+00",)');
		}).toThrow(/required end/);
	});

	it("should reject empty ranges", () => {
		expect(() => {
			table.openStart.mapFromDriverValue("empty");
		}).toThrow(/Empty/);
	});

	it("should serialise missing bounds as unbounded", () => {
		const end = new Date("2024-12-31T00:00:00.000Z");

		expect(table.openStart.mapToDriverValue({ end })).toBe("[,2024-12-31T00:00:00.000Z]");
		expect(table.required.mapToDriverValue({ start: new Date("2024-01-15T00:00:00.000Z") })).toBe(
			"[2024-01-15T00:00:00.000Z,]",
		);
	});
});

describe("timestampRangeSchema", () => {
	const start = new Date("2024-01-15T00:00:00.000Z");
	const end = new Date("2024-12-31T00:00:00.000Z");

	it("should require a start by default", () => {
		expect(v.is(timestampRangeSchema(), { end })).toBe(false);
		expect(v.is(timestampRangeSchema(), { start })).toBe(true);
	});

	it("should accept a missing start when the start is optional", () => {
		expect(v.is(timestampRangeSchema({ start: "optional" }), { end })).toBe(true);
	});

	it("should require an end when configured", () => {
		expect(v.is(timestampRangeSchema({ end: "required" }), { start })).toBe(false);
	});

	it("should reject a start after the end", () => {
		expect(v.is(timestampRangeSchema(), { start: end, end: start })).toBe(false);
	});
});
