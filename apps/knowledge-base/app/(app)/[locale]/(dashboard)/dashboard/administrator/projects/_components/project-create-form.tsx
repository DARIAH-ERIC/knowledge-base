"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ProjectForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-form";
import { createProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/create-project.action";

interface ProjectCreateFormProps {
	assets: Array<{ key: string; url: string }>;
	scopes: Array<Pick<schema.ProjectScope, "id" | "scope">>;
}

export function ProjectCreateForm(props: Readonly<ProjectCreateFormProps>): ReactNode {
	const { assets, scopes } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New project")}</Heading>

			<ProjectForm assets={assets} formAction={createProjectAction} scopes={scopes} />
		</Fragment>
	);
}
