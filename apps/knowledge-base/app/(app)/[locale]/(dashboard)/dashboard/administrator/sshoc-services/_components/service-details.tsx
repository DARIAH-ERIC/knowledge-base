"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { RelationLink } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-link";
import { updateServiceStatusAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/sshoc-services/_lib/update-service-status.action";
import { getOrganisationalUnitDetailHref } from "@/lib/entity-detail-href";
import { getServiceStatusLabel } from "@/lib/service-status-label";

interface ServiceDetailsProps {
	service: Pick<
		schema.Service,
		| "id"
		| "name"
		| "statusId"
		| "sshocMarketplaceId"
		| "comment"
		| "dariahBranding"
		| "monitoring"
		| "privateSupplier"
	> & {
		type: Pick<schema.ServiceType, "type">;
		ownerUnitDocumentIds: Array<string>;
		providerUnitDocumentIds: Array<string>;
	};
	serviceStatuses: Array<Pick<schema.ServiceStatus, "id" | "status">>;
	selectedOrganisationalUnitItems: Array<{ id: string; name: string; type: string; slug: string }>;
}

export function ServiceDetails(props: Readonly<ServiceDetailsProps>): ReactNode {
	const { service, serviceStatuses, selectedOrganisationalUnitItems } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(
		updateServiceStatusAction,
		createActionStateInitial(),
	);

	const [selectedStatusId, setSelectedStatusId] = useState<string>(service.statusId);

	const owners = selectedOrganisationalUnitItems.filter((orgaUnit) =>
		service.ownerUnitDocumentIds.includes(orgaUnit.id),
	);
	const providers = selectedOrganisationalUnitItems.filter((orgaUnit) =>
		service.providerUnitDocumentIds.includes(orgaUnit.id),
	);

	return (
		<Fragment>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{service.name}</DescriptionDetails>
				<DescriptionTerm>{t("Type")}</DescriptionTerm>
				<DescriptionDetails>{service.type.type}</DescriptionDetails>
				<DescriptionTerm>{t("SSHOC Marketplace ID")}</DescriptionTerm>
				<DescriptionDetails>{service.sshocMarketplaceId}</DescriptionDetails>
				<DescriptionTerm>{t("Comment")}</DescriptionTerm>
				<DescriptionDetails>{service.comment}</DescriptionDetails>
				<DescriptionTerm>{t("Service owners")}</DescriptionTerm>
				<DescriptionDetails>
					{owners.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{owners.map((owner) => (
								<li key={owner.id} className="text-sm">
									<RelationLink
										className="font-medium"
										href={getOrganisationalUnitDetailHref(owner.type, owner.slug)}
									>
										{owner.name}
									</RelationLink>
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>
				<DescriptionTerm>{t("Service providers")}</DescriptionTerm>
				<DescriptionDetails>
					{providers.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{providers.map((provider) => (
								<li key={provider.id} className="text-sm">
									<RelationLink
										className="font-medium"
										href={getOrganisationalUnitDetailHref(provider.type, provider.slug)}
									>
										{provider.name}
									</RelationLink>
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>
			</DescriptionList>

			<Separator className="my-6" />

			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection
					description={t(
						"Status is the only field not overwritten by the next SSHOC ingest, so it can be changed here.",
					)}
					title={t("Status")}
				>
					<Select
						isRequired={true}
						onChange={(key) => {
							setSelectedStatusId(String(key));
						}}
						value={selectedStatusId || null}
					>
						<Label>{t("Status")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							{serviceStatuses.map((status) => (
								<SelectItem key={status.id} id={status.id}>
									{getServiceStatusLabel(status.status)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<input name="statusId" type="hidden" value={selectedStatusId} />
					<input name="id" type="hidden" value={service.id} />

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
				</FormSection>
			</Form>
		</Fragment>
	);
}
