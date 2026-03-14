import { Breadcrumbs, BreadcrumbsItem } from "@dariah-eric/ui/breadcrumbs";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

export default function BreadcrumbsSlot(): ReactNode {
	const t = useExtracted();

	return (
		<Breadcrumbs>
			<BreadcrumbsItem href="/dashboard">{t("Dashboard")}</BreadcrumbsItem>
		</Breadcrumbs>
	);
}
