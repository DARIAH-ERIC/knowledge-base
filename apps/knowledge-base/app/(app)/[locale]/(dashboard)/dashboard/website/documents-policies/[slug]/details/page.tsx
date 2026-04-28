import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentOrPolicyDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-details";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteDocumentOrPolicyDetailsPageProps extends PageProps<"/[locale]/dashboard/website/documents-policies/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteDocumentOrPolicyDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Document or policy details"),
	});

	return metadata;
}

export default async function DashboardWebsiteDocumentOrPolicyDetailsPage(
	props: Readonly<DashboardWebsiteDocumentOrPolicyDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const documentOrPolicy = await db.query.documentsPolicies.findFirst({
		where: {
			entity: {
				slug,
			},
		},
		columns: {
			id: true,
			title: true,
			summary: true,
			url: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
			},
			document: {
				columns: {
					key: true,
					label: true,
				},
			},
		},
	});

	if (documentOrPolicy == null) {
		notFound();
	}

	const document = images.generateSignedImageUrl({
		key: documentOrPolicy.document.key,
		options: imageGridOptions,
	});

	const downloadUrl = `/api/assets/download?key=${encodeURIComponent(documentOrPolicy.document.key)}`;

	const contentBlocks = await getEntityContentBlocks(documentOrPolicy.id);

	return (
		<DocumentOrPolicyDetails
			contentBlocks={contentBlocks}
			documentOrPolicy={{
				...documentOrPolicy,
				document: { ...documentOrPolicy.document, url: document.url, downloadUrl },
			}}
		/>
	);
}
