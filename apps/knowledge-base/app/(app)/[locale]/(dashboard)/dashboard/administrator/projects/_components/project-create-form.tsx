"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ProjectForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-form";
import { createProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-project.action";

interface ProjectCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
	initialOrgUnitItems: Array<{ id: string; name: string }>;
	initialOrgUnitTotal: number;
	roles: Array<Pick<schema.ProjectRole, "id" | "role">>;
	initialSocialMediaItems: Array<{ id: string; name: string; description?: string }>;
	initialSocialMediaTotal: number;
}

export function ProjectCreateForm(props: Readonly<ProjectCreateFormProps>): ReactNode {
	const {
		initialAssets,
		initialOrgUnitItems,
		initialOrgUnitTotal,
		roles,
		scopes,
		initialSocialMediaItems,
		initialSocialMediaTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New project")}</Heading>

			<ProjectForm
				formAction={createProjectAction}
				initialAssets={initialAssets}
				initialOrgUnitItems={initialOrgUnitItems}
				initialOrgUnitTotal={initialOrgUnitTotal}
				initialSocialMediaItems={initialSocialMediaItems}
				initialSocialMediaTotal={initialSocialMediaTotal}
				roles={roles}
				scopes={scopes}
			/>
		</Fragment>
	);
}
