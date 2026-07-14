"use client";

import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";
import type { Key } from "react-aria-components";

import { EntityListHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { MergeEntities } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/merge-entities";
import { SlugEditor } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/slug-editor";

interface MaintenanceDashboardProps {
	emptyContentBlocks: ReactNode;
	inactiveUnitRelations: ReactNode;
	pairedRelations: ReactNode;
	richText: ReactNode;
	unitRelationRequirements: ReactNode;
	unusedAssets: ReactNode;
	unusedSocialMedia: ReactNode;
}

export function MaintenanceDashboard(props: Readonly<MaintenanceDashboardProps>): ReactNode {
	const {
		emptyContentBlocks,
		inactiveUnitRelations,
		pairedRelations,
		richText,
		unitRelationRequirements,
		unusedAssets,
		unusedSocialMedia,
	} = props;

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
					<Tab id="merge">{t("Merge & rename")}</Tab>
				</TabList>

				<TabPanel id="integrity">
					<Tabs>
						<TabList aria-label={t("Data-integrity checks")}>
							<Tab id="paired-relations">{t("Paired relations")}</Tab>
							<Tab id="unit-relation-requirements">{t("Required relations")}</Tab>
							<Tab id="inactive-unit-relations">{t("Inactive units")}</Tab>
						</TabList>

						<TabPanel id="paired-relations" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Pairs of relations which must always be recorded together, e.g. a national representative must also be a member of the General Assembly, and a national coordinator must also be a member of the National Coordinator Committee, for the same period.",
								)}
							</p>

							{pairedRelations}
						</TabPanel>

						<TabPanel
							id="unit-relation-requirements"
							className="flex flex-col gap-y-(--layout-padding)"
						>
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Organisational units whose relations imply another that is missing, e.g. every institution that is a partner institution or cooperating partner of DARIAH-EU must also record which country it is located in.",
								)}
							</p>

							{unitRelationRequirements}
						</TabPanel>

						<TabPanel
							id="inactive-unit-relations"
							className="flex flex-col gap-y-(--layout-padding)"
						>
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Organisational units that are no longer active but still have open person relations, e.g. a working group whose membership in an ERIC has ended, or a country that is no longer a member, but whose chair, member, coordinator, representative, or contact relations have no end date.",
								)}
							</p>

							{inactiveUnitRelations}
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

				<TabPanel id="merge">
					<Tabs>
						<TabList aria-label={t("Merge & rename")}>
							<Tab id="merge-entities">{t("Merge duplicates")}</Tab>
							<Tab id="edit-slug">{t("Edit slug")}</Tab>
						</TabList>

						<TabPanel id="merge-entities" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Merge a duplicate entity into a canonical one: all relations are re-pointed onto the target and the source is permanently deleted. Both entities must be the same type.",
								)}
							</p>

							<MergeEntities />
						</TabPanel>

						<TabPanel id="edit-slug" className="flex flex-col gap-y-(--layout-padding)">
							<p className="text-balance text-muted-fg text-sm">
								{t(
									"Change an entity's slug. This is an administrator-only maintenance action — slugs are normally managed by the system and form part of the public URL.",
								)}
							</p>

							<SlugEditor />
						</TabPanel>
					</Tabs>
				</TabPanel>
			</Tabs>
		</Fragment>
	);
}
