import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { DocumentOrPolicyCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/document-or-policy-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteCreateDocumentOrPolicyPageProps extends PageProps<"/[locale]/dashboard/website/documents-policies/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteCreateDocumentOrPolicyPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Create document or policy"),
	});

	return metadata;
}

export default async function DashboardWebsiteCreateDocumentOrPolicyPage(
	_props: Readonly<DashboardWebsiteCreateDocumentOrPolicyPageProps>,
): Promise<ReactNode> {
	const { items: initialAssets } = await getMediaLibraryAssets({
		imageUrlOptions: imageGridOptions,
		prefix: "documents",
	});

	return <DocumentOrPolicyCreateForm initialAssets={initialAssets} />;
}
