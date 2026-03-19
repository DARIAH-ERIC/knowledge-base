"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ProjectForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-form";
import { updateProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/update-project.action";

interface ProjectEditFormProps {
	assets: Array<{ key: string; url: string }>;
	project: Pick<
		schema.Project,
		"acronym" | "call" | "duration" | "funders" | "funding" | "id" | "name" | "summary" | "topic"
	> & {
		description?: JSONContent;
		entity: Pick<schema.Entity, "documentId" | "slug"> & {
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		scope: Pick<schema.ProjectScope, "id" | "scope">;
	} & { image: { key: string; url: string } | null };
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
	orgUnits: Array<{ id: string; name: string }>;
	roles: Array<Pick<schema.ProjectRole, "id" | "role">>;
	socialMediaItems: Array<{ id: string; name: string; type: Pick<schema.SocialMediaType, "type"> }>;
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
		assets,
		project,
		scopes,
		orgUnits,
		roles,
		socialMediaItems,
		initialPartners,
		initialSocialMediaIds,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit project")}</Heading>

			<ProjectForm
				assets={assets}
				formAction={updateProjectAction}
				initialPartners={initialPartners}
				initialSocialMediaIds={initialSocialMediaIds}
				orgUnits={orgUnits}
				project={project}
				roles={roles}
				scopes={scopes}
				socialMediaItems={socialMediaItems}
			/>
		</Fragment>
	);
}
