"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { InternalPageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_components/internal-page-form";
import { updateInternalPageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_lib/update-internal-page.action";

interface InternalPageEditFormProps {
	contentBlocks: Array<ContentBlock>;
	internalPage: Pick<schema.InternalPage, "id" | "title"> & {
		entityVersion: { entity: Pick<schema.Entity, "id" | "slug"> };
	};
}

export function InternalPageEditForm(props: Readonly<InternalPageEditFormProps>): ReactNode {
	const { contentBlocks, internalPage } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit internal page")}</Heading>
			<InternalPageForm
				contentBlocks={contentBlocks}
				formAction={updateInternalPageAction}
				internalPage={internalPage}
			/>
		</Fragment>
	);
}
