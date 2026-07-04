import { inArray, sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { entities } from "./entities";

export const publicationTypesEnum = [
	"journal_article",
	"book",
	"book_chapter",
	"conference_paper",
	"report",
	"thesis",
	"other",
] as const;

export const publicationStatusEnum = ["draft", "published", "archived"] as const;

export interface PublicationCreator {
	given?: string;
	family?: string;
	literal?: string;
	orcid?: string;
}

/** Canonical bibliography record. Typesense is only a projection of published rows. */
export const publications = p.snakeCase.table(
	"publications",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		title: p.text("title").notNull(),
		type: p.text("type", { enum: publicationTypesEnum }).notNull(),
		status: p.text("status", { enum: publicationStatusEnum }).notNull().default("draft"),
		publicationYear: p.integer("publication_year"),
		publicationDate: p.date("publication_date", { mode: "date" }),
		abstract: p.text("abstract"),
		containerTitle: p.text("container_title"),
		publisher: p.text("publisher"),
		doi: p.text("doi"),
		url: p.text("url"),
		keywords: p.jsonb("keywords").$type<Array<string>>().notNull().default([]),
		creators: p.jsonb("creators").$type<Array<PublicationCreator>>().notNull().default([]),
		zoteroKey: p.text("zotero_key").unique(),
		sourceMetadata: p.jsonb("source_metadata").$type<Record<string, unknown>>(),
		...f.timestamps(),
	},
	(t) => [
		p.check("publications_type_enum_check", inArray(t.type, publicationTypesEnum)),
		p.check("publications_status_enum_check", inArray(t.status, publicationStatusEnum)),
		p.check(
			"publications_year_check",
			sql`${t.publicationYear} IS NULL OR ${t.publicationYear} BETWEEN 1000 AND 9999`,
		),
		p
			.uniqueIndex("publications_doi_unique")
			.on(t.doi)
			.where(sql`${t.doi} IS NOT NULL`),
		p.index("publications_title_idx").on(t.title),
		p.index("publications_year_idx").on(t.publicationYear),
		p.index("publications_status_idx").on(t.status),
	],
);

export type Publication = typeof publications.$inferSelect;
export type PublicationInput = typeof publications.$inferInsert;
export const PublicationSelectSchema = createSelectSchema(publications);
export const PublicationInsertSchema = createInsertSchema(publications);
export const PublicationUpdateSchema = createUpdateSchema(publications);

/** Explicit attribution to stable organisational-unit documents. */
export const publicationsToOrganisationalUnits = p.snakeCase.table(
	"publications_to_organisational_units",
	{
		publicationId: p
			.uuid("publication_id")
			.notNull()
			.references(() => publications.id, { onDelete: "cascade" }),
		organisationalUnitDocumentId: p
			.uuid("organisational_unit_document_id")
			.notNull()
			.references(() => entities.id),
		...f.timestamps(),
	},
	(t) => [
		p.primaryKey({
			columns: [t.publicationId, t.organisationalUnitDocumentId],
			name: "publications_to_organisational_units_pkey",
		}),
		p.index("publications_to_org_units_document_idx").on(t.organisationalUnitDocumentId),
	],
);

export type PublicationToOrganisationalUnit = typeof publicationsToOrganisationalUnits.$inferSelect;
