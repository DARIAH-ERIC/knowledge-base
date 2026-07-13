import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import {
	type DerivedRelationFinding,
	type DerivedRelationInterval,
	checkDerivedRelations,
	derivedRelationRules,
} from "@dariah-eric/database/integrity-service";

import { env } from "../config/env.config";

/**
 * Checks person-to-organisational-unit relations which must be entered twice because one is
 * derivable from the other, e.g. a person who is national coordinator (or deputy) for a country
 * must also be a member of the General Assembly governance body for the same period. Flags persons
 * where only one side was entered, or where the durations of the two sides don't match.
 *
 * The rules and check logic live in `@dariah-eric/database/integrity-service`, shared with the
 * admin dashboard's internal page. Read-only; findings are printed and written to a tsv report.
 * Exits with a non-zero exit code when findings exist, so the script can run in ci or a cron job.
 *
 * @example
 * 	pnpm run data:audit:derived-relations
 */

const cacheFolderPath = path.join(process.cwd(), ".cache");
const reportFilePath = path.join(cacheFolderPath, "derived-relations-findings.tsv");

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

function formatIntervals(intervals: Array<DerivedRelationInterval>): string {
	return intervals.map((interval) => `${interval.start} – ${interval.end ?? "ongoing"}`).join("; ");
}

function toTsvCell(value: string): string {
	return value.replaceAll("\t", " ").replaceAll(/\r?\n/g, " ");
}

async function writeReport(findings: Array<DerivedRelationFinding>): Promise<void> {
	const columns = [
		"rule",
		"kind",
		"person_document_id",
		"person_slug",
		"person_label",
		"detail",
		"source_intervals",
		"derived_intervals",
	] as const;
	const rows = findings.map((finding) =>
		[
			finding.rule,
			finding.kind,
			finding.personDocumentId,
			finding.personSlug,
			finding.personLabel,
			finding.detail,
			formatIntervals(finding.sourceIntervals),
			formatIntervals(finding.derivedIntervals),
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

async function main(): Promise<void> {
	log.info(`Checking ${String(derivedRelationRules.length)} derived-relation rule(s)...`);

	const { findings, errors } = await checkDerivedRelations(db);

	for (const error of errors) {
		log.error(error);
	}

	for (const finding of findings) {
		log.warn(
			`[${finding.rule}] [${finding.kind}] ${finding.personLabel}: ${finding.detail}` +
				` Source: [${formatIntervals(finding.sourceIntervals) || "—"}].` +
				` Derived: [${formatIntervals(finding.derivedIntervals) || "—"}].`,
		);
	}

	await writeReport(findings);

	if (findings.length === 0 && errors.length === 0) {
		log.success("No derived-relation integrity issues found.");
		return;
	}

	log.warn(
		`Found ${String(findings.length)} derived-relation issue(s), ${String(errors.length)} rule error(s). Report: ${reportFilePath}`,
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
