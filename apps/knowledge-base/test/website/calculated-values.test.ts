import {
	type CalculatedValueKind,
	type ResolvedCalculatedValues,
	annotateCalculatedValues,
	calculatedValueKindLabels,
	collectCalculatedValueKinds,
} from "@dariah-eric/database/calculated-values";
import { formatCalculatedValue, toPlainText } from "@dariah-eric/ui/rich-text";
import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

function calculatedValue(kind: string, label?: string): JSONContent {
	return { type: "calculatedValue", attrs: { kind, label: label ?? null } };
}

function doc(...content: Array<JSONContent>): JSONContent {
	return { type: "doc", content: [{ type: "paragraph", content }] };
}

const memberCountries = [
	{ name: "Austria", slug: "austria" },
	{ name: "Belgium", slug: "belgium" },
	{ name: "Croatia", slug: "croatia" },
];

const values: ResolvedCalculatedValues = new Map<
	CalculatedValueKind,
	number | Array<{ name: string; slug: string }>
>([
	["member_countries_count", 23],
	["member_countries_list", memberCountries],
]);

describe("collectCalculatedValueKinds", () => {
	it("finds kinds nested anywhere in a JSON structure", () => {
		const blocks = [
			{ type: "rich_text", content: doc(calculatedValue("member_countries_count")) },
			{
				type: "accordion",
				content: {
					items: [{ title: "a", content: doc(calculatedValue("member_countries_list")) }],
				},
			},
		];

		expect(collectCalculatedValueKinds(blocks)).toStrictEqual(
			new Set(["member_countries_count", "member_countries_list"]),
		);
	});

	it("ignores unknown kinds and unrelated nodes", () => {
		const content = doc({ type: "text", text: "hello" }, calculatedValue("not_a_real_kind"), {
			type: "buttonLink",
			attrs: { label: "x" },
		});

		expect(collectCalculatedValueKinds(content)).toStrictEqual(new Set());
		expect(collectCalculatedValueKinds(null)).toStrictEqual(new Set());
	});
});

describe("annotateCalculatedValues", () => {
	it("attaches resolved data as a value attribute, keeping the node", () => {
		const content = doc(
			{ type: "text", text: "DARIAH has " },
			calculatedValue("member_countries_count"),
			{ type: "text", text: " member countries." },
		);

		const annotated = annotateCalculatedValues(content, values);

		expect(annotated.content?.[0]?.content?.[1]).toStrictEqual({
			type: "calculatedValue",
			attrs: { kind: "member_countries_count", label: null, value: 23 },
		});
	});

	it("leaves nodes with unresolved kinds untouched", () => {
		const node = calculatedValue("working_groups_count");
		const content = doc(node);

		const annotated = annotateCalculatedValues(content, values);

		expect(annotated.content?.[0]?.content?.[0]).toBe(node);
	});

	it("returns the input reference unchanged when nothing matches", () => {
		const content = doc({ type: "text", text: "plain" });

		expect(annotateCalculatedValues(content, values)).toBe(content);
	});
});

describe("formatCalculatedValue", () => {
	it("renders counts as digits and lists as conjunction-joined names", () => {
		expect(formatCalculatedValue({ value: 23 })).toBe("23");
		expect(formatCalculatedValue({ value: memberCountries })).toBe("Austria, Belgium, and Croatia");
	});

	it("returns null for unresolved nodes", () => {
		expect(formatCalculatedValue({ kind: "member_countries_count", value: null })).toBeNull();
		expect(formatCalculatedValue(null)).toBeNull();
	});
});

describe("toPlainText", () => {
	it("flattens annotated nodes to their formatted value", () => {
		const content = annotateCalculatedValues(
			doc(
				{ type: "text", text: "Members: " },
				calculatedValue("member_countries_list"),
				{ type: "text", text: " (" },
				calculatedValue("member_countries_count"),
				{ type: "text", text: " countries)." },
			),
			values,
		);

		expect(toPlainText(content)).toBe("Members: Austria, Belgium, and Croatia (23 countries).");
	});

	it("falls back to the label for raw references", () => {
		const content = doc(
			calculatedValue("working_groups_count", calculatedValueKindLabels.working_groups_count),
		);

		expect(toPlainText(content)).toBe(calculatedValueKindLabels.working_groups_count);
	});
});
