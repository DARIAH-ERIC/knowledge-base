import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import { eq } from "drizzle-orm";

import { cacheFolderPath } from "../config/data-migration.config";
import { env } from "../config/env.config";
import {
	type OverExtendedLink,
	cleanTiptapDoc,
	findMidTextHardBreaks,
	findOverExtendedLinks,
} from "../src/lib/clean-tiptap-content";

/**
 * Post-migration cleanup for WordPress-originated rich text. Normalises the TipTap JSON stored in
 * rich_text and accordion content blocks (see `clean-tiptap-content.ts` for the rules) and writes a
 * report of over-extended links that need manual fixing.
 *
 * Idempotent: only rows whose content actually changes are updated. Pass `--dry-run` to report what
 * would change without writing.
 */

const isDryRun = process.argv.includes("--dry-run");

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
	},
	logger: false,
}).unwrap();

/** Serialises with sorted keys so that Postgres `jsonb` key reordering is not seen as a change. */
function stableStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}
	if (value !== null && typeof value === "object") {
		return `{${Object.keys(value)
			.toSorted()
			.map(
				(key) =>
					`${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
			)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function changed(before: JSONContent, after: JSONContent): boolean {
	return stableStringify(before) !== stableStringify(after);
}

interface AccordionItem {
	title: string;
	content: JSONContent;
}

function linkLine(issue: OverExtendedLink): string {
	return `${issue.href ?? "(no href)"}\t${issue.text}`;
}

async function writeReport(filePath: string, rows: Array<{ source: string; text: string }>) {
	if (rows.length === 0) {
		return;
	}
	await fs.mkdir(cacheFolderPath, { recursive: true });
	const report = rows.map(({ source, text }) => `${source}\t${text}`).join("\n");
	await fs.writeFile(filePath, `${report}\n`, { encoding: "utf-8" });
}

const linkReportFilePath = path.join(cacheFolderPath, "wordpress-link-issues.log");
const hardBreakReportFilePath = path.join(cacheFolderPath, "wordpress-hardbreak-review.log");

async function main() {
	log.info(isDryRun ? "Cleaning WordPress content (dry run)..." : "Cleaning WordPress content...");

	const linkIssues: Array<{ source: string; text: string }> = [];
	const hardBreaks: Array<{ source: string; text: string }> = [];
	let richTextChanged = 0;
	let accordionChanged = 0;

	const richTextBlocks = await db.query.richTextContentBlocks.findMany({
		columns: { id: true, content: true },
	});

	for (const block of richTextBlocks) {
		const cleaned = cleanTiptapDoc(block.content);

		for (const issue of findOverExtendedLinks(cleaned)) {
			linkIssues.push({ source: `rich_text:${block.id}`, text: linkLine(issue) });
		}
		for (const hardBreak of findMidTextHardBreaks(cleaned)) {
			hardBreaks.push({ source: `rich_text:${block.id}`, text: hardBreak.text });
		}

		if (!changed(block.content, cleaned)) {
			continue;
		}

		richTextChanged += 1;
		if (!isDryRun) {
			await db
				.update(schema.richTextContentBlocks)
				.set({ content: cleaned })
				.where(eq(schema.richTextContentBlocks.id, block.id));
		}
	}

	const accordionBlocks = await db.query.accordionContentBlocks.findMany({
		columns: { id: true, items: true },
	});

	for (const block of accordionBlocks) {
		const items = block.items as Array<AccordionItem>;

		const cleanedItems = items.map((item) => {
			const cleaned = cleanTiptapDoc(item.content);
			for (const issue of findOverExtendedLinks(cleaned)) {
				linkIssues.push({ source: `accordion:${block.id}`, text: linkLine(issue) });
			}
			for (const hardBreak of findMidTextHardBreaks(cleaned)) {
				hardBreaks.push({ source: `accordion:${block.id}`, text: hardBreak.text });
			}
			return { ...item, content: cleaned };
		});

		const blockChanged = cleanedItems.some((item, index) =>
			changed(items[index]!.content, item.content),
		);

		if (!blockChanged) {
			continue;
		}

		accordionChanged += 1;
		if (!isDryRun) {
			await db
				.update(schema.accordionContentBlocks)
				.set({ items: cleanedItems })
				.where(eq(schema.accordionContentBlocks.id, block.id));
		}
	}

	await writeReport(linkReportFilePath, linkIssues);
	await writeReport(hardBreakReportFilePath, hardBreaks);

	log.success(
		`${isDryRun ? "[dry run] " : ""}Cleaned ${String(richTextChanged)} rich_text block(s) and ${String(
			accordionChanged,
		)} accordion block(s).`,
	);
	log.info(
		`Over-extended links: ${String(linkIssues.length)}${
			linkIssues.length > 0 ? ` (report: ${linkReportFilePath})` : ""
		}.`,
	);
	log.info(
		`Mid-text line breaks kept for review: ${String(hardBreaks.length)}${
			hardBreaks.length > 0 ? ` (report: ${hardBreakReportFilePath})` : ""
		}.`,
	);
}

main()
	.then(() => db.$client.end())
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	});
