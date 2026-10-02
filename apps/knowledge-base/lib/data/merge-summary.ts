/** The tables a merge re-points rows in, used as keys of a {@link MergeSummary}. */
export type MergeSummaryTable =
	| "country_report_contributions"
	| "country_report_institutions"
	| "country_report_project_contributions"
	| "country_report_service_kpis"
	| "country_report_services"
	| "country_report_social_media"
	| "country_report_social_media_kpis"
	| "country_reports"
	| "entities_to_entities"
	| "entities_to_resources"
	| "impact_case_studies_to_persons"
	| "navigation_items"
	| "organisational_units_to_social_media"
	| "organisational_units_to_units"
	| "persons_to_organisational_units"
	| "projects_to_organisational_units"
	| "projects_to_social_media"
	| "reporting_campaign_country_thresholds"
	| "services_to_organisational_units"
	| "services_to_social_media"
	| "spotlight_articles_to_persons"
	| "users"
	| "working_group_report_chairs"
	| "working_group_report_social_media"
	| "working_group_reports";

/**
 * How many rows of each table a merge moved from the source onto the target, so the UI can list
 * what changed. A row counts once whether it was re-pointed or dropped as a duplicate of a row the
 * target already had — either way the reference now resolves to the target. Tables with no rows are
 * omitted.
 */
export type MergeSummary = Partial<Record<MergeSummaryTable, number>>;

/** Adds the rows a statement affected to `table`'s count. */
export function addToMergeSummary(
	summary: MergeSummary,
	table: MergeSummaryTable,
	result: { rowCount: number | null },
): void {
	const count = result.rowCount ?? 0;
	if (count > 0) {
		summary[table] = (summary[table] ?? 0) + count;
	}
}
