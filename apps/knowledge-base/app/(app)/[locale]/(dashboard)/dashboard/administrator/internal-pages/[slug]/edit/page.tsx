import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { InternalPageEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-pages/_components/internal-page-edit";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditInternalPageProps extends PageProps<"/[locale]/dashboard/administrator/internal-pages/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditInternalPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit internal page"),
	});
}

export default async function DashboardAdministratorEditInternalPage(
	props: Readonly<DashboardAdministratorEditInternalPageProps>,
): Promise<ReactNode> {
	const { params } = props;
	const { slug } = await params;

	const internalPage = await db.query.internalPages.findFirst({
		where: {
			entityVersion: {
				entity: {
					slug,
				},
				status: {
					type: "published",
				},
			},
		},
		columns: {
			id: true,
			title: true,
		},
		with: {
			entityVersion: {
				columns: { id: true },
				with: {
					entity: {
						columns: {
							id: true,
							slug: true,
						},
					},
				},
			},
		},
	});

	if (internalPage == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(internalPage.id);

	return <InternalPageEditForm contentBlocks={contentBlocks} internalPage={internalPage} />;
}
