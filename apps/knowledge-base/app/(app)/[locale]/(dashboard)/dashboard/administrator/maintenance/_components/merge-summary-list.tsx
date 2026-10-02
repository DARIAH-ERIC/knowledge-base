"use client";

import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

import type { MergeSummary, MergeSummaryTable } from "@/lib/data/merge-summary";

function getTableLabel(t: ReturnType<typeof useExtracted>, table: MergeSummaryTable): string {
	switch (table) {
		case "country_report_contributions": {
			return t("Country report contributors");
		}
		case "country_report_institutions": {
			return t("Country report institutions");
		}
		case "country_report_project_contributions": {
			return t("Country report project contributions");
		}
		case "country_report_service_kpis": {
			return t("Country report service KPIs");
		}
		case "country_report_services": {
			return t("Country report services");
		}
		case "country_report_social_media": {
			return t("Country report social media");
		}
		case "country_report_social_media_kpis": {
			return t("Country report social media KPIs");
		}
		case "country_reports": {
			return t("Country reports");
		}
		case "entities_to_entities": {
			return t("Related entities");
		}
		case "entities_to_resources": {
			return t("Related resources");
		}
		case "impact_case_studies_to_persons": {
			return t("Impact case study contributors");
		}
		case "navigation_items": {
			return t("Navigation items");
		}
		case "organisational_units_to_social_media": {
			return t("Organisational unit social media");
		}
		case "organisational_units_to_units": {
			return t("Organisational unit relations");
		}
		case "persons_to_organisational_units": {
			return t("Person relations (contributions)");
		}
		case "projects_to_organisational_units": {
			return t("Project partners");
		}
		case "projects_to_social_media": {
			return t("Project social media");
		}
		case "reporting_campaign_country_thresholds": {
			return t("Reporting campaign country thresholds");
		}
		case "services_to_organisational_units": {
			return t("Service organisational units");
		}
		case "services_to_social_media": {
			return t("Service social media");
		}
		case "spotlight_articles_to_persons": {
			return t("Spotlight article contributors");
		}
		case "users": {
			return t("User accounts");
		}
		case "working_group_report_chairs": {
			return t("Working group report chairs");
		}
		case "working_group_report_social_media": {
			return t("Working group report social media");
		}
		case "working_group_reports": {
			return t("Working group reports");
		}
	}
}

/** Lists what a successful merge re-pointed from the source onto the target. */
export function MergeSummaryList(props: Readonly<{ summary: MergeSummary }>): ReactNode {
	const { summary } = props;

	const t = useExtracted();

	const entries = (Object.entries(summary) as Array<[MergeSummaryTable, number]>)
		.map(([table, count]) => {
			return { label: getTableLabel(t, table), count };
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
