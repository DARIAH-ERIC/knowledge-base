import type { ReactNode } from "react";

import { DashboardBreadcrumbs } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/dashboard-breadcrumbs";
import { getBreadcrumbLabels } from "@/app/(app)/[locale]/(dashboard)/dashboard/@breadcrumbs/_lib/get-breadcrumb-labels";

interface BreadcrumbsSlotProps extends PageProps<"/[locale]/dashboard/[...segments]"> {}

export default async function BreadcrumbsSlot(
	props: Readonly<BreadcrumbsSlotProps>,
): Promise<ReactNode> {
	const { segments } = await props.params;
	const labels = await getBreadcrumbLabels(segments);

	return <DashboardBreadcrumbs labels={labels} />;
}
