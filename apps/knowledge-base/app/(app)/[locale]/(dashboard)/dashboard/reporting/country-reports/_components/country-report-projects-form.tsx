"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { NumberField } from "@dariah-eric/ui/number-field";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import {
	SearchableSelect,
	SearchableSelectContent,
	SearchableSelectInput,
	SearchableSelectItem,
} from "@dariah-eric/ui/searchable-select";
import { useExtracted, useFormatter } from "next-intl";
import { type ComponentProps, Fragment, type ReactNode, useActionState, useState } from "react";

import { ActionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-form";
import {
	NameWithDraftBadge,
	renderDraftAwareOption,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/draft-badge";
import { EntityFormSheet } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-form-sheet";
import { ProjectFormFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-form";
import { LocaleLink } from "@/lib/navigation/navigation";
import { euroFormatOptions } from "@/lib/number-format-options";
import type { ServerAction } from "@/lib/server/create-server-action";

interface Contribution {
	id: string;
	amountEuros: number;
	projectDocumentId: string;
	project: (Pick<schema.Project, "duration" | "name"> & { isDraft: boolean }) | null;
}

interface ProjectOption {
	/** The project document id (entities.id). */
	id: string;
	name: string;
	/** Never published; see `DraftBadge`. */
	isDraft: boolean;
}

/**
 * Creates a new project as a draft in a side sheet, using the project form, and selects it. The
 * action receives the project fields plus a hidden `countryReportId`, and returns the new project's
 * `id` and `name`.
 */
interface CreateProject extends Pick<
	ComponentProps<typeof ProjectFormFields>,
	"initialAssets" | "initialSocialMediaItems" | "initialSocialMediaTotal" | "scopes"
> {
	action: ServerAction;
}

interface CountryReportProjectsFormProps {
	report: {
		id: string;
		projectContributions: Array<Contribution>;
	};
	/** Includes draft-only projects, so one created from this screen can be reported right away. */
	allProjects: Array<ProjectOption>;
	/** Admins get a link to the projects overview; coordinators do not (yet) have those screens. */
	canManageRelations: boolean;
	addAction: ServerAction;
	deleteAction: ServerAction;
	createProject: CreateProject;
}

export function CountryReportProjectsForm(
	props: Readonly<CountryReportProjectsFormProps>,
): ReactNode {
	const { report, allProjects, canManageRelations, addAction, deleteAction, createProject } = props;

	const t = useExtracted();
	const format = useFormatter();
	const [state, action, isPending] = useActionState(addAction, createActionStateInitial());
	const [selectedProjectId, setSelectedProjectId] = useState<string>("");
	const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
	// Projects created from this screen, until the revalidated `allProjects` includes them.
	const [createdProjects, setCreatedProjects] = useState<Array<ProjectOption>>([]);

	const existingProjectIds = new Set(report.projectContributions.map((c) => c.projectDocumentId));
	const knownProjectIds = new Set(allProjects.map((p) => p.id));
	const availableProjects = [
		...allProjects,
		...createdProjects.filter((p) => !knownProjectIds.has(p.id)),
	]
		.filter((p) => !existingProjectIds.has(p.id))
		.toSorted((a, b) => a.name.localeCompare(b.name));

	return (
		<div className="flex flex-col gap-y-8">
			{canManageRelations && (
				<LocaleLink
					className="self-start text-sm text-fg underline underline-offset-4"
					href="/dashboard/administrator/projects"
				>
					{t("Manage projects")}
				</LocaleLink>
			)}

			{report.projectContributions.length > 0 && (
				<section className="flex flex-col gap-y-3">
					<h2 className="text-sm font-semibold text-fg">{t("Project contributions")}</h2>
					<ul className="divide-y divide-border rounded-md border">
						{report.projectContributions.map((contribution) => (
							<li
								key={contribution.id}
								className="flex items-center justify-between gap-x-4 px-4 py-3"
							>
								<div>
									<p className="text-sm font-medium text-fg">
										<NameWithDraftBadge
											isDraft={contribution.project?.isDraft}
											name={contribution.project?.name ?? ""}
										/>
									</p>
									{contribution.project != null && (
										<p className="text-xs text-muted-fg">
											{t("Duration")}:{" "}
											{contribution.project.duration.end != null
												? format.dateTimeRange(
														contribution.project.duration.start,
														contribution.project.duration.end,
														{ dateStyle: "short" },
													)
												: format.dateTime(contribution.project.duration.start, {
														dateStyle: "short",
													})}
										</p>
									)}
									<p className="text-xs text-muted-fg">
										{t("Total funding amount")}:{" "}
										{format.number(contribution.amountEuros, euroFormatOptions)}
									</p>
								</div>
								<ActionForm action={deleteAction}>
									{(isPending) => (
										<Fragment>
											<input name="contributionId" type="hidden" value={contribution.id} />
											<input name="countryReportId" type="hidden" value={report.id} />
											<Button
												isPending={isPending}
												className="text-danger hover:bg-danger/10 hover:text-danger"
												intent="plain"
												size="sm"
												type="submit"
											>
												{t("Remove")}
											</Button>
										</Fragment>
									)}
								</ActionForm>
							</li>
						))}
					</ul>
				</section>
			)}

			<section className="flex flex-col gap-y-3">
				<h2 className="text-sm font-semibold text-fg">{t("Add project contribution")}</h2>
				<Form
					action={action}
					className="flex flex-col gap-y-4 max-inline-sm"
					resetOnSuccess={true}
					state={state}
				>
					<input name="countryReportId" type="hidden" value={report.id} />

					<SearchableSelect
						isRequired={true}
						onChange={(key) => {
							setSelectedProjectId(key == null ? "" : String(key));
						}}
						value={selectedProjectId || null}
					>
						<Label>{t("Project")}</Label>
						<SearchableSelectInput placeholder={t("Search projects...")} />
						<FieldError />
						<SearchableSelectContent>
							{availableProjects.map((project) => (
								<SearchableSelectItem key={project.id} id={project.id} textValue={project.name}>
									{renderDraftAwareOption(project)}
								</SearchableSelectItem>
							))}
						</SearchableSelectContent>
					</SearchableSelect>
					<input name="projectDocumentId" type="hidden" value={selectedProjectId} />

					<Button
						className="self-start"
						intent="outline"
						onPress={() => {
							setIsCreateProjectOpen(true);
						}}
					>
						{t("Create new project")}
					</Button>

					<NumberField
						formatOptions={euroFormatOptions}
						isRequired={true}
						minValue={0}
						name="amountEuros"
					>
						<Label>{t("Total funding amount")}</Label>
						<Input />
						<FieldError />
					</NumberField>

					<Button className="self-start" isPending={isPending} type="submit">
						{isPending ? (
							<Fragment>
								<ProgressCircle aria-label={t("Adding...")} isIndeterminate={true} />
								<span aria-hidden={true}>{t("Adding...")}</span>
							</Fragment>
						) : (
							t("Add")
						)}
					</Button>

					<FormStatus className="self-start" state={state} />
				</Form>
			</section>

			<EntityFormSheet
				action={createProject.action}
				description={t(
					'The new project is selected above. Enter the funding amount and press "Add" to report it. The project is saved as a draft until an administrator publishes it.',
				)}
				isOpen={isCreateProjectOpen}
				onOpenChange={setIsCreateProjectOpen}
				onSuccess={(data: { id: string; name: string }) => {
					// A project created here is always a draft until an administrator publishes it.
					setCreatedProjects((prev) => [...prev, { id: data.id, name: data.name, isDraft: true }]);
					setSelectedProjectId(data.id);
				}}
				submitLabel={t("Create project")}
				title={t("Create new project")}
			>
				<ProjectFormFields
					initialAssets={createProject.initialAssets}
					initialSocialMediaItems={createProject.initialSocialMediaItems}
					initialSocialMediaTotal={createProject.initialSocialMediaTotal}
					scopes={createProject.scopes}
					showSlug={false}
				/>
				<input name="countryReportId" type="hidden" value={report.id} />
			</EntityFormSheet>
		</div>
	);
}
