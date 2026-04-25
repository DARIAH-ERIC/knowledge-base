"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import type { ServerAction } from "@/lib/server/create-server-action";

interface AvailableInstitution {
	id: string;
	name: string;
	acronym: string | null;
}

interface ClaimedInstitution {
	id: string;
	organisationalUnitId: string;
	organisationalUnit: { name: string; acronym: string | null };
}

interface CountryReportInstitutionsFormProps {
	report: {
		id: string;
		institutions: Array<ClaimedInstitution>;
	};
	availableInstitutions: Array<AvailableInstitution>;
	addAction: ServerAction;
	deleteAction: (formData: FormData) => Promise<void>;
}

export function CountryReportInstitutionsForm(
	props: Readonly<CountryReportInstitutionsFormProps>,
): ReactNode {
	const { report, availableInstitutions, addAction, deleteAction } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(addAction, createActionStateInitial());
	const [selectedId, setSelectedId] = useState<string>("");

	const claimedOrgUnitIds = new Set(
		report.institutions.map((i) => {
			return i.organisationalUnitId;
		}),
	);
	const available = availableInstitutions.filter((i) => {
		return !claimedOrgUnitIds.has(i.id);
	});

	return (
		<div className="flex flex-col gap-y-8">
			{report.institutions.length > 0 && (
				<section className="flex flex-col gap-y-3">
					<h2 className="text-sm font-semibold text-fg">{t("Institutions")}</h2>
					<ul className="divide-y divide-border rounded-md border">
						{report.institutions.map((institution) => {
							return (
								<li
									key={institution.id}
									className="flex items-center justify-between gap-x-4 px-4 py-3"
								>
									<div>
										<p className="text-sm font-medium text-fg">
											{institution.organisationalUnit.name}
										</p>
										{institution.organisationalUnit.acronym != null && (
											<p className="text-xs text-muted-fg">
												{institution.organisationalUnit.acronym}
											</p>
										)}
									</div>
									<form action={deleteAction}>
										<input name="institutionId" type="hidden" value={institution.id} />
										<input name="countryReportId" type="hidden" value={report.id} />
										<Button intent="danger" size="sm" type="submit">
											{t("Remove")}
										</Button>
									</form>
								</li>
							);
						})}
					</ul>
				</section>
			)}

			{available.length > 0 && (
				<section className="flex flex-col gap-y-3">
					<h2 className="text-sm font-semibold text-fg">{t("Add institution")}</h2>
					<Form action={action} className="flex flex-col gap-y-4 max-w-sm" state={state}>
						<input name="countryReportId" type="hidden" value={report.id} />

						<Select
							isRequired={true}
							onChange={(key) => {
								setSelectedId(String(key));
							}}
							value={selectedId || null}
						>
							<Label>{t("Institution")}</Label>
							<SelectTrigger />
							<FieldError />
							<SelectContent>
								{available.map((institution) => {
									return (
										<SelectItem key={institution.id} id={institution.id}>
											{institution.name}
											{institution.acronym != null && ` (${institution.acronym})`}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
						<input name="organisationalUnitId" type="hidden" value={selectedId} />

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
			)}

			{report.institutions.length === 0 && available.length === 0 && (
				<p className="text-sm text-muted-fg">{t("No institutions available.")}</p>
			)}
		</div>
	);
}
