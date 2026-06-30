import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { eq } from "drizzle-orm";

import { env } from "../config/env.config";

/**
 * News items migrated from WordPress had their `summary` field populated with the
 * WordPress-generated excerpt, which is simply the first ~55 words of the article. These excerpts
 * are usually cut off mid-sentence, so `news.summary` often ends with a dangling, incomplete
 * clause.
 *
 * This script trims each summary back to its last complete sentence (i.e. the last `.`, `!`, or `?`
 * that is a genuine sentence boundary), dropping the trailing partial clause. Summaries that
 * already end on a sentence boundary are left untouched, as are summaries in which no sentence
 * boundary can be detected at all (rather than blanking them out).
 *
 * In both dry-run and apply modes it writes a structured `news-summaries-cleanup.json` report (id,
 * title, before, after for every changed item, plus the items skipped for lacking a boundary) to
 * the current working directory, so the proposed changes can be reviewed in bulk.
 *
 * It is a DRY RUN by default — it writes the report and changes nothing in the database. Pass
 * `--apply` to write the trimmed summaries back to the database. Pass `--self-test` to run the
 * boundary-detection logic against built-in fixtures without touching the database.
 *
 *     pnpm run data:clean:news-summaries              # dry run, prints proposed changes
 *     pnpm run data:clean:news-summaries -- --apply   # write changes
 *     pnpm run data:clean:news-summaries -- --self-test
 */

/**
 * Lower-cased tokens (without the trailing dot) whose trailing `.` is an abbreviation marker, not a
 * sentence boundary. Kept deliberately small and focused on what actually shows up in prose.
 */
const ABBREVIATIONS = new Set([
	"e.g",
	"i.e",
	"etc",
	"al", // "et al."
	"vs",
	"cf",
	"no",
	"vol",
	"pp",
	"dr",
	"prof",
	"mr",
	"mrs",
	"ms",
	"st",
	"inc",
	"ltd",
	"co",
	"u.s",
	"u.k",
	"e.u",
	"a.m",
	"p.m",
	"ph.d",
	"approx",
	"dept",
	"univ",
	"jan",
	"feb",
	"mar",
	"apr",
	"jun",
	"jul",
	"aug",
	"sep",
	"sept",
	"oct",
	"nov",
	"dec",
]);

/**
 * Returns the substring of `summary` up to and including its last genuine sentence terminator, or
 * `null` when no sentence boundary can be detected (the caller leaves such summaries unchanged).
 */
export function trimToLastSentence(summary: string): string | null {
	const text = summary.trim();

	let boundary = -1;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char !== "." && char !== "!" && char !== "?") {
			continue;
		}

		const prev = text[i - 1];
		const next = text[i + 1];

		if (char === ".") {
			// Part of an ellipsis ("..." or "…") — a truncation marker, not a sentence end.
			if (prev === "." || next === ".") {
				continue;
			}
			// Decimal number, e.g. "3.5".
			if (prev != null && /\d/.test(prev) && next != null && /\d/.test(next)) {
				continue;
			}
			// Abbreviation, e.g. "e.g.", "Dr.", "U.S.".
			const wordBefore = /([A-Za-z][A-Za-z.]*)$/.exec(text.slice(0, i))?.[1];
			if (wordBefore != null) {
				const normalized = wordBefore.toLowerCase();
				if (ABBREVIATIONS.has(normalized)) {
					continue;
				}
				// Single-letter initial, e.g. "J. Smith".
				if (/^[A-Za-z]$/.test(wordBefore)) {
					continue;
				}
			}
		}

		boundary = i;
	}

	if (boundary === -1) {
		return null;
	}

	// Include closing quotes/brackets that sit directly after the terminator.
	let end = boundary + 1;
	while (end < text.length && /["'’”)\]]/.test(text[end]!)) {
		end++;
	}

	return text.slice(0, end).trim();
}

