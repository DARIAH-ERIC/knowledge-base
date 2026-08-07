import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq } from "@dariah-eric/database/sql";

import { env } from "../config/env.config";
import { type EntityStatusType, groupByEntityVersion } from "../lib/entity-versions";
import {
	type FootnoteBackfillPlan,
	type ReferenceBlock,
	isRichTextDocument,
	planFootnoteBackfill,
} from "../lib/footnote-references";
import { writeTsvReport } from "../lib/tsv-report";

/**
 * Converts the hand-numbered references of migrated impact case studies into footnotes: each `[1]`
 * or `(1)` in the prose becomes a footnote node carrying the matching entry from the article's
 * "Evidence of the Impact" list, and the entry comes out of the list. Dry run by default; `--apply`
 * writes the changes.
 *
 * WordPress had no footnotes, so authors kept the numbering by hand and it drifted — the three
 * articles sampled while writing this all had defects (a list numbered from `[6]`, entries nothing
 * cites, parentheses in the prose against brackets in the list). Pairing them up puts the numbering
 * where it cannot drift: a footnote stores its note, never its number, and both the editor and the
 * renderer count the markers in document order.
 *
 * Impact case studies only, because they are the only entity type where the editor offers footnotes
 * (`hasFootnotes` on their form) — converting elsewhere would leave content no author can
 * maintain.
 *
 * **Apply this only once the public website renders footnotes.** The conversion takes the evidence
 * out of the list and into nodes the current site does not yet render, so applying it early takes
 * the references off the live page. The dry run is safe at any time.
 *
 * Everything ambiguous is left exactly as it is and written to the review report instead: numbers
 * cited that no entry defines, entries no marker cites, a number defined twice, and the `*` notes
 * two of the three articles use, which are too ad hoc to pair automatically and are quicker to redo
 * by hand in the editor.
 *
 * A conversion can empty a `rich_text` block whose only content was the evidence list; those are
 * left in place for `data:clean:empty-content-blocks`, which exists for exactly that.
 *
 * @example
 * 	pnpm run data:backfill:footnotes-from-references
 * 	pnpm run data:backfill:footnotes-from-references -- --apply
 */

const cacheFolderPath = path.join(process.cwd(), ".cache");
const conversionsReportFilePath = path.join(cacheFolderPath, "footnote-conversions.tsv");
const reviewReportFilePath = path.join(cacheFolderPath, "footnote-review.tsv");

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

interface EntityVersion {
	fieldId: string;
	status: EntityStatusType;
	title: string;
	blocks: Array<ReferenceBlock>;
}

/**
 * The `rich_text` blocks of every impact case study version, in position order.
 *
 * Only `rich_text` carries the article's running text: an evidence list is a run of paragraphs, and
 * the markers citing it sit in the prose around it. A `media_text` body could in principle hold a
 * marker, but none of the migrated studies puts one there, and including it would mean pairing a
 * marker against a list in a different kind of block.
 */
async function findImpactCaseStudyBlocks(): Promise<Map<string, Array<EntityVersion>>> {
	const rows = await db
		.select({
			slug: schema.entities.slug,
			title: schema.impactCaseStudies.title,
			status: schema.entityStatus.type,
			blockId: schema.contentBlocks.id,
			fieldId: schema.contentBlocks.fieldId,
			position: schema.contentBlocks.position,
			content: schema.richTextContentBlocks.content,
		})
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.innerJoin(schema.impactCaseStudies, eq(schema.impactCaseStudies.id, schema.entityVersions.id))
		.innerJoin(schema.fields, eq(schema.fields.entityVersionId, schema.entityVersions.id))
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
		)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.fieldId, schema.fields.id))
		.innerJoin(
			schema.contentBlockTypes,
			eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
		)
		.innerJoin(
			schema.richTextContentBlocks,
			eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
		)
		.where(
			and(
				eq(schema.entityTypes.type, "impact_case_studies"),
				eq(schema.entityTypesFieldsNames.fieldName, "content"),
				eq(schema.contentBlockTypes.type, "rich_text"),
			),
		)
		.orderBy(schema.entities.slug, schema.entityStatus.type, schema.contentBlocks.position);

	return groupByEntityVersion(rows, {
		documentKey: (row) => row.slug,
		create: (row): EntityVersion => {
			return { fieldId: row.fieldId, status: row.status, title: row.title, blocks: [] };
		},
		add: (version, row) => {
			version.blocks.push({
				blockId: row.blockId,
				position: row.position,
				content: isRichTextDocument(row.content) ? row.content : null,
			});
		},
	});
}

