ALTER TABLE "report_external_resource_snapshots"
	DROP CONSTRAINT IF EXISTS "report_external_resource_snapshots_section_enum_check";
--> statement-breakpoint
UPDATE "report_external_resource_snapshots"
SET "section" = 'country_publications'
WHERE "section" = 'country_zotero_publications';
--> statement-breakpoint
UPDATE "report_external_resource_snapshots"
SET "section" = 'working_group_publications'
WHERE "section" = 'working_group_zotero_publications';
--> statement-breakpoint
ALTER TABLE "report_external_resource_snapshots"
	ADD CONSTRAINT "report_external_resource_snapshots_section_enum_check"
	CHECK ("section" IN (
		'country_sshoc_resources',
		'country_publications',
		'working_group_sshoc_resources',
		'working_group_publications'
	));
