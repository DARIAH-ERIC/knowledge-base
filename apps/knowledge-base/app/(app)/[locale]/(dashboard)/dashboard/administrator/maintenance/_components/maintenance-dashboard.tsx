"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { Link } from "@dariah-eric/ui/link";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";
import type { Key } from "react-aria-components";

import { EntityListHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { EmptyContentBlocksCleanup } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/empty-content-blocks-cleanup";
import { UnusedAssetsCleanup } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/unused-assets-cleanup";
import type { UnusedAssetsPreviewResult } from "@/lib/data/asset-cleanup";
import type { EmptyContentBlocksResult } from "@/lib/data/content-block-cleanup";
import type {
	PairedRelationCheckResult,
	PairedRelationFindingKind,
	RelationInterval,
} from "@/lib/data/data-integrity";
import { getEntityDetailHref } from "@/lib/entity-detail-href";

interface MaintenanceDashboardProps {
	emptyContentBlocks: EmptyContentBlocksResult;
	integrity: PairedRelationCheckResult;
	unusedAssets: UnusedAssetsPreviewResult;
}

function humanizeKind(kind: string): string {
	return kind.replaceAll("_", " ");
}

const findingKindBadgeIntents: Record<PairedRelationFindingKind, "amber" | "rose"> = {
	missing_counterpart: "amber",
	duration_mismatch: "rose",
};

export function MaintenanceDashboard(props: Readonly<MaintenanceDashboardProps>): ReactNode {
	const { emptyContentBlocks, integrity, unusedAssets } = props;

	const t = useExtracted();
	const format = useFormatter();
	const [selectedTab, setSelectedTab] = useState<Key>("integrity");

	function formatIntervals(intervals: Array<RelationInterval>): ReactNode {
		if (intervals.length === 0) {
			return "—";
		}

		return intervals.map((interval) => {
			const start = format.dateTime(new Date(interval.start), { dateStyle: "medium" });
			const end =
				interval.end != null
					? format.dateTime(new Date(interval.end), { dateStyle: "medium" })
					: t("ongoing");

			return (
				<span className="block whitespace-nowrap" key={`${interval.start}:${interval.end ?? ""}`}>
					{start} – {end}
				</span>
			);
		});
	}

	return (
		<Fragment>
			<EntityListHeader
				title={t("Maintenance")}
				description={t("Data-integrity checks and cleanup actions for administrators.")}
			/>

			<Tabs onSelectionChange={setSelectedTab} selectedKey={selectedTab}>
				<TabList aria-label={t("Maintenance")}>
					<Tab id="integrity">{t("Data integrity")}</Tab>
					<Tab id="cleanup">{t("Cleanup")}</Tab>
				</TabList>

				<TabPanel id="integrity" className="flex flex-col gap-y-(--layout-padding)">
					<div className="text-balance text-muted-fg text-sm">
						{t(
							"Pairs of relations which must always be recorded together, e.g. a national representative must also be a member of the General Assembly for the same period.",
						)}
					</div>

					{integrity.errors.length > 0 ? (
						<div className="flex flex-col gap-y-1 text-danger-subtle-fg text-sm">
							{integrity.errors.map((error) => (
								<p key={error}>{error}</p>
							))}
						</div>
					) : null}

					<Table
						aria-label={t("Data integrity")}
						className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
					>
						<TableHeader>
							<TableColumn id="person" isRowHeader={true}>
								{t("Person")}
							</TableColumn>
							<TableColumn id="kind">{t("Issue")}</TableColumn>
							<TableColumn id="detail">{t("Detail")}</TableColumn>
							<TableColumn id="periods">{t("Periods")}</TableColumn>
						</TableHeader>
						<TableBody
							items={integrity.findings.map((finding) => {
								return {
									...finding,
									id: `${finding.rule}:${finding.kind}:${finding.personDocumentId}`,
								};
							})}
							renderEmptyState={() => t("No data-integrity issues found.")}
						>
							{(finding) => {
								const href = getEntityDetailHref({
									entityType: "persons",
									slug: finding.personSlug,
								});

								return (
									<TableRow id={finding.id}>
										<TableCell>
											{href != null ? (
												<Link className="underline" href={href}>
													{finding.personLabel}
												</Link>
											) : (
												finding.personLabel
											)}
										</TableCell>
										<TableCell>
											<Badge intent={findingKindBadgeIntents[finding.kind]}>
												{humanizeKind(finding.kind)}
											</Badge>
										</TableCell>
										<TableCell>
											<span className="block max-inline-96 whitespace-normal">
												{finding.detail}
											</span>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-y-2">
												{finding.sides.map((side) => (
													<div className="flex flex-col" key={side.label}>
														<span className="text-muted-fg text-xs">{side.label}</span>
														{formatIntervals(side.intervals)}
													</div>
												))}
											</div>
										</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				</TabPanel>

				<TabPanel id="cleanup" className="flex flex-col gap-y-8">
					<section className="flex flex-col gap-y-(--layout-padding)">
						<div className="flex flex-col gap-y-1">
							<h3 className="font-medium text-sm">{t("Unused assets")}</h3>
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Assets (images) which are not referenced by any record or embedded in any rich-text field. Review and select the ones to permanently remove from storage and the database.",
								)}
							</p>
						</div>

						<UnusedAssetsCleanup assets={unusedAssets.assets} totalSize={unusedAssets.totalSize} />
					</section>

					<section className="flex flex-col gap-y-(--layout-padding)">
						<div className="flex flex-col gap-y-1">
							<h3 className="font-medium text-sm">{t("Empty content blocks")}</h3>
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Rich-text content blocks with no meaningful content (empty paragraphs, stray line breaks). Review and select the ones to remove from their entities.",
								)}
							</p>
						</div>

						<EmptyContentBlocksCleanup blocks={emptyContentBlocks.blocks} />
					</section>
				</TabPanel>
			</Tabs>
		</Fragment>
	);
}
