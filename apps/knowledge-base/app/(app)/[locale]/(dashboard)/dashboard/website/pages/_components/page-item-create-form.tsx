"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { PageItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-item-form";
import { createPageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/create-page-item.action";

interface PageItemCreateFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
}

export function PageItemCreateForm(props: Readonly<PageItemCreateFormProps>): ReactNode {
	const { initialAssets } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New page")}</Heading>

			<PageItemForm formAction={createPageItemAction} initialAssets={initialAssets} />
		</Fragment>
	);
}
