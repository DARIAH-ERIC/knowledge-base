import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentationPageDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_components/documentation-page-details";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { db } from "@/lib/db";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorDocumentationPageDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/documentation-pages/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorDocumentationPageDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Documentation page details"),
	});
}

export default async function DashboardAdministratorDocumentationPageDetailsPage(
	props: Readonly<DashboardAdministratorDocumentationPageDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;
	const { slug } = await params;

	const documentationPage = await db.query.documentationPages.findFirst({
		where: {
			entity: {
				slug,
			},
		},
		columns: {
			id: true,
			title: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
			},
		},
	});

	if (documentationPage == null) {
		notFound();
	}

	const contentBlocks = await getEntityContentBlocks(documentationPage.id);

	return (
		<DocumentationPageDetails contentBlocks={contentBlocks} documentationPage={documentationPage} />
	);
}
