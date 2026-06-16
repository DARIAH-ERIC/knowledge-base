"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Badge } from "@dariah-eric/ui/badge";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { getCompensationRoleLabel } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/contribution-role-labels";
import type { CompensationRole } from "@/lib/data/report-contributions";
import type { ServerAction } from "@/lib/server/create-server-action";

interface AvailableContribution {
	personToOrgUnitId: string;
	personName: string;
	organisationalUnitName: string;
	compensationRole: CompensationRole;
}

interface ClaimedContribution {
	id: string;
	personToOrgUnitId: string;
	personName: string;
	organisationalUnitName: string;
	compensationRole: CompensationRole | null;
}

interface CountryReportClaimedContributorsFormProps {
	report: {
		id: string;
		contributions: Array<ClaimedContribution>;
	};
	availableContributions: Array<AvailableContribution>;
	addAction: ServerAction;
	deleteAction: (formData: FormData) => Promise<void>;
}

export function CountryReportClaimedContributorsForm(
	props: Readonly<CountryReportClaimedContributorsFormProps>,
): ReactNode {
	const { report, availableContributions, addAction, deleteAction } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(addAction, createActionStateInitial());
	const [selectedId, setSelectedId] = useState<string>("");

	return (
		<div className="flex flex-col gap-y-8">
			<div className="flex flex-col gap-y-2">
				<h2 className="text-sm font-semibold text-fg">{t("Other compensated contributors")}</h2>
				<p className="max-inline-md text-sm text-muted-fg">
					{t(
						"Cross-cutting roles (committee and working-group chairs, JRC members) claimed for this report. These are not tied to the country, so add or remove them here.",
					)}
				</p>
			</div>

			{report.contributions.length > 0 && (
				<ul className="divide-y divide-border rounded-md border">
					{report.contributions.map((contribution) => {
						const roleLabel = getCompensationRoleLabel(t, contribution.compensationRole);

						return (
							<li
								key={contribution.id}
								className="flex items-start justify-between gap-x-4 px-4 py-3"
							>
								<div className="flex flex-col gap-y-1">
									<p className="text-sm font-medium text-fg">{contribution.personName}</p>
									<div className="flex flex-wrap items-center gap-2">
										{roleLabel != null && <Badge intent="secondary">{roleLabel}</Badge>}
										<span className="text-xs text-muted-fg">
											{contribution.organisationalUnitName}
										</span>
									</div>
								</div>
								<form action={deleteAction}>
									<input name="contributionId" type="hidden" value={contribution.id} />
									<input name="countryReportId" type="hidden" value={report.id} />
									<Button intent="danger" size="sm" type="submit">
										{t("Remove")}
									</Button>
								</form>
							</li>
						);
					})}
				</ul>
			)}

			{availableContributions.length > 0 && (
				<section className="flex flex-col gap-y-3">
					<h3 className="text-sm font-semibold text-fg">{t("Add contributor")}</h3>
					<Form action={action} className="flex flex-col gap-y-4 max-inline-sm" state={state}>
						<input name="countryReportId" type="hidden" value={report.id} />

						<Select
							isRequired={true}
							onChange={(key) => {
								setSelectedId(String(key));
							}}
							value={selectedId || null}
						>
							<Label>{t("Person")}</Label>
							<SelectTrigger />
							<FieldError />
							<SelectContent>
								{availableContributions.map((candidate) => (
									<SelectItem key={candidate.personToOrgUnitId} id={candidate.personToOrgUnitId}>
										{candidate.personName}
										{" — "}
										{getCompensationRoleLabel(t, candidate.compensationRole)}
										{" ("}
										{candidate.organisationalUnitName}
										{")"}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<input name="personToOrgUnitId" type="hidden" value={selectedId} />

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

			{report.contributions.length === 0 && availableContributions.length === 0 && (
				<p className="text-sm text-muted-fg">{t("No other compensated contributors available.")}</p>
			)}
		</div>
	);
}