interface Plan extends FootnoteBackfillPlan {
	slug: string;
	title: string;
	status: EntityStatusType;
}

function buildPlans(versionsBySlug: Map<string, Array<EntityVersion>>): Array<Plan> {
	const plans: Array<Plan> = [];

	// Per version, never pooled: a draft and a published version each hold their own copy of the
	// article, and pairing markers across the two would match a marker against the other's list.
	for (const [slug, versions] of versionsBySlug) {
		for (const version of versions) {
			const plan = planFootnoteBackfill(version.blocks);

			if (plan != null) {
				plans.push({ ...plan, slug, title: version.title, status: version.status });
			}
		}
	}

	return plans;
}

async function writeReports(plans: Array<Plan>): Promise<void> {
	await writeTsvReport(
		conversionsReportFilePath,
		["slug", "title", "status", "number", "marker", "context"],
		plans.flatMap((plan) =>
			plan.conversions.map((conversion) => [
				plan.slug,
				plan.title,
				plan.status,
				String(conversion.number),
				conversion.marker,
				conversion.context,
			]),
		),
	);

	await writeTsvReport(
		reviewReportFilePath,
		["slug", "title", "status", "kind", "number", "detail"],
		plans.flatMap((plan) =>
			plan.reviews.map((review) => [
				plan.slug,
				plan.title,
				plan.status,
				review.kind,
				review.number != null ? String(review.number) : "",
				review.detail,
			]),
		),
	);
}

async function applyPlans(plans: Array<Plan>): Promise<number> {
	let changed = 0;

	for (const plan of plans) {
		if (plan.changes.length === 0) {
			continue;
		}

		// One transaction per version: an article's markers and its list are rewritten together or
		// not at all, so a failure halfway cannot leave markers pointing at entries still in the list.
		await db.transaction(async (tx) => {
			for (const change of plan.changes) {
				await tx
					.update(schema.richTextContentBlocks)
					.set({ content: change.content })
					.where(eq(schema.richTextContentBlocks.id, change.blockId));
				changed += 1;
			}
		});
	}

	return changed;
}

async function main(): Promise<void> {
	const apply = process.argv.includes("--apply");

	log.info("Loading impact case study content blocks…");
	const versionsBySlug = await findImpactCaseStudyBlocks();

	const plans = buildPlans(versionsBySlug);
	await writeReports(plans);

	const conversions = plans.reduce((sum, plan) => sum + plan.conversions.length, 0);
	const reviews = plans.reduce((sum, plan) => sum + plan.reviews.length, 0);
	const blocks = plans.reduce((sum, plan) => sum + plan.changes.length, 0);

	for (const plan of plans) {
		log.info(
			`  ${plan.slug} (${plan.status}): ${String(plan.conversions.length)} footnote(s) in ${String(
				plan.changes.length,
			)} block(s), ${String(plan.reviews.length)} to review`,
		);
	}

	log.success(
		`${String(conversions)} reference(s) to convert across ${String(
			plans.length,
		)} version(s), touching ${String(blocks)} block(s); ${String(
			reviews,
		)} item(s) need a human. Reports: ${conversionsReportFilePath}, ${reviewReportFilePath}`,
	);

	if (!apply) {
		log.info("Pass `--apply` to write the footnotes — once the website renders them.");
		return;
	}

	const changed = await applyPlans(plans);

	log.success(`Rewrote ${String(changed)} block(s).`);
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