const SELF_TEST_CASES: Array<[input: string, expected: string | null]> = [
	// Trailing partial clause is dropped.
	[
		"The event brought researchers together to discuss new methods. They also",
		"The event brought researchers together to discuss new methods.",
	],
	// Already a full sentence — unchanged.
	["A news item seeded for API contract testing.", "A news item seeded for API contract testing."],
	// Abbreviation mid-text is not treated as a boundary.
	["Funded by the U.S. government, the project aims to", null],
	[
		"Funded by the U.S. government. The next phase begins soon and",
		"Funded by the U.S. government.",
	],
	// Decimal numbers are not boundaries.
	[
		"Version 3.5 of the platform was released to the public. Users can now",
		"Version 3.5 of the platform was released to the public.",
	],
	// Ellipsis is not a sentence boundary.
	["The team explored several new approaches…", null],
	["First finding here. The work continues...", "First finding here."],
	// Closing quote after terminator is kept.
	['She said "this changes everything." The team then', 'She said "this changes everything."'],
	// No terminator at all — left unchanged (null).
	["A long opening clause with no sentence end in sight and more words", null],
	// Question / exclamation marks count as boundaries.
	[
		"What does this mean for the field? Researchers are still",
		"What does this mean for the field?",
	],
];

function runSelfTest(): void {
	let failures = 0;
	for (const [input, expected] of SELF_TEST_CASES) {
		const actual = trimToLastSentence(input);
		const ok = actual === expected;
		if (!ok) {
			failures++;
			log.error(
				`FAIL\n  input:    ${JSON.stringify(input)}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`,
			);
		}
	}
	if (failures > 0) {
		log.error(`Self-test: ${String(failures)} of ${String(SELF_TEST_CASES.length)} cases failed.`);
		process.exitCode = 1;
	} else {
		log.success(`Self-test: all ${String(SELF_TEST_CASES.length)} cases passed.`);
	}
}

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

interface ChangeRecord {
	id: string;
	title: string;
	before: string;
	after: string;
}

const REPORT_FILE_PATH = path.resolve(process.cwd(), "news-summaries-cleanup.json");

async function main() {
	const args = new Set(process.argv.slice(2));
	const apply = args.has("--apply");

	const rows = await db
		.select({ id: schema.news.id, title: schema.news.title, summary: schema.news.summary })
		.from(schema.news);

	log.info(`Found ${String(rows.length)} news items.`);

	const changes: Array<ChangeRecord> = [];
	const skippedNoBoundary: Array<{ id: string; title: string; summary: string }> = [];
	let unchanged = 0;

	for (const { id, title, summary } of rows) {
		const trimmed = trimToLastSentence(summary);

		if (trimmed == null) {
			skippedNoBoundary.push({ id, title, summary });
			continue;
		}

		if (trimmed === summary.trim()) {
			unchanged++;
			continue;
		}

		changes.push({ id, title, before: summary, after: trimmed });

		if (apply) {
			await db.update(schema.news).set({ summary: trimmed }).where(eq(schema.news.id, id));
		}
	}

	const report = {
		generatedAt: new Date().toISOString(),
		applied: apply,
		counts: {
			total: rows.length,
			changed: changes.length,
			unchanged,
			skippedNoBoundary: skippedNoBoundary.length,
		},
		changes,
		skippedNoBoundary,
	};

	await fs.writeFile(REPORT_FILE_PATH, `${JSON.stringify(report, null, 2)}\n`, {
		encoding: "utf-8",
	});

	log.info(
		`Summary — changed: ${String(changes.length)}, unchanged: ${String(unchanged)}, skipped (no boundary): ${String(skippedNoBoundary.length)}.`,
	);
	log.info(`Wrote before/after report to ${REPORT_FILE_PATH}`);
	if (!apply) {
		log.info("Dry run only. Re-run with `--apply` to write these changes.");
	} else {
		log.success(`Applied ${String(changes.length)} update(s).`);
	}
}

if (process.argv.includes("--self-test")) {
	runSelfTest();
} else {
	main()
		.catch((error: unknown) => {
			log.error("Failed to clean news summaries.", error);
			process.exitCode = 1;
		})
		// oxlint-disable-next-line typescript/no-misused-promises
		.finally(() =>
			// oxlint-disable-next-line typescript/strict-void-return
			db.$client.end().catch((error: unknown) => {
				log.error("Failed to close database connection.\n", error);
				process.exitCode = 1;
			}),
		);
}
