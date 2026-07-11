import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import { isEmptyRichTextDocument } from "@dariah-eric/database/rich-text";
import * as schema from "@dariah-eric/database/schema";
import { eq, inArray } from "drizzle-orm";

import { cacheFolderPath } from "../config/data-migration.config";
import { env } from "../config/env.config";

/** Removes semantically empty rich-text content blocks. Accordion items are intentionally ignored. */

const isDryRun = process.argv.includes("--dry-run");
const reportFilePath = path.join(cacheFolderPath, "empty-content-blocks.log");

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

async function main() {
	log.info(
		isDryRun ? "Finding empty content blocks (dry run)..." : "Removing empty content blocks...",
	);

	const rows = await db
		.select({
			blockPosition: schema.contentBlocks.position,
			contentBlockId: schema.contentBlocks.id,
			content: schema.richTextContentBlocks.content,
			entityId: schema.entities.id,
			entityLabel: schema.entities.label,
			entitySlug: schema.entities.slug,
			entityType: schema.entityTypes.type,
			entityVersionId: schema.entityVersions.id,
			fieldId: schema.fields.id,
			fieldName: schema.entityTypesFieldsNames.fieldName,
			status: schema.entityStatus.type,
		})
		.from(schema.richTextContentBlocks)
		.innerJoin(schema.contentBlocks, eq(schema.contentBlocks.id, schema.richTextContentBlocks.id))
		.innerJoin(schema.fields, eq(schema.fields.id, schema.contentBlocks.fieldId))
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.entityTypesFieldsNames.id, schema.fields.fieldNameId),
		)
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.id, schema.fields.entityVersionId))
		.innerJoin(schema.entities, eq(schema.entities.id, schema.entityVersions.entityId))
		.innerJoin(schema.entityTypes, eq(schema.entityTypes.id, schema.entities.typeId))
		.innerJoin(schema.entityStatus, eq(schema.entityStatus.id, schema.entityVersions.statusId));

	const emptyBlocks = rows
		.filter((row) => isEmptyRichTextDocument(row.content))
		.toSorted(
			(a, b) =>
				a.entityType.localeCompare(b.entityType) ||
				(a.entityLabel ?? a.entitySlug).localeCompare(b.entityLabel ?? b.entitySlug) ||
				a.status.localeCompare(b.status) ||
				a.fieldName.localeCompare(b.fieldName) ||
				a.blockPosition - b.blockPosition ||
				a.contentBlockId.localeCompare(b.contentBlockId),
		);
	const header = [
		"entity_type",
		"entity_id",
		"title",
		"status",
		"entity_version_id",
		"field",
		"field_id",
		"block_position",
		"content_block_id",
	].join("\t");
	const reportRows = emptyBlocks.map((row) => {
		const title = (row.entityLabel ?? row.entitySlug).replaceAll(/\s+/g, " ").trim();
		return [
			row.entityType,
			row.entityId,
			title,
			row.status,
			row.entityVersionId,
			row.fieldName,
			row.fieldId,
			row.blockPosition,
			row.contentBlockId,
		].join("\t");
	});
	const affectedEntityCount = new Set(emptyBlocks.map((row) => row.entityId)).size;
	const affectedFieldCount = new Set(emptyBlocks.map((row) => row.fieldId)).size;

	await fs.mkdir(cacheFolderPath, { recursive: true });
	await fs.writeFile(
		reportFilePath,
		`${header}\n${reportRows.join("\n")}${reportRows.length > 0 ? "\n" : ""}`,
		{ encoding: "utf-8" },
	);

	if (!isDryRun && emptyBlocks.length > 0) {
		await db.delete(schema.contentBlocks).where(
			inArray(
				schema.contentBlocks.id,
				emptyBlocks.map((row) => row.contentBlockId),
			),
		);
	}

	log.success(
		`${isDryRun ? "Would remove" : "Removed"} ${String(emptyBlocks.length)} empty rich_text block(s) across ${String(affectedFieldCount)} field(s) on ${String(affectedEntityCount)} entity/entities. Report: ${reportFilePath}`,
	);
}

main()
	.then(() => db.$client.end())
	.catch((error: unknown) => {
		log.error(error);
		process.exitCode = 1;
	});
