"use client";

import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

import type { MergeSummary, MergeSummaryTable } from "@/lib/data/merge-summary";

/** Lists what a successful merge re-pointed from the source onto the target. */
export function MergeSummaryList(props: Readonly<{ summary: MergeSummary }>): ReactNode {
	const { summary } = props;

	const t = useExtracted();

	// Built here rather than in a helper taking `t`: the i18n extractor only sees `t(...)` calls on a
	// `useExtracted()` binding in scope.
	const labels: Record<MergeSummaryTable, string> = {
		country_report_contributions: t("Country report contributors"),
		country_report_institutions: t("Country report institutions"),
		country_report_project_contributions: t("Country report project contributions"),
		country_report_service_kpis: t("Country report service KPIs"),
		country_report_services: t("Country report services"),
		country_report_social_media: t("Country report social media"),
		country_report_social_media_kpis: t("Country report social media KPIs"),
		country_reports: t("Country reports"),
		entities_to_entities: t("Related entities"),
		entities_to_resources: t("Related resources"),
		impact_case_studies_to_persons: t("Impact case study contributors"),
		navigation_items: t("Navigation items"),
		organisational_units_to_social_media: t("Organisational unit social media"),
		organisational_units_to_units: t("Organisational unit relations"),
		persons_to_organisational_units: t("Person relations (contributions)"),
		projects_to_organisational_units: t("Project partners"),
		projects_to_social_media: t("Project social media"),
		reporting_campaign_country_thresholds: t("Reporting campaign country thresholds"),
		services_to_organisational_units: t("Service organisational units"),
		services_to_social_media: t("Service social media"),
		spotlight_articles_to_persons: t("Spotlight article contributors"),
		users: t("User accounts"),
		working_group_report_chairs: t("Working group report chairs"),
		working_group_report_social_media: t("Working group report social media"),
		working_group_reports: t("Working group reports"),
	};

	const entries = (Object.entries(summary) as Array<[MergeSummaryTable, number]>)
		.map(([table, count]) => {
			return { label: labels[table], count };
		})
		.toSorted((a, b) => a.label.localeCompare(b.label));

	if (entries.length === 0) {
		return (
			<p className="mbs-1">{t("Nothing referred to the source, so nothing was re-pointed.")}</p>
		);
	}

	return (
		<div className="mbs-2">
			<p>{t("Re-pointed onto the target:")}</p>
			<ul className="mbs-1 list-disc ps-5">
				{entries.map((entry) => (
					<li key={entry.label}>
						{entry.label}: {entry.count}
					</li>
				))}
			</ul>
		</div>
	);
}
