import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { type ReferenceBlock, planFootnoteBackfill } from "./footnote-references";

/**
 * The fixtures below are the shapes the three impact case studies sampled while writing this
 * actually have, taken from running their WordPress HTML back through the migration's parser:
 * bracketed lists cited with parentheses, two entries sharing one paragraph across a hard break,
 * numbers cited that nothing defines, entries nothing cites, and a `*` note.
 */

function text(value: string): JSONContent {
	return { type: "text", text: value };
}

function link(value: string, href: string): JSONContent {
	return { type: "text", text: value, marks: [{ type: "link", attrs: { href } }] };
}

function paragraph(...content: Array<JSONContent>): JSONContent {
	return { type: "paragraph", content };
}

function heading(level: number, value: string): JSONContent {
	return { type: "heading", attrs: { level }, content: [text(value)] };
}

const evidenceHeading = heading(2, "Evidence of the Impact");
const rule: JSONContent = { type: "horizontalRule" };

function block(position: number, ...content: Array<JSONContent>): ReferenceBlock {
	return {
		blockId: `block-${String(position)}`,
		position,
		content: { type: "doc", content },
	};
}

/** Every footnote of a planned block, as the note text a reader would see. */
function notesOf(content: JSONContent): Array<string> {
	const notes: Array<string> = [];

	function visit(node: JSONContent) {
		if (node.type === "footnote") {
			const note = node.attrs?.content as JSONContent | undefined;
			notes.push(
				(note?.content?.[0]?.content ?? [])
					.map((child) => child.text ?? "")
					.join("")
					.trim(),
			);
			return;
		}
		for (const child of node.content ?? []) {
			visit(child);
		}
	}

	visit(content);

	return notes;
}

function plainText(content: JSONContent): string {
	function visit(node: JSONContent): string {
		if (typeof node.text === "string") {
			return node.text;
		}
		return (node.content ?? []).map((child) => visit(child)).join("");
	}

	return visit(content);
}

