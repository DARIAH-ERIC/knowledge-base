"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { ProjectForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-form";
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
	initialOrgUnitItems: Array<{ id: string; name: string }>;
	initialOrgUnitTotal: number;
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
		durationStart: string | null;
		durationEnd: string | null;
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
		initialOrgUnitItems,
		initialOrgUnitTotal,
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
			<div className="flex items-center justify-between">
				<Heading>{t("Edit project")}</Heading>
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
				initialOrgUnitItems={initialOrgUnitItems}
				initialOrgUnitTotal={initialOrgUnitTotal}
				initialPartners={initialPartners}
				initialSocialMediaIds={initialSocialMediaIds}
				initialSocialMediaItems={initialSocialMediaItems}
				initialSocialMediaTotal={initialSocialMediaTotal}
				project={project}
				roles={roles}
				scopes={scopes}
				selectedSocialMediaItems={selectedSocialMediaItems}
			/>
		</Fragment>
	);
}
