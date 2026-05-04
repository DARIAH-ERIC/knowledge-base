import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentationPageEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_components/documentation-page-edit";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditDocumentationPageProps extends PageProps<"/[locale]/dashboard/administrator/documentation-pages/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditDocumentationPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit documentation page"),
	});
}

export default async function DashboardAdministratorEditDocumentationPage(
	props: Readonly<DashboardAdministratorEditDocumentationPageProps>,
): Promise<ReactNode> {
	const { params } = props;
	const { slug } = await params;

	const documentationPage = await db.query.documentationPages.findFirst({
		where: {
			entityVersion: {
				entity: {
					slug,
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

	if (documentationPage == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(documentationPage.id);

	return (
		<DocumentationPageEditForm
			contentBlocks={contentBlocks}
			documentationPage={documentationPage}
		/>
	);
}
