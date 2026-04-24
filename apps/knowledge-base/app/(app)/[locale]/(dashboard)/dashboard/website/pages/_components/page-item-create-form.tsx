"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { PageItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-item-form";
import { createPageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/create-page-item.action";

interface PageItemCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	initialRelatedEntityItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceItems: Array<{ id: string; name: string; description?: string }>;
	initialRelatedResourceTotal: number;
}

export function PageItemCreateForm(props: Readonly<PageItemCreateFormProps>): ReactNode {
	const {
		initialAssets,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
	} = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New page")}</Heading>

			<PageItemForm
				formAction={createPageItemAction}
				initialAssets={initialAssets}
				initialRelatedEntityItems={initialRelatedEntityItems}
				initialRelatedEntityTotal={initialRelatedEntityTotal}
				initialRelatedResourceItems={initialRelatedResourceItems}
				initialRelatedResourceTotal={initialRelatedResourceTotal}
			/>
		</Fragment>
	);
}
