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
	initialOrganisationalUnitItems: Array<{ id: string; name: string }>;
	initialOrganisationalUnitTotal: number;
	selectedOrganisationalUnits: Array<{ id: string; name: string }>;
}

export function ServiceEditForm(props: Readonly<ServiceEditFormProps>): ReactNode {
	const {
		service,
		serviceTypes,
		serviceStatuses,
		initialOrganisationalUnitItems,
		initialOrganisationalUnitTotal,
		selectedOrganisationalUnits,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit service")}</Heading>

			<ServiceForm
				formAction={updateServiceAction}
				initialOrganisationalUnitItems={initialOrganisationalUnitItems}
				initialOrganisationalUnitTotal={initialOrganisationalUnitTotal}
				selectedOrganisationalUnits={selectedOrganisationalUnits}
				service={service}
				serviceStatuses={serviceStatuses}
				serviceTypes={serviceTypes}
			/>
		</Fragment>
	);
}
