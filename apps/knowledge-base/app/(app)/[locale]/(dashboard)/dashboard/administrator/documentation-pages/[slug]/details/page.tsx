import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentationPageDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/documentation-pages/_components/documentation-page-details";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getDocumentVersions } from "@/lib/data/entity-lifecycle";
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
	const { params, searchParams: searchParamsPromise } = props;
	const { slug } = await params;

	const doc = await db.query.entities.findFirst({
		where: { slug },
		columns: { id: true },
	});

	if (doc == null) {
		notFound();
	}

	const { draftId, publishedId } = await db.transaction(async (tx) => {
		return getDocumentVersions(tx, doc.id);
	});

	const { version } = await searchParamsPromise;
	const selectedVersion: "draft" | "published" =
		version === "published" && publishedId != null ? "published" : "draft";
	const versionId =
		selectedVersion === "published" && publishedId != null ? publishedId : (draftId ?? publishedId);
	if (versionId == null) {
		notFound();
	}

	const documentationPage = await db.query.documentationPages.findFirst({
		where: { id: versionId },
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
		<DocumentationPageDetails
			contentBlocks={contentBlocks}
			documentationPage={documentationPage}
			documentId={doc.id}
			hasDraft={draftId != null}
			isPublished={publishedId != null}
			selectedVersion={selectedVersion}
		/>
	);
}
