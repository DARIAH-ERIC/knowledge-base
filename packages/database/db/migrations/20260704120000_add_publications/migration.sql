CREATE TABLE IF NOT EXISTS "publications" (
	"id" uuid PRIMARY KEY DEFAULT UUIDV7() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publication_year" integer,
	"publication_date" date,
	"abstract" text,
	"container_title" text,
	"publisher" text,
	"doi" text,
	"url" text,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"creators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"zotero_key" text,
	"source_metadata" jsonb,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publications_zotero_key_unique" UNIQUE("zotero_key"),
	CONSTRAINT "publications_type_enum_check" CHECK ("type" IN ('journal_article', 'book', 'book_chapter', 'conference_paper', 'report', 'thesis', 'other')),
	CONSTRAINT "publications_status_enum_check" CHECK ("status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "publications_year_check" CHECK ("publication_year" IS NULL OR "publication_year" BETWEEN 1000 AND 9999)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "publications_doi_unique" ON "publications" ("doi") WHERE "doi" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publications_title_idx" ON "publications" ("title");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publications_year_idx" ON "publications" ("publication_year");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publications_status_idx" ON "publications" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "publications_to_organisational_units" (
	"publication_id" uuid NOT NULL,
	"organisational_unit_document_id" uuid NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publications_to_organisational_units_pkey" PRIMARY KEY("publication_id", "organisational_unit_document_id"),
	CONSTRAINT "publications_to_organisational_units_publication_id_fk" FOREIGN KEY ("publication_id") REFERENCES "publications"("id") ON DELETE CASCADE,
	CONSTRAINT "publications_to_organisational_units_document_id_fk" FOREIGN KEY ("organisational_unit_document_id") REFERENCES "entities"("id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "publications_to_org_units_document_idx" ON "publications_to_organisational_units" ("organisational_unit_document_id");
