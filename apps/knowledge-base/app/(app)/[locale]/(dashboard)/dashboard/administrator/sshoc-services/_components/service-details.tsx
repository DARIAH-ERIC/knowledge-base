"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface ServiceDetailsProps {
	service: Pick<
		schema.Service,
		| "id"
		| "name"
		| "sshocMarketplaceId"
		| "comment"
		| "dariahBranding"
		| "monitoring"
		| "privateSupplier"
	> & {
		status: Pick<schema.ServiceStatus, "status">;
		type: Pick<schema.ServiceType, "type">;
		ownerUnitIds: Array<string>;
		providerUnitIds: Array<string>;
	};
	selectedOrganisationalUnitItems: Array<{ id: string; name: string }>;
}

export function ServiceDetails(props: Readonly<ServiceDetailsProps>): ReactNode {
	const { service, selectedOrganisationalUnitItems } = props;

	const t = useExtracted();

	return (
		<DescriptionList>
			<DescriptionTerm>{t("Name")}</DescriptionTerm>
			<DescriptionDetails>{service.name}</DescriptionDetails>
			<DescriptionTerm>{t("Type")}</DescriptionTerm>
			<DescriptionDetails>{service.type.type}</DescriptionDetails>
			<DescriptionTerm>{t("Status")}</DescriptionTerm>
			<DescriptionDetails>{service.status.status}</DescriptionDetails>
			<DescriptionTerm>{t("SSHOC Marketplace ID")}</DescriptionTerm>
			<DescriptionDetails>{service.sshocMarketplaceId}</DescriptionDetails>
			<DescriptionTerm>{t("Comment")}</DescriptionTerm>
			<DescriptionDetails>{service.comment}</DescriptionDetails>
			<DescriptionTerm>{t("Service owners")}</DescriptionTerm>
			<DescriptionDetails>
				{service.ownerUnitIds.map(
					(ownerUnitId) =>
						selectedOrganisationalUnitItems.find((orgaUnit) => orgaUnit.id === ownerUnitId)?.name,
				)}
			</DescriptionDetails>
			<DescriptionTerm>{t("Service providers")}</DescriptionTerm>
			<DescriptionDetails>
				{service.providerUnitIds.map(
					(providerUnitId) =>
						selectedOrganisationalUnitItems.find((orgaUnit) => orgaUnit.id === providerUnitId)
							?.name,
				)}
			</DescriptionDetails>
		</DescriptionList>
	);
}
