"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Tab, TabList, TabPanel } from "@dariah-eric/ui/tabs";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ContributionsSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/contributions-section";
import { EntityEditTabs } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { PersonForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-form";
import { discardPersonDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/discard-person-draft.action";
import { publishPersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/publish-person.action";
import { updatePersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/update-person.action";
import type { ContributionRoleOption, PersonContribution } from "@/lib/data/contributions";

interface PersonEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	person: Pick<schema.Person, "email" | "id" | "name" | "orcid" | "sortName"> & {
		biography?: JSONContent;
		entityVersion: { entity: { id: string; slug: string } };
	} & { image: { key: string; label: string; url: string } };
	contributions: Array<PersonContribution>;
	contributionRoleOptions: Array<ContributionRoleOption>;
}

export function PersonEditForm(props: Readonly<PersonEditFormProps>): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		person,
		contributions,
		contributionRoleOptions,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader title={t("Edit person")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit person")}>
					<Tab id="details">{t("Details")}</Tab>
					<Tab id="contributions">{t("Contributions")}</Tab>
				</TabList>

				<TabPanel className="flex flex-col gap-y-(--layout-padding)" id="details">
					<div className="flex justify-end">
						<EntityLifecycleBar
							discardDraftAction={discardPersonDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishPersonAction}
						/>
					</div>

					<PersonForm
						formAction={updatePersonAction}
						initialAssets={initialAssets}
						person={person}
					/>
				</TabPanel>

				<TabPanel id="contributions">
					<ContributionsSection
						contributions={contributions}
						personId={documentId}
						roleOptions={contributionRoleOptions}
					/>
				</TabPanel>
			</EntityEditTabs>
		</Fragment>
	);
}
