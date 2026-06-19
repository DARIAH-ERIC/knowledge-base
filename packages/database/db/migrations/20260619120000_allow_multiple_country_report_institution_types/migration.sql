ALTER TABLE "country_report_institutions" DROP CONSTRAINT IF EXISTS "country_report_institutions_report_unit_document_unique";
--> statement-breakpoint
ALTER TABLE "country_report_institutions" DROP CONSTRAINT IF EXISTS "country_report_institutions_report_unit_document_type_unique";
--> statement-breakpoint
ALTER TABLE "country_report_institutions" ADD CONSTRAINT "country_report_institutions_report_unit_document_type_unique" UNIQUE ("country_report_id", "organisational_unit_document_id", "representation_type");
