"use client";

import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";
import type { Key } from "react-aria-components";

import { EntityListHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";

interface MaintenanceDashboardProps {
	emptyContentBlocks: ReactNode;
	pairedRelations: ReactNode;
	richText: ReactNode;
	unusedAssets: ReactNode;
	unusedSocialMedia: ReactNode;
}

export function MaintenanceDashboard(props: Readonly<MaintenanceDashboardProps>): ReactNode {
	const { emptyContentBlocks, pairedRelations, richText, unusedAssets, unusedSocialMedia } = props;

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

							{pairedRelations}
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

							{unusedAssets}
						</TabPanel>

						<TabPanel id="empty-content-blocks" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Rich-text content blocks with no meaningful content (empty paragraphs, stray line breaks). Review and select the ones to remove from their entities.",
								)}
							</p>

							{emptyContentBlocks}
						</TabPanel>

						<TabPanel id="unused-social-media" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Social-media entries not linked to any project, organisational unit, service, or report. Review and select the ones to permanently remove from the database.",
								)}
							</p>

							{unusedSocialMedia}
						</TabPanel>

						<TabPanel id="richtext" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Content blocks whose rich text can be tidied: empty paragraphs, stray line breaks, non-breaking spaces, imported HTML attributes, and bold headings. Review and select the ones to rewrite.",
								)}
							</p>

							{richText}
						</TabPanel>
					</Tabs>
				</TabPanel>
			</Tabs>
		</Fragment>
	);
}
