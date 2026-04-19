"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ServiceForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_components/service-form";
import { updateServiceAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_lib/update-service.action";

interface ServiceEditFormProps {
	service: Pick<
		schema.Service,
		| "id"
		| "name"
		| "sshocMarketplaceId"
		| "typeId"
		| "statusId"
		| "comment"
		| "dariahBranding"
		| "monitoring"
		| "privateSupplier"
	> & {
		ownerUnitIds: Array<string>;
		providerUnitIds: Array<string>;
	};
	serviceTypes: Array<Pick<schema.ServiceType, "id" | "type">>;
	serviceStatuses: Array<Pick<schema.ServiceStatus, "id" | "status">>;
	organisationalUnits: Array<Pick<schema.OrganisationalUnit, "id" | "name">>;
}

export function ServiceEditForm(props: Readonly<ServiceEditFormProps>): ReactNode {
	const { service, serviceTypes, serviceStatuses, organisationalUnits } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit service")}</Heading>

			<ServiceForm
				formAction={updateServiceAction}
				organisationalUnits={organisationalUnits}
				service={service}
				serviceStatuses={serviceStatuses}
				serviceTypes={serviceTypes}
			/>
		</Fragment>
	);
}
