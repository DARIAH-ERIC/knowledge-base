-- Let editors opt long-form entries into a website table of contents. Defaults to off so existing
-- entries render unchanged.
ALTER TABLE "pages"
	ADD COLUMN IF NOT EXISTS "show_table_of_contents" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "spotlight_articles"
	ADD COLUMN IF NOT EXISTS "show_table_of_contents" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "impact_case_studies"
	ADD COLUMN IF NOT EXISTS "show_table_of_contents" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "opportunities"
	ADD COLUMN IF NOT EXISTS "show_table_of_contents" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "funding_calls"
	ADD COLUMN IF NOT EXISTS "show_table_of_contents" boolean DEFAULT false NOT NULL;
