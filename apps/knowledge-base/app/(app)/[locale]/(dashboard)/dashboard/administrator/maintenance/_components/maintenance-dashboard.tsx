"use client";

import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";
import type { Key } from "react-aria-components";

import { EntityListHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { EmptyContentBlocksCleanup } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/empty-content-blocks-cleanup";
import { PairedRelationsCheck } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/paired-relations-check";
import { RichTextCleanup } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/richtext-cleanup";
import { UnusedAssetsCleanup } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/unused-assets-cleanup";
import { UnusedSocialMediaCleanup } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/unused-social-media-cleanup";
import type { UnusedAssetsPreviewResult } from "@/lib/data/asset-cleanup";
import type { EmptyContentBlocksResult } from "@/lib/data/content-block-cleanup";
import type { PairedRelationCheckResult } from "@/lib/data/data-integrity";
import type { RichTextCleanupResult } from "@/lib/data/richtext-cleanup";
import type { UnusedSocialMediaResult } from "@/lib/data/social-media-cleanup";

interface MaintenanceDashboardProps {
	emptyContentBlocks: EmptyContentBlocksResult;
	integrity: PairedRelationCheckResult;
	richTextCleanup: RichTextCleanupResult;
	unusedAssets: UnusedAssetsPreviewResult;
	unusedSocialMedia: UnusedSocialMediaResult;
}

export function MaintenanceDashboard(props: Readonly<MaintenanceDashboardProps>): ReactNode {
	const { emptyContentBlocks, integrity, richTextCleanup, unusedAssets, unusedSocialMedia } = props;

	const t = useExtracted();
	const [selectedTab, setSelectedTab] = useState<Key>("integrity");

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

				<TabPanel id="integrity">
					<Tabs>
						<TabList aria-label={t("Data-integrity checks")}>
							<Tab id="paired-relations">{t("Paired relations")}</Tab>
						</TabList>

						<TabPanel id="paired-relations" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Pairs of relations which must always be recorded together, e.g. a national representative must also be a member of the General Assembly for the same period.",
								)}
							</p>

							<PairedRelationsCheck result={integrity} />
						</TabPanel>
					</Tabs>
				</TabPanel>

				<TabPanel id="cleanup">
					<Tabs>
						<TabList aria-label={t("Cleanup tasks")}>
							<Tab id="unused-assets">{t("Unused assets")}</Tab>
							<Tab id="empty-content-blocks">{t("Empty content blocks")}</Tab>
							<Tab id="unused-social-media">{t("Unused social media")}</Tab>
							<Tab id="richtext">{t("Rich-text normalisation")}</Tab>
						</TabList>

						<TabPanel id="unused-assets" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Assets (images) which are not referenced by any record or embedded in any rich-text field. Review and select the ones to permanently remove from storage and the database.",
								)}
							</p>

							<UnusedAssetsCleanup
								assets={unusedAssets.assets}
								totalSize={unusedAssets.totalSize}
							/>
						</TabPanel>

						<TabPanel id="empty-content-blocks" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Rich-text content blocks with no meaningful content (empty paragraphs, stray line breaks). Review and select the ones to remove from their entities.",
								)}
							</p>

							<EmptyContentBlocksCleanup blocks={emptyContentBlocks.blocks} />
						</TabPanel>

						<TabPanel id="unused-social-media" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Social-media entries not linked to any project, organisational unit, service, or report. Review and select the ones to permanently remove from the database.",
								)}
							</p>

							<UnusedSocialMediaCleanup items={unusedSocialMedia.items} />
						</TabPanel>

						<TabPanel id="richtext" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Content blocks whose rich text can be tidied: empty paragraphs, stray line breaks, non-breaking spaces, imported HTML attributes, and bold headings. Review and select the ones to rewrite.",
								)}
							</p>

							<RichTextCleanup blocks={richTextCleanup.blocks} />
						</TabPanel>
					</Tabs>
				</TabPanel>
			</Tabs>
		</Fragment>
	);
}
