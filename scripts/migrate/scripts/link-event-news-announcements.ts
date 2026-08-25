import { log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { env } from "../config/env.config";
import { getNewsAnnouncementSlug } from "../src/lib/news-announcement-website";

/**
 * WordPress had no way to say "this event was announced in that post", so editors put the
 * announcement's permalink in the event's `website` field — a field that otherwise means "the
 * event's own site". The knowledge base models this properly as a document-level relation, so this
 * script rewrites every such `website` into an `entities_to_entities` row pointing at the news
 * document, and clears the field.
 *
 * Only dariah.eu date permalinks (`https://www.dariah.eu/YYYY/MM/DD/<slug>/`) are considered, and
 * only when `<slug>` resolves to a news document that has a published version — the same
 * published-only backstop `syncEntityRelations` applies in the CMS, and what the public API needs
 * for the relation to resolve to anything. Anything else is left alone: `dariah.eu/activities/…` is
 * a website page, `annualevent.dariah.eu` is a separate site, and both are genuinely "the event's
 * own site".
 *
 * The relation is written on the event (`entity_id = event`), appended after any relations the
 * event already has, matching how editors' own links are stored and read — `getRelatedEntities`
 * only ever reads one direction. Announcements that cover a whole series produce several events
 * pointing at one news item; that is the intended shape, not a duplicate.
 *
 * Dry run by default; pass `--apply` to write.
 *
 * @example
 * 	pnpm run data:migrate:link-event-news-announcements
 * 	pnpm run data:migrate:link-event-news-announcements -- --apply
 *
 * 	Every version of an event is cleared, draft and published alike. Scoping to the published
 * 	version reads as the safe choice and is the opposite: the CMS edit pages render the draft, so a
 * 	change that lands only on the published version is invisible to editors and is undone the next
 * 	time anybody opens the event and saves. See `scripts/maintenance/lib/entity-versions.ts`.
 *
 * 	`--apply` re-reads inside the transaction it writes in, so an event edited since the dry run is
 * 	re-judged on its current `website` rather than cleared on the strength of a stale read.
 */

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

type Queryable = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

interface EventVersion {
	/** The `events` row, one per lifecycle version — this is what carries `website`. */
	versionId: string;
	status: string;
	website: string;
	/** Kept so the row's `updated_at` survives: this is a data correction, not an editorial change. */
	updatedAt: Date;
	/** The news document the `website` names. */
	newsDocumentId: string;
	newsSlug: string;
}

interface Candidate {
	documentId: string;
	slug: string;
	newsDocumentId: string;
	newsSlug: string;
	versions: Array<EventVersion>;
}

/**
 * Every event version whose `website` is a dariah.eu date permalink naming a news document with a
 * published version, grouped per event document.
 *
 * An event whose versions name _different_ news items is dropped with a warning rather than guessed
 * at: picking one would silently discard the other's link.
 */
async function findCandidates(tx: Queryable): Promise<Array<Candidate>> {
	const eventRows = await tx
		.select({
			documentId: schema.entities.id,
			slug: schema.entities.slug,
			versionId: schema.events.id,
			status: schema.entityStatus.type,
			website: schema.events.website,
			updatedAt: schema.events.updatedAt,
		})
		.from(schema.events)
		.innerJoin(schema.entityVersions, eq(schema.events.id, schema.entityVersions.id))
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(isNotNull(schema.events.website));

	const withAnnouncementSlug = eventRows.flatMap((row) => {
		const { website } = row;

		if (website == null) {
			return [];
		}

		const newsSlug = getNewsAnnouncementSlug(website);

		return newsSlug == null ? [] : [{ ...row, website, newsSlug }];
	});

	if (withAnnouncementSlug.length === 0) {
		return [];
	}

	const newsSlugs = [...new Set(withAnnouncementSlug.map((row) => row.newsSlug))];

	// Published-only: an unpublished target would resolve to nothing on the website, so migrating
	// into it would lose the link rather than improve it.
	const newsRows = await tx
		.selectDistinct({ id: schema.entities.id, slug: schema.entities.slug })
		.from(schema.entities)
		.innerJoin(schema.entityTypes, eq(schema.entities.typeId, schema.entityTypes.id))
		.innerJoin(schema.entityVersions, eq(schema.entityVersions.entityId, schema.entities.id))
		.innerJoin(schema.entityStatus, eq(schema.entityVersions.statusId, schema.entityStatus.id))
		.where(
			and(
				eq(schema.entityTypes.type, "news"),
				eq(schema.entityStatus.type, "published"),
				inArray(schema.entities.slug, newsSlugs),
			),
		);

	const newsDocumentIdBySlug = new Map(newsRows.map((row) => [row.slug, row.id] as const));

	const byDocument = new Map<string, Candidate>();

	for (const row of withAnnouncementSlug) {
		const newsDocumentId = newsDocumentIdBySlug.get(row.newsSlug);

		if (newsDocumentId == null) {
			log.warn(
				`Event "${row.slug}" (${row.status}) links to "${row.website}", but no published news item has slug "${row.newsSlug}". Skipping.`,
			);
			continue;
		}

		const version: EventVersion = {
			versionId: row.versionId,
			status: row.status,
			website: row.website,
			updatedAt: row.updatedAt,
			newsDocumentId,
			newsSlug: row.newsSlug,
		};

		const candidate = byDocument.get(row.documentId);

		if (candidate == null) {
			byDocument.set(row.documentId, {
				documentId: row.documentId,
				slug: row.slug,
				newsDocumentId,
				newsSlug: row.newsSlug,
				versions: [version],
			});
		} else {
			candidate.versions.push(version);
		}
	}

	return [...byDocument.values()].filter((candidate) => {
		const targets = new Set(candidate.versions.map((version) => version.newsDocumentId));

		if (targets.size > 1) {
			log.warn(
				`Event "${candidate.slug}" names different news items across its versions (${candidate.versions
					.map((version) => `${version.status}: ${version.newsSlug}`)
					.join(", ")}). Skipping — resolve it in the CMS.`,
			);
			return false;
		}

		return true;
	});
}

/** Migrate one event document: add the relation, then clear the `website` on every version. */
async function migrate(tx: Queryable, candidate: Candidate): Promise<boolean> {
	// Re-read under the transaction: an event edited since the dry run must be judged on its
	// current `website`, and a version whose link was changed or removed is left alone.
	const current = await tx
		.select({ id: schema.events.id, website: schema.events.website })
		.from(schema.events)
		.where(
			inArray(
				schema.events.id,
				candidate.versions.map((version) => version.versionId),
			),
		);

	const currentWebsites = new Map(current.map((row) => [row.id, row.website] as const));

	const versionsToClear = candidate.versions.filter(
		(version) => currentWebsites.get(version.versionId) === version.website,
	);

	if (versionsToClear.length === 0) {
		log.warn(`Event "${candidate.slug}" changed since it was read. Skipping.`);
		return false;
	}

	const existing = await tx
		.select({
			relatedEntityId: schema.entitiesToEntities.relatedEntityId,
			position: schema.entitiesToEntities.position,
		})
		.from(schema.entitiesToEntities)
		.where(eq(schema.entitiesToEntities.entityId, candidate.documentId));

	const alreadyRelated = existing.some((row) => row.relatedEntityId === candidate.newsDocumentId);

	if (!alreadyRelated) {
		// Append rather than insert at 0, so an editor's existing ordering is left as they arranged it.
		const position = existing.reduce((max, row) => Math.max(max, row.position + 1), 0);

		await tx.insert(schema.entitiesToEntities).values({
			entityId: candidate.documentId,
			relatedEntityId: candidate.newsDocumentId,
			position,
		});
	}

	for (const version of versionsToClear) {
		// Pass `updatedAt` explicitly so the `$onUpdate` hook does not bump it — this is a correction
		// of migrated data, not an editorial change.
		await tx
			.update(schema.events)
			.set({ website: null, updatedAt: version.updatedAt })
			.where(eq(schema.events.id, version.versionId));
	}

	return true;
}

async function main() {
	const apply = process.argv.includes("--apply");

	const candidates = await findCandidates(db);

	if (candidates.length === 0) {
		log.info("No event links to migrate.");
		return;
	}

	const byNewsItem = new Map<string, number>();
	for (const candidate of candidates) {
		byNewsItem.set(candidate.newsSlug, (byNewsItem.get(candidate.newsSlug) ?? 0) + 1);
	}

	log.info(
		`${String(candidates.length)} event(s) link to ${String(byNewsItem.size)} news item(s) via \`website\`.`,
	);

	let migrated = 0;
	let skipped = 0;

	for (const candidate of candidates) {
		const versions = candidate.versions.map((version) => version.status).join(", ");

		log.info(
			`"${candidate.slug}" (${versions}) → related entity "${candidate.newsSlug}", website cleared.`,
		);

		if (!apply) {
			migrated += 1;
			continue;
		}

		// One transaction per event, so an event is never left related-but-still-linked.
		const didMigrate = await db.transaction((tx) => migrate(tx, candidate));

		if (didMigrate) {
			migrated += 1;
		} else {
			skipped += 1;
		}
	}

	log.info(
		`${apply ? "Migrated" : "[dry run] would migrate"} ${String(migrated)} event link(s)${
			skipped > 0 ? `; ${String(skipped)} skipped` : ""
		}.`,
	);

	if (!apply) {
		log.info("Re-run with `--apply` to write.");
	}
}

main()
	.catch((error: unknown) => {
		log.error("Failed to migrate event announcement links.", error);
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
