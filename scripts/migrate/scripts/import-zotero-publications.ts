import { readFile } from "node:fs/promises";

import { assert, log } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, inArray, or } from "@dariah-eric/database/sql";

interface ZoteroCreator {
	firstName?: string;
	lastName?: string;
	name?: string;
}

interface ZoteroItemData {
	key?: string;
	itemType?: string;
	title?: string;
	date?: string;
	abstractNote?: string;
	publicationTitle?: string;
	bookTitle?: string;
	publisher?: string;
	DOI?: string;
	url?: string;
	creators?: Array<ZoteroCreator>;
	tags?: Array<{ tag?: string }>;
	collections?: Array<string>;
}

interface ZoteroItem extends ZoteroItemData {
	data?: ZoteroItemData;
}

const typeMap: Record<string, schema.Publication["type"]> = {
	journalArticle: "journal_article",
	book: "book",
	bookSection: "book_chapter",
	conferencePaper: "conference_paper",
	report: "report",
	thesis: "thesis",
};

function normalizeDoi(value: string | undefined): string | null {
	const doi = value
		?.trim()
		.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
		.replace(/^doi:\s*/i, "")
		.toLowerCase();
	return doi == null || doi === "" ? null : doi;
}

function parseYear(value: string | undefined): number | null {
	const match = value == null ? null : /\b(\d{4})\b/.exec(value);
	return match?.[1] == null ? null : Number(match[1]);
}

function parseItems(value: unknown): Array<ZoteroItem> {
	if (Array.isArray(value)) {
		return value as Array<ZoteroItem>;
	}
	if (value != null && typeof value === "object" && "items" in value) {
		const items = (value as { items: unknown }).items;
		if (Array.isArray(items)) {
			return items as Array<ZoteroItem>;
		}
	}
	throw new Error("Expected a Zotero JSON array or an object with an items array.");
}

function optionalText(value: string | undefined): string | null {
	const normalized = value?.trim();
	return normalized == null || normalized === "" ? null : normalized;
}

async function main(): Promise<void> {
	const [exportPath, mappingPath, mode] = process.argv.slice(2);
	assert(
		exportPath,
		"Usage: import-zotero-publications <export.json> <collection-map.json> [--write]",
	);
	assert(mappingPath, "Missing collection mapping JSON path.");
	const write = mode === "--write";
	const [rawExport, rawMapping] = await Promise.all([
		readFile(exportPath, "utf-8"),
		readFile(mappingPath, "utf-8"),
	]);
	const items = parseItems(JSON.parse(rawExport) as unknown);
	const collectionMap = JSON.parse(rawMapping) as Record<string, string>;
	const mappedDocumentIds = [...new Set(Object.values(collectionMap))];

	const allowedUnits =
		mappedDocumentIds.length === 0
			? []
			: await db
					.select({ id: schema.entities.id })
					.from(schema.entities)
					.innerJoin(
						schema.documentLifecycle,
						eq(schema.documentLifecycle.documentId, schema.entities.id),
					)
					.innerJoin(
						schema.organisationalUnits,
						eq(schema.organisationalUnits.id, schema.documentLifecycle.publishedId),
					)
					.innerJoin(
						schema.organisationalUnitTypes,
						eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
					)
					.where(
						and(
							inArray(schema.entities.id, mappedDocumentIds),
							inArray(schema.organisationalUnitTypes.type, [
								"national_consortium",
								"working_group",
							]),
						),
					);
	assert(
		new Set(allowedUnits.map((unit) => unit.id)).size === mappedDocumentIds.length,
		"Every mapped id must be a published national-consortium or working-group document id.",
	);

	let imported = 0;
	let skipped = 0;
	const unmatchedCollections = new Set<string>();

	for (const rawItem of items) {
		const item = rawItem.data ?? rawItem;
		const zoteroKey = item.key ?? rawItem.key;
		if (item.title?.trim() == null || item.title.trim() === "" || zoteroKey == null) {
			skipped += 1;
			continue;
		}
		const documentIds = [
			...new Set(
				(item.collections ?? []).flatMap((collection) => {
					const documentId = collectionMap[collection];
					if (documentId == null) {
						unmatchedCollections.add(collection);
						return [];
					}
					return [documentId];
				}),
			),
		];
		const doi = normalizeDoi(item.DOI);
		const existing = (
			await db
				.select({ id: schema.publications.id })
				.from(schema.publications)
				.where(
					doi == null
						? eq(schema.publications.zoteroKey, zoteroKey)
						: or(eq(schema.publications.zoteroKey, zoteroKey), eq(schema.publications.doi, doi)),
				)
				.limit(1)
		).at(0);
		if (!write) {
			imported += 1;
			continue;
		}

		await db.transaction(async (tx) => {
			const values = {
				title: item.title!.trim(),
				type: typeMap[item.itemType ?? ""] ?? "other",
				status: "draft" as const,
				publicationYear: parseYear(item.date),
				abstract: optionalText(item.abstractNote),
				containerTitle: optionalText(item.publicationTitle) ?? optionalText(item.bookTitle),
				publisher: optionalText(item.publisher),
				doi,
				url: optionalText(item.url),
				creators: (item.creators ?? []).map((creator) =>
					creator.name != null
						? { literal: creator.name }
						: { given: creator.firstName, family: creator.lastName },
				),
				keywords: (item.tags ?? []).flatMap((tag) => {
					const keyword = optionalText(tag.tag);
					return keyword == null ? [] : [keyword];
				}),
				zoteroKey,
				sourceMetadata: item as unknown as Record<string, unknown>,
			};
			const publicationId =
				existing == null
					? (
							await tx
								.insert(schema.publications)
								.values(values)
								.returning({ id: schema.publications.id })
						).at(0)!.id
					: existing.id;
			if (existing != null) {
				await tx
					.update(schema.publications)
					.set(values)
					.where(eq(schema.publications.id, existing.id));
			}
			await tx
				.delete(schema.publicationsToOrganisationalUnits)
				.where(eq(schema.publicationsToOrganisationalUnits.publicationId, publicationId));
			if (documentIds.length > 0) {
				await tx.insert(schema.publicationsToOrganisationalUnits).values(
					documentIds.map((organisationalUnitDocumentId) => {
						return { publicationId, organisationalUnitDocumentId };
					}),
				);
			}

			const oldResourceId = `zotero:${zoteroKey}`;
			const relations = await tx
				.select({
					entityId: schema.entitiesToResources.entityId,
					position: schema.entitiesToResources.position,
				})
				.from(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.resourceId, oldResourceId));
			if (relations.length > 0) {
				await tx
					.insert(schema.entitiesToResources)
					.values(
						relations.map((relation) => {
							return { ...relation, resourceId: `knowledge-base:${publicationId}` };
						}),
					)
					.onConflictDoNothing();
				await tx
					.delete(schema.entitiesToResources)
					.where(eq(schema.entitiesToResources.resourceId, oldResourceId));
			}
		});
		imported += 1;
	}

	log.info(
		JSON.stringify(
			{
				mode: write ? "write" : "dry-run",
				total: items.length,
				imported,
				skipped,
				unmatchedCollections: [...unmatchedCollections].toSorted(),
			},
			null,
			2,
		),
	);
}

main().catch((error: unknown) => {
	log.error(error);
	process.exitCode = 1;
});
