import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import {
	type RichTextMediaContext,
	type RichTextMediaFinding,
	checkRichTextMedia,
	richTextMediaNodeTypes,
} from "@dariah-eric/database/integrity-service";

import { env } from "../config/env.config";

/**
 * Finds media nodes left inside stored rich text where they may not be — a gallery, media-text or
 * embed anywhere in a body, or an image anywhere but directly inside a list item or a plain
 * blockquote (the one nested placement the editor allows, resolved by the api). The editor's
 * splitter turns media elsewhere into typed content blocks, so these did not come from it as they
 * are. Legacy tiptap `image` nodes are reported too.
 *
 * Prints a node-type × container matrix (all versions, with the published share in brackets), then
 * every occurrence; the full list goes to a tsv report. The check logic lives in
 * `@dariah-eric/database/integrity-service`. Read-only. Exits with a non-zero exit code when
 * findings exist.
 *
 * @example
 * 	pnpm run data:audit:rich-text-media
 */

const cacheFolderPath = path.join(process.cwd(), ".cache");
const reportFilePath = path.join(cacheFolderPath, "rich-text-media-findings.tsv");

const contexts: ReadonlyArray<RichTextMediaContext> = [
	"list_item",
	"blockquote",
	"table_cell",
	"top_level",
	"other",
];

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

function toTsvCell(value: string): string {
	return value.replaceAll("\t", " ").replaceAll(/\r?\n/g, " ");
}

async function writeReport(findings: Array<RichTextMediaFinding>): Promise<void> {
	const columns = [
		"node_type",
		"context",
		"path",
		"reference",
		"entity_type",
		"entity_slug",
		"entity_label",
		"field_name",
		"status",
		"block_type",
		"parent_block_type",
		"content_block_id",
	] as const;
	const rows = findings.map((finding) =>
		[
			finding.nodeType,
			finding.context,
			finding.path.join(" > "),
			finding.reference,
			finding.entityType,
			finding.entitySlug,
			finding.entityLabel ?? finding.entitySlug,
			finding.fieldName,
			finding.status,
			finding.blockType,
			finding.parentBlockType ?? "",
			finding.contentBlockId,
		]
			.map((value) => toTsvCell(value))
			.join("\t"),
	);

	await fs.mkdir(cacheFolderPath, { recursive: true });
	await fs.writeFile(
		reportFilePath,
		`${columns.join("\t")}\n${rows.join("\n")}${rows.length > 0 ? "\n" : ""}`,
		{ encoding: "utf-8" },
	);
}

/** "12 (3)": all versions, published share in brackets; blank for zero so the matrix scans. */
function formatMatrix(findings: Array<RichTextMediaFinding>): string {
	const cell = (nodeType: string, context: RichTextMediaContext): string => {
		const matching = findings.filter(
			(finding) => finding.nodeType === nodeType && finding.context === context,
		);
		if (matching.length === 0) {
			return "";
		}
		const published = matching.filter((finding) => finding.status === "published").length;
		return `${String(matching.length)} (${String(published)})`;
	};

	const header = ["", ...contexts];
	const body = richTextMediaNodeTypes.map((nodeType) => [
		nodeType,
		...contexts.map((context) => cell(nodeType, context)),
	]);
	const widths = header.map((_, index) =>
		Math.max(...[header, ...body].map((row) => row[index]!.length)),
	);

	return [header, ...body]
		.map((row) => row.map((value, index) => value.padEnd(widths[index]!)).join("  "))
		.join("\n");
}

async function main(): Promise<void> {
	log.info("Checking stored rich text for media nodes...");

	const { findings, errors } = await checkRichTextMedia(db);

	for (const error of errors) {
		log.error(error);
	}

	await writeReport(findings);

	if (findings.length === 0 && errors.length === 0) {
		log.success("No media nodes found in stored rich text.");
		return;
	}

	log.info(`\n${formatMatrix(findings)}\n`);

	for (const finding of findings) {
		log.warn(
			`[${finding.nodeType} in ${finding.context}] ${finding.entityType}/${finding.entitySlug} (${finding.status}, ${finding.fieldName}): ${finding.path.join(" > ") || "doc"} — ${finding.reference}`,
		);
	}

	const entities = new Set(findings.map((finding) => finding.entityId)).size;
	log.warn(
		`Found ${String(findings.length)} media node(s) across ${String(entities)} entity/entities, ${String(errors.length)} error(s). Report: ${reportFilePath}`,
	);
	process.exitCode = 1;
}

try {
	await main();
} catch (error) {
	log.error(error);
	process.exitCode = 1;
} finally {
	await db.$client.end().catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	});
}
