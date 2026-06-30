-- A mailing list belongs to the working group, not to an individual yearly report. Select the
-- latest non-empty report value and copy it to every version of that working group, while
-- preserving values already entered through the working-group administration form.
WITH "ranked_mailing_lists" AS (
	SELECT
		"report"."working_group_document_id",
		NULLIF(btrim("report"."mailing_list"), '') AS "mailing_list",
		row_number() OVER (
			PARTITION BY "report"."working_group_document_id"
			ORDER BY "campaign"."year" DESC, "report"."id" DESC
		) AS "rank"
	FROM "working_group_reports" AS "report"
	INNER JOIN "reporting_campaigns" AS "campaign"
		ON "campaign"."id" = "report"."campaign_id"
	WHERE NULLIF(btrim("report"."mailing_list"), '') IS NOT NULL
),
"selected_mailing_lists" AS (
	SELECT "working_group_document_id", "mailing_list"
	FROM "ranked_mailing_lists"
	WHERE "rank" = 1
)
UPDATE "organisational_units" AS "unit"
SET "mailing_list" = "selected"."mailing_list"
FROM "entity_versions" AS "version"
INNER JOIN "selected_mailing_lists" AS "selected"
	ON "selected"."working_group_document_id" = "version"."entity_id"
WHERE "unit"."id" = "version"."id"
	AND NULLIF(btrim("unit"."mailing_list"), '') IS NULL;

--> statement-breakpoint

ALTER TABLE "working_group_reports"
	DROP COLUMN "mailing_list";