describe("planFootnoteBackfill", () => {
	it("pairs bracketed markers with their entries and takes the entries out of the list", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("Publications include the 2017 group [1] and the 2019 group [2].")),
				rule,
				evidenceHeading,
				paragraph(text("[1] Dominowska et al. 2019. Hiding in Plain Sight. "), link("url", "/a")),
				paragraph(text("[2] Ros and Oberbichler. 2020. The Helsinki Hackathon.")),
			),
		]);

		expect(plan?.conversions.map((conversion) => conversion.number)).toStrictEqual([1, 2]);
		expect(plan?.reviews).toStrictEqual([]);

		const content = plan!.changes[0]!.content;

		expect(notesOf(content)).toStrictEqual([
			"Dominowska et al. 2019. Hiding in Plain Sight. url",
			"Ros and Oberbichler. 2020. The Helsinki Hackathon.",
		]);
		// The prose keeps its words and loses the numbers, which the markers now carry positionally.
		expect(plainText(content)).toBe("Publications include the 2017 group  and the 2019 group .");
	});

	it("keeps the link marks of an entry inside the note", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("As reported [1].")),
				evidenceHeading,
				paragraph(text("[1] See "), link("the report", "https://example.com/report")),
			),
		]);

		const note = plan!.changes[0]!.content.content![0]!.content![1]!.attrs!.content as JSONContent;

		expect(note.content![0]!.content![1]).toStrictEqual({
			type: "text",
			text: "the report",
			marks: [{ type: "link", attrs: { href: "https://example.com/report" } }],
		});
	});

	it("reads parenthesised markers against a bracketed list, as the UDigiSH study has them", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("UDigiSH started as a cooperation dating back to 2019 (1), including …")),
				paragraph(text("The tool attracted the Geopark network (6).")),
				evidenceHeading,
				paragraph(text("[1] WG was invited to the Urban Transitions Symposium 2019.")),
				paragraph(text("[6] WG tools were discussed at the 16th European Geoparks Conference.")),
			),
		]);

		expect(plan?.conversions.map((conversion) => conversion.marker)).toStrictEqual(["(1)", "(6)"]);
	});

	it("expands a range into one footnote per entry", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("Used to study Spazio Incolto (2-3).")),
				evidenceHeading,
				paragraph(text("[2] Use of WG software in Palermo.")),
				paragraph(text("[3] Municipality of Palermo.")),
			),
		]);

		expect(notesOf(plan!.changes[0]!.content)).toStrictEqual([
			"Use of WG software in Palermo.",
			"Municipality of Palermo.",
		]);
	});

	it("leaves an ordinary parenthetical alone, however numeric", () => {
		// `(2021)` and `(Spain)` are everywhere in these articles; only a number the list defines is a
		// citation. `(4)` here resolves to nothing, so it stays as typed.
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(
					text("The ERASMUS+ ViRAL Project (2018-1-AT01-KA204-039209) ran in Dornbirn (4)."),
				),
				paragraph(text("Kunstraum Dornbirn (2021) exhibited the work (1).")),
				evidenceHeading,
				paragraph(text("[1] Kunstraum Dornbirn.")),
			),
		]);

		expect(plan?.conversions.map((conversion) => conversion.marker)).toStrictEqual(["(1)"]);
		expect(plainText(plan!.changes[0]!.content)).toContain("(2018-1-AT01-KA204-039209)");
		expect(plainText(plan!.changes[0]!.content)).toContain("Dornbirn (4)");
		expect(plainText(plan!.changes[0]!.content)).toContain("Dornbirn (2021)");
	});

	it("splits entries that share a paragraph across a hard break", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("PAX shared it [14] and the game was played [15].")),
				evidenceHeading,
				paragraph(
					text("[14] PAX on Twitter: "),
					link("twitter.com/pax", "https://twitter.com/pax"),
					{ type: "hardBreak" },
					text("[15] User analytics of the Cordoba Court game (2023)."),
				),
			),
		]);

		expect(notesOf(plan!.changes[0]!.content)).toStrictEqual([
			"PAX on Twitter: twitter.com/pax",
			"User analytics of the Cordoba Court game (2023).",
		]);
	});

	it("reports a cited number the list never defines, and leaves the marker as typed", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("Central conditions of research funding [4], and the platform [9].")),
				evidenceHeading,
				paragraph(text("[9] The Open Science Policy Platform.")),
			),
		]);

		expect(plan?.reviews).toStrictEqual([
			{
				kind: "missing-entry",
				number: 4,
				detail: expect.stringContaining("no such entry") as unknown as string,
			},
		]);
		expect(plainText(plan!.changes[0]!.content)).toContain("research funding [4]");
	});

	it("reports an entry no marker cites, and leaves it in the list", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("Through OpenAIRE we connected thematic data services [33].")),
				evidenceHeading,
				paragraph(text("[31] Engelhardt, Claudia et al.")),
				paragraph(text("[33] Tóth-Czifra. DARIAH Community Gateway.")),
			),
		]);

		expect(plan?.reviews.map((review) => [review.kind, review.number])).toStrictEqual([
			["uncited-entry", 31],
		]);
		expect(plainText(plan!.changes[0]!.content)).toContain("[31] Engelhardt, Claudia et al.");
	});

	it("reports an ambiguous number rather than guessing which entry was meant", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("As shown [7].")),
				evidenceHeading,
				paragraph(text("[7] Kunstraum Dornbirn.")),
				paragraph(text("[7] A different source entirely.")),
			),
		]);

		expect(plan?.reviews.map((review) => [review.kind, review.number])).toStrictEqual([
			["duplicate-entry", 7],
		]);
		expect(plan?.conversions).toStrictEqual([]);
		expect(plan?.changes).toStrictEqual([]);
	});

	it("reports a `*` note without touching it", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("The hackathon has been running yearly since 2015*, starting as a course.")),
				paragraph(text("* In the year 2020 the hackathon was not organised due to the pandemic.")),
				paragraph(text("Publications include the 2017 group [1].")),
				evidenceHeading,
				paragraph(text("[1] Dominowska et al.")),
			),
		]);

		expect(plan?.reviews.map((review) => review.kind)).toStrictEqual(["asterisk-note"]);
		expect(plainText(plan!.changes[0]!.content)).toContain("* In the year 2020");
	});

	it("removes the heading once the list it names is empty", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("As reported [1].")),
				rule,
				evidenceHeading,
				paragraph(text("[1] Dominowska et al.")),
				rule,
				heading(2, "Contributors"),
				paragraph(text("Lead Authors: Jouni Tuominen, Mikko Tolonen")),
			),
		]);

		expect(plan!.changes[0]!.content.content!.map((node) => node.type)).toStrictEqual([
			"paragraph",
			"horizontalRule",
			"heading",
			"paragraph",
		]);
		expect(plainText(plan!.changes[0]!.content)).not.toContain("Evidence of the Impact");
	});

	it("keeps the heading while anything under it survives", () => {
		const plan = planFootnoteBackfill([
			block(
				0,
				paragraph(text("As reported [1].")),
				evidenceHeading,
				paragraph(text("[1] Dominowska et al.")),
				paragraph(text("Other examples include republishing DARIAH materials.")),
			),
		]);

		expect(plainText(plan!.changes[0]!.content)).toContain("Evidence of the Impact");
		expect(plainText(plan!.changes[0]!.content)).toContain("Other examples include");
	});

	it("works across the blocks an image split the article into", () => {
		// The migration starts a new `rich_text` block at every image, so the prose and the list it
		// cites routinely sit in different blocks of the same version.
		const plan = planFootnoteBackfill([
			block(0, paragraph(text("Publications include the 2017 group [1]."))),
			block(2, evidenceHeading, paragraph(text("[1] Dominowska et al."))),
		]);

		expect(plan?.changes.map((change) => change.blockId)).toStrictEqual(["block-0", "block-2"]);
		expect(notesOf(plan!.changes[0]!.content)).toStrictEqual(["Dominowska et al."]);
		expect(plan!.changes[1]!.content.content).toStrictEqual([]);
	});

	it("plans nothing for an article without an evidence list", () => {
		expect(
			planFootnoteBackfill([block(0, paragraph(text("A news item citing nothing at all.")))]),
		).toBeNull();
	});

	it("plans nothing on a second pass over converted content", () => {
		const blocks = [
			block(
				0,
				paragraph(text("Publications include the 2017 group [1].")),
				evidenceHeading,
				paragraph(text("[1] Dominowska et al.")),
			),
		];

		const first = planFootnoteBackfill(blocks)!;
		const second = planFootnoteBackfill(
			first.changes.map((change) => {
				return { blockId: change.blockId, position: 0, content: change.content };
			}),
		);

		expect(second).toBeNull();
	});
});
