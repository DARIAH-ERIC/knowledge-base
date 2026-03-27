"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { PageItemForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-item-form";
import { updatePageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/update-page-item.action";

interface PageItemEditFormProps {
	assets: Array<{ key: string; label: string; url: string }>;
	contentBlocks: Array<ContentBlock>;
	pageItem: Pick<schema.Page, "id" | "title" | "summary"> & {
		entity: { documentId: string; slug: string };
	} & { image: { key: string; label: string; url: string } | null };
}

export function PageItemEditForm(props: Readonly<PageItemEditFormProps>): ReactNode {
	const { assets, contentBlocks, pageItem } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit page")}</Heading>

			<PageItemForm
				assets={assets}
				contentBlocks={contentBlocks}
				formAction={updatePageItemAction}
				pageItem={pageItem}
			/>
		</Fragment>
	);
}
