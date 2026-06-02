"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Tab, TabList, TabPanel } from "@dariah-eric/ui/tabs";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityEditTabs } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-edit-tabs";
import { EntityFormHeader } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { ProjectForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-form";
import { ProjectPartnersSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-partners-section";
import { discardProjectDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/discard-project-draft.action";
import { publishProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/publish-project.action";
import { updateProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/update-project.action";

interface ProjectEditFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	project: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		description?: JSONContent;
		entityVersion: {
			entity: Pick<schema.Entity, "id" | "slug">;
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
	} & { image: { key: string; label: string; url: string } | null };
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
	roles: Array<Pick<schema.ProjectRole, "id" | "role">>;
	initialSocialMediaItems: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal: number;
	selectedSocialMediaItems: Array<{ id: string; name: string; description?: string }>;
	initialPartners: Array<{
		id: string;
		unitId: string;
		unitName: string;
		roleId: string;
		roleName: string;
		durationStart: Date | null;
		durationEnd: Date | null;
	}>;
	initialSocialMediaIds: Array<string>;
}

export function ProjectEditForm(props: Readonly<ProjectEditFormProps>): ReactNode {
	const {
		initialAssets,
		documentId,
		hasDraftChanges,
		isPublished,
		project,
		scopes,
		roles,
		initialSocialMediaItems,
		initialSocialMediaTotal,
		selectedSocialMediaItems,
		initialPartners,
		initialSocialMediaIds,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<EntityFormHeader title={t("Edit project")} />

			<EntityEditTabs defaultTab="details">
				<TabList aria-label={t("Edit project")}>
					<Tab id="details">{t("Details")}</Tab>
					<Tab id="project-partners">{t("Project partners")}</Tab>
				</TabList>

				<TabPanel className="flex flex-col gap-y-(--layout-padding)" id="details">
					<div className="flex justify-end">
						<EntityLifecycleBar
							discardDraftAction={discardProjectDraftAction}
							documentId={documentId}
							hasDraft={hasDraftChanges}
							isPublished={isPublished}
							publishAction={publishProjectAction}
						/>
					</div>

					<ProjectForm
						formAction={updateProjectAction}
						initialAssets={initialAssets}
						initialSocialMediaIds={initialSocialMediaIds}
						initialSocialMediaItems={initialSocialMediaItems}
						initialSocialMediaTotal={initialSocialMediaTotal}
						project={project}
						scopes={scopes}
						selectedSocialMediaItems={selectedSocialMediaItems}
					/>
				</TabPanel>

				<TabPanel id="project-partners">
					<ProjectPartnersSection partners={initialPartners} projectId={documentId} roles={roles} />
				</TabPanel>
			</EntityEditTabs>
		</Fragment>
	);
}
