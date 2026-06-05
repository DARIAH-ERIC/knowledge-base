"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from "@dariah-eric/ui/description-list";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

interface ServiceDetailsProps {
	service: Pick<
		schema.Service,
		"id" | "name" | "statusId" | "comment" | "dariahBranding" | "monitoring" | "privateSupplier"
	> & {
		ownerUnitIds: Array<string>;
		providerUnitIds: Array<string>;
	};
	serviceStatuses: Array<Pick<schema.ServiceStatus, "id" | "status">>;
	initialOrganisationalUnitItems: Array<{ id: string; name: string }>;
	initialOrganisationalUnitTotal: number;
	selectedOrganisationalUnits: Array<{ id: string; name: string }>;
}

export function ServiceDetails(props: Readonly<ServiceDetailsProps>): ReactNode {
	const { service, serviceStatuses, selectedOrganisationalUnits } = props;

	const t = useExtracted();

	const owners = selectedOrganisationalUnits.filter((orgaUnit) =>
		service.ownerUnitIds.includes(orgaUnit.id),
	);
	const providers = selectedOrganisationalUnits.filter((orgaUnit) =>
		service.providerUnitIds.includes(orgaUnit.id),
	);

	return (
		<Fragment>
			<DescriptionList>
				<DescriptionTerm>{t("Name")}</DescriptionTerm>
				<DescriptionDetails>{service.name}</DescriptionDetails>

				<DescriptionTerm>{t("Status")}</DescriptionTerm>
				<DescriptionDetails>
					{serviceStatuses.find((s) => s.id === service.statusId)?.status}
				</DescriptionDetails>

				<DescriptionTerm>{t("Comment")}</DescriptionTerm>
				<DescriptionDetails>{service.comment}</DescriptionDetails>

				<DescriptionTerm>{t("DARIAH branding")}</DescriptionTerm>
				<DescriptionDetails>{service.dariahBranding !== null ? "yes" : "no"}</DescriptionDetails>

				<DescriptionTerm>{t("Monitoring")}</DescriptionTerm>
				<DescriptionDetails>{service.monitoring !== null ? "yes" : "no"}</DescriptionDetails>

				<DescriptionTerm>{t("Private supplier")}</DescriptionTerm>
				<DescriptionDetails>{service.privateSupplier !== null ? "yes" : "no"}</DescriptionDetails>

				<DescriptionTerm>{t("Owners")}</DescriptionTerm>
				<DescriptionDetails>
					{owners.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{owners.map((owner) => (
								<li key={owner.id} className="text-sm">
									<span className="font-medium">{owner.name}</span>
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>

				<DescriptionTerm>{t("Providers")}</DescriptionTerm>
				<DescriptionDetails>
					{providers.length > 0 ? (
						<ul className="flex flex-col gap-1">
							{providers.map((provider) => (
								<li key={provider.id} className="text-sm">
									<span className="font-medium">{provider.name}</span>
								</li>
							))}
						</ul>
					) : null}
				</DescriptionDetails>
			</DescriptionList>
		</Fragment>
	);
}
