import type { Meta, StoryObj } from "@storybook/react-vite";
import type { JSONContent } from "@tiptap/core";
import { expect, fn } from "storybook/test";

import { RichTextEditor, RichTextRenderer } from "./rich-text-editor";

const sampleContent: JSONContent = {
	type: "doc",
	content: [
		{
			type: "heading",
			attrs: { level: 1 },
			content: [{ type: "text", text: "Rich text editor" }],
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "This editor supports " },
				{ type: "text", marks: [{ type: "bold" }], text: "bold" },
				{ type: "text", text: ", " },
				{ type: "text", marks: [{ type: "italic" }], text: "italic" },
				{ type: "text", text: ", and " },
				{ type: "text", marks: [{ type: "code" }], text: "inline code" },
				{ type: "text", text: "." },
			],
		},
		{
			type: "heading",
			attrs: { level: 2 },
			content: [{ type: "text", text: "Lists" }],
		},
		{
			type: "bulletList",
			content: [
				{
					type: "listItem",
					content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet item one" }] }],
				},
				{
					type: "listItem",
					content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet item two" }] }],
				},
			],
		},
		{
			type: "orderedList",
			attrs: { start: 1 },
			content: [
				{
					type: "listItem",
					content: [{ type: "paragraph", content: [{ type: "text", text: "Ordered item one" }] }],
				},
				{
					type: "listItem",
					content: [{ type: "paragraph", content: [{ type: "text", text: "Ordered item two" }] }],
				},
			],
		},
		{
			type: "blockquote",
			content: [
				{
					type: "paragraph",
					content: [{ type: "text", text: "A blockquote for emphasis." }],
				},
			],
		},
	],
};

function note(text: string): JSONContent {
	return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

const footnoteContent: JSONContent = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "The hackathon has been running yearly since 2015" },
				{
					type: "footnote",
					attrs: {
						content: note("In the year 2020 the hackathon was not organised due to the pandemic."),
					},
				},
				{ type: "text", text: ", and has been discussed in articles" },
				{
					type: "footnote",
					attrs: {
						content: note(
							"Tolonen, Mikko. 2019. Teaching Digital Humanities at the University of Helsinki. EuropeNow.",
						),
					},
				},
				{ type: "text", text: "." },
			],
		},
	],
};

function cell(type: "tableCell" | "tableHeader", text: string): JSONContent {
	return { type, content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

const tableContent: JSONContent = {
	type: "doc",
	content: [
		{
			type: "table",
			attrs: {
				caption: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{ type: "text", text: "Table 1: ", marks: [{ type: "bold" }] },
								{ type: "text", text: "hackathon participants per year" },
							],
						},
					],
				},
			},
			content: [
				{
					type: "tableRow",
					content: [cell("tableHeader", "Year"), cell("tableHeader", "Participants")],
				},
				{
					type: "tableRow",
					content: [cell("tableCell", "2015"), cell("tableCell", "42")],
				},
				{
					type: "tableRow",
					content: [cell("tableCell", "2016"), cell("tableCell", "58")],
				},
			],
		},
	],
};

const meta = {
	title: "Components/RichTextEditor",
	component: RichTextEditor,
	tags: ["autodocs"],
	argTypes: {
		isEditable: { control: "boolean" },
	},
	args: {
		// oxlint-disable-next-line typescript/strict-void-return
		onChange: fn(),
	},
} satisfies Meta<typeof RichTextEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
	render(props) {
		return (
			<div className="inline-160">
				<RichTextEditor {...props} />
			</div>
		);
	},
};

export const WithContent: Story = {
	args: {
		content: sampleContent,
	},
	render(props) {
		return (
			<div className="inline-160">
				<RichTextEditor {...props} />
			</div>
		);
	},
};

/**
 * The optional blocks are opt-in by name. Nothing else is wired up here — each one inserts itself
 * and its node view opens whatever panel it needs, so the insert menu and the slash menu both offer
 * them without the surrounding form contributing a button.
 */
export const WithOptionalBlocks: Story = {
	args: {
		content: sampleContent,
		blocks: ["embed", "callout", "mediaText", "buttonLink"],
	},
	render(props) {
		return (
			<div className="inline-160">
				<RichTextEditor {...props} />
			</div>
		);
	},
};

/**
 * Footnote markers show only their number — counted from their place in the text, never stored — so
 * the notes themselves are listed under the editor for proof-reading. Clicking a marker opens its
 * note.
 */
export const WithFootnotes: Story = {
	args: {
		content: footnoteContent,
		blocks: ["footnote"],
	},
	render(props) {
		return (
			<div className="inline-160">
				<RichTextEditor {...props} />
			</div>
		);
	},
};

/**
 * A table's caption is stored on the table rather than in it — `prosemirror-tables` reads a table's
 * children as its rows — and assembled into a real `<caption>` element by this node view and by the
 * read paths, so a screen reader announces it as the table's name. It takes the same formatting the
 * image captions do: bold, italic, links and, where the field offers them, footnotes.
 */
export const WithTableCaption: Story = {
	args: {
		content: tableContent,
	},
	async play({ canvas }) {
		const table = canvas.getByRole("table");

		// The caption has to be the table's first child to name it, and the row group is appended by
		// the node view renderer itself — so the order is worth asserting rather than assuming.
		await expect(table.firstElementChild?.tagName).toBe("CAPTION");
		await expect(table).toHaveAccessibleName("Table 1: hackathon participants per year");
	},
	render(props) {
		return (
			<div className="inline-160">
				<RichTextEditor {...props} />
			</div>
		);
	},
};

export const ReadOnly: Story = {
	args: {
		content: sampleContent,
		isEditable: false,
	},
	render(props) {
		return (
			<div className="inline-160">
				<RichTextEditor {...props} />
			</div>
		);
	},
};

export const Renderer: Story = {
	args: {
		content: sampleContent,
	},
	render({ content }) {
		return (
			<div className="inline-160">
				<RichTextRenderer content={content!} />
			</div>
		);
	},
};
