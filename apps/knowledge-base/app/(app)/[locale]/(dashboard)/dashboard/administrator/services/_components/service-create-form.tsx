"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { ServiceForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_components/service-form";
import { createServiceAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_lib/create-service.action";

interface ServiceCreateFormProps {
	serviceTypes: Array<Pick<schema.ServiceType, "id" | "type">>;
	serviceStatuses: Array<Pick<schema.ServiceStatus, "id" | "status">>;
	initialOrganisationalUnitItems: Array<{ id: string; name: string }>;
	initialOrganisationalUnitTotal: number;
}

export function ServiceCreateForm(props: Readonly<ServiceCreateFormProps>): ReactNode {
	const {
		serviceTypes,
		serviceStatuses,
		initialOrganisationalUnitItems,
		initialOrganisationalUnitTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New service")}</Heading>

			<ServiceForm
				formAction={createServiceAction}
				initialOrganisationalUnitItems={initialOrganisationalUnitItems}
				initialOrganisationalUnitTotal={initialOrganisationalUnitTotal}
				serviceStatuses={serviceStatuses}
				serviceTypes={serviceTypes}
			/>
		</Fragment>
	);
}
