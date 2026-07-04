"use client";

import type * as schema from "@dariah-eric/database/schema";
import { publicationStatusEnum, publicationTypesEnum } from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { AsyncListSelect } from "@dariah-eric/ui/async-list-select";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import type { AsyncOption, AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import {
	type OrganisationalUnitOption,
	toOrganisationalUnitDocumentOptionsPage,
} from "@/lib/organisational-unit-options";
import type { ServerAction } from "@/lib/server/create-server-action";

interface PublicationFormProps {
	publication?: Pick<
		schema.Publication,
		| "id"
		| "title"
		| "type"
		| "status"
		| "publicationYear"
		| "publicationDate"
		| "abstract"
		| "containerTitle"
		| "publisher"
		| "doi"
		| "url"
		| "keywords"
		| "creators"
	> & { organisationalUnitDocumentIds: Array<string> };
	initialNationalConsortia: { items: Array<AsyncOption>; total: number };
	initialWorkingGroups: { items: Array<AsyncOption>; total: number };
	selectedOrganisationalUnits?: Array<AsyncOption>;
	formAction: ServerAction;
}

function formatEnum(value: string): string {
	return value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function creatorName(creator: schema.PublicationCreator): string {
	return creator.literal ?? [creator.given, creator.family].filter(Boolean).join(" ");
}

function createFetchOptions(unitType: "national_consortium" | "working_group") {
	return async function fetchOptions(
		params: Readonly<AsyncOptionsFetchPageParams>,
	): Promise<{ items: Array<AsyncOption>; total: number }> {
		const searchParams = new URLSearchParams({
			limit: String(params.limit),
			offset: String(params.offset),
			unitType,
		});
		if (params.q !== "") {
			searchParams.set("q", params.q);
		}
		const response = await fetch(`/api/organisational-units/options?${searchParams.toString()}`, {
			signal: params.signal,
		});
		if (!response.ok) {
			throw new Error("Failed to load organisational units.");
		}
		return toOrganisationalUnitDocumentOptionsPage(
			(await response.json()) as { items: Array<OrganisationalUnitOption>; total: number },
		);
	};
}

const fetchNationalConsortia = createFetchOptions("national_consortium");
const fetchWorkingGroups = createFetchOptions("working_group");

export function PublicationForm(props: Readonly<PublicationFormProps>): ReactNode {
	const {
		publication,
		initialNationalConsortia,
		initialWorkingGroups,
		selectedOrganisationalUnits,
		formAction,
	} = props;
	const t = useExtracted();
	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());
	const selected = selectedOrganisationalUnits ?? [];
	const [type, setType] = useState<string>(publication?.type ?? "journal_article");
	const [status, setStatus] = useState<string>(publication?.status ?? "draft");
	const [nationalConsortiumIds, setNationalConsortiumIds] = useState<Array<string>>(
		publication?.organisationalUnitDocumentIds.filter((id) =>
			selected.some((option) => option.id === id && option.description === "national consortium"),
		) ?? [],
	);
	const [workingGroupIds, setWorkingGroupIds] = useState<Array<string>>(
		publication?.organisationalUnitDocumentIds.filter((id) =>
			selected.some((option) => option.id === id && option.description === "working group"),
		) ?? [],
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the bibliographic metadata.")} title={t("Bibliography")}>
					<TextField defaultValue={publication?.title} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<Select
						isRequired={true}
						onChange={(key) => {
							setType(String(key));
						}}
						value={type}
					>
						<Label>{t("Type")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							{publicationTypesEnum.map((value) => (
								<SelectItem key={value} id={value}>
									{formatEnum(value)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<input name="type" type="hidden" value={type} />
					<Select
						isRequired={true}
						onChange={(key) => {
							setStatus(String(key));
						}}
						value={status}
					>
						<Label>{t("Status")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							{publicationStatusEnum.map((value) => (
								<SelectItem key={value} id={value}>
									{formatEnum(value)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<input name="status" type="hidden" value={status} />
					<TextField
						defaultValue={publication?.publicationYear?.toString()}
						name="publicationYear"
						type="number"
					>
						<Label>{t("Publication year")}</Label>
						<Input min={1000} max={9999} />
						<FieldError />
					</TextField>
					<TextField
						defaultValue={publication?.publicationDate?.toISOString().slice(0, 10)}
						name="publicationDate"
						type="date"
					>
						<Label>{t("Publication date")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField defaultValue={publication?.containerTitle ?? undefined} name="containerTitle">
						<Label>{t("Journal or book title")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField defaultValue={publication?.publisher ?? undefined} name="publisher">
						<Label>{t("Publisher")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField defaultValue={publication?.doi ?? undefined} name="doi">
						<Label>{t("DOI")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField defaultValue={publication?.url ?? undefined} name="url" type="url">
						<Label>{t("URL")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField
						defaultValue={publication?.creators.map(creatorName).join("\n")}
						name="creatorNames"
					>
						<Label>{t("Creators")}</Label>
						<TextArea rows={5} />
						<FieldError />
						<p className="text-sm text-muted">{t("Enter one creator per line.")}</p>
					</TextField>
					<TextField defaultValue={publication?.keywords.join(", ")} name="keywordsText">
						<Label>{t("Keywords")}</Label>
						<Input />
						<FieldError />
					</TextField>
					<TextField defaultValue={publication?.abstract ?? undefined} name="abstract">
						<Label>{t("Abstract")}</Label>
						<TextArea rows={7} />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />
				<FormSection
					description={t(
						"Attribute this publication explicitly. These relations drive reporting and search filters.",
					)}
					title={t("Organisational units")}
				>
					<AsyncListSelect
						addLabel={t("Add national consortium")}
						aria-label={t("National consortia")}
						emptySelectionMessage={t("No national consortia")}
						fetchPage={fetchNationalConsortia}
						initialItems={initialNationalConsortia.items}
						initialTotal={initialNationalConsortia.total}
						label={t("National consortia")}
						onChange={setNationalConsortiumIds}
						selectedItems={selected}
						value={nationalConsortiumIds}
					/>
					{nationalConsortiumIds.map((id, index) => (
						<input
							key={id}
							name={`nationalConsortiumDocumentIds.${String(index)}`}
							type="hidden"
							value={id}
						/>
					))}
					<AsyncListSelect
						addLabel={t("Add working group")}
						aria-label={t("Working groups")}
						emptySelectionMessage={t("No working groups")}
						fetchPage={fetchWorkingGroups}
						initialItems={initialWorkingGroups.items}
						initialTotal={initialWorkingGroups.total}
						label={t("Working groups")}
						onChange={setWorkingGroupIds}
						selectedItems={selected}
						value={workingGroupIds}
					/>
					{workingGroupIds.map((id, index) => (
						<input
							key={id}
							name={`workingGroupDocumentIds.${String(index)}`}
							type="hidden"
							value={id}
						/>
					))}
				</FormSection>
				{publication != null ? <input name="id" type="hidden" value={publication.id} /> : null}
				<Button className="self-start" isPending={isPending} type="submit">
					{isPending ? (
						<Fragment>
							<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
							<span aria-hidden={true}>{t("Saving...")}</span>
						</Fragment>
					) : (
						t("Save")
					)}
				</Button>
				<FormStatus className="self-start" state={state} />
			</Form>
		</FormLayout>
	);
}
