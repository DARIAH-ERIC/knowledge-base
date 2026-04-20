"use client";

import { articleContributorRolesEnum } from "@dariah-eric/database/schema";
import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, startTransition, useState, useTransition } from "react";

import {
	FormLayout,
	FormSection,
	FormSectionTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { AvailablePerson } from "@/lib/data/article-contributors";
import type { ServerAction } from "@/lib/server/create-server-action";

interface Contributor {
	personId: string;
	personName: string;
	role: string;
}

interface ArticleContributorsSectionProps {
	articleId: string;
	contributors: Array<Contributor>;
	availablePersons: Array<AvailablePerson>;
	createAction: ServerAction;
	deleteAction: (articleId: string, personId: string) => Promise<void>;
}

function formatRole(role: string): string {
	return role.charAt(0).toUpperCase() + role.slice(1);
}

export function ArticleContributorsSection(
	props: Readonly<ArticleContributorsSectionProps>,
): ReactNode {
	const { articleId, availablePersons, createAction, deleteAction } = props;

	const t = useExtracted();

	const [localContributors, setLocalContributors] = useState(props.contributors);
	const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
	const [selectedRole, setSelectedRole] = useState<string | null>(null);

	const [state, setState] = useState<ActionState>(createActionStateInitial());
	const [isPending, startFormTransition] = useTransition();

	function formAction(formData: FormData) {
		const personId = selectedPersonId;
		const role = selectedRole;
		const person = availablePersons.find((p) => {
			return p.id === personId;
		});

		startFormTransition(async () => {
			const newState = await createAction(state, formData);
			setState(newState);

			if (newState.status === "success" && person != null && role != null) {
				setLocalContributors((prev) => {
					return [...prev, { personId: person.id, personName: person.name, role }];
				});
				setSelectedPersonId(null);
				setSelectedRole(null);
			}
		});
	}

	return (
		<Fragment>
			<Separator className="my-8" />

			<div className="max-w-3xl space-y-6">
				<div className="space-y-1">
					<FormSectionTitle title={t("Contributors")} />
				</div>

				{localContributors.length > 0 ? (
					<Table aria-label="contributors" className="[--gutter:0] sm:[--gutter:0]">
						<TableHeader>
							<TableColumn isRowHeader={true}>{t("Person")}</TableColumn>
							<TableColumn>{t("Role")}</TableColumn>
							<TableColumn />
						</TableHeader>
						<TableBody items={localContributors}>
							{(contributor) => {
								return (
									<TableRow id={contributor.personId}>
										<TableCell>{contributor.personName}</TableCell>
										<TableCell>{formatRole(contributor.role)}</TableCell>
										<TableCell className="text-end">
											<Button
												aria-label={t("Remove contributor")}
												className="h-7 sm:h-7"
												intent="plain"
												onPress={() => {
													startTransition(async () => {
														await deleteAction(articleId, contributor.personId);
														setLocalContributors((prev) => {
															return prev.filter((c) => {
																return c.personId !== contributor.personId;
															});
														});
													});
												}}
												size="sq-sm"
											>
												<TrashIcon className="size-4" />
											</Button>
										</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				) : (
					<p className="text-sm text-neutral-500">{t("No contributors.")}</p>
				)}

				<FormLayout variant="stacked">
					<Form action={formAction} className="flex flex-col gap-y-6" state={state}>
						<FormSection
							description={t("Add a person as a contributor to this article.")}
							title={t("Add contributor")}
							variant="stacked"
						>
							<Select
								isRequired={true}
								onChange={(key) => {
									setSelectedPersonId(String(key));
								}}
								value={selectedPersonId}
							>
								<Label>{t("Person")}</Label>
								<SelectTrigger />
								<FieldError />
								<SelectContent>
									{availablePersons.map((person) => {
										return (
											<SelectItem key={person.id} id={person.id}>
												{person.name}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
							<input name="personId" type="hidden" value={selectedPersonId ?? ""} />

							<Select
								isRequired={true}
								onChange={(key) => {
									setSelectedRole(String(key));
								}}
								value={selectedRole}
							>
								<Label>{t("Role")}</Label>
								<SelectTrigger />
								<FieldError />
								<SelectContent>
									{articleContributorRolesEnum.map((role) => {
										return (
											<SelectItem key={role} id={role}>
												{formatRole(role)}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
							<input name="role" type="hidden" value={selectedRole ?? ""} />

							<input name="articleId" type="hidden" value={articleId} />
						</FormSection>

						<Button className="self-start" isPending={isPending} type="submit">
							{isPending ? (
								<Fragment>
									<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
									<span aria-hidden={true}>{t("Saving...")}</span>
								</Fragment>
							) : (
								t("Add contributor")
							)}
						</Button>

						<FormStatus className="self-start" state={state} />
					</Form>
				</FormLayout>
			</div>
		</Fragment>
	);
}
