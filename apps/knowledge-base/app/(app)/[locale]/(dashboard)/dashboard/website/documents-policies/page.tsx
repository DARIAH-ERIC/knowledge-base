import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { DocumentsPoliciesPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/documents-policies/_components/documents-policies-page";
import { getDocumentsPolicies } from "@/lib/data/cached/documents-policies";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteDocumentsPoliciesPageProps extends PageProps<"/[locale]/dashboard/website/documents-policies"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteDocumentsPoliciesPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Documents and policies"),
	});

	return metadata;
}

export default function DashboardWebsiteDocumentsPoliciesPage(
	_props: Readonly<DashboardWebsiteDocumentsPoliciesPageProps>,
): ReactNode {
	const documentsPolicies = getDocumentsPolicies({ limit: 500 });

	return (
		<Suspense fallback={<LoadingScreen />}>
			<DocumentsPoliciesPage documentsPolicies={documentsPolicies} />
		</Suspense>
	);
}
