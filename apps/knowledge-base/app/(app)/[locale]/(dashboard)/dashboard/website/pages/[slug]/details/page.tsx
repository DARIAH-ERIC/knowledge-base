import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PageItemDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-details";
import { discardPageItemDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/discard-page-item-draft.action";
import { publishPageItemAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_lib/publish-page-item.action";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getDocumentVersions } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsitePageItemDetailsPageProps extends PageProps<"/[locale]/dashboard/website/pages/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsitePageItemDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Page details"),
	});

	return metadata;
}

export default async function DashboardWebsitePageItemDetailsPage(
	props: Readonly<DashboardWebsitePageItemDetailsPageProps>,
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

	const pageItem = await db.query.pages.findFirst({
		where: { id: versionId },
		columns: {
			id: true,
			title: true,
			summary: true,
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
			image: {
				columns: {
					key: true,
					label: true,
				},
			},
		},
	});

	if (pageItem == null) {
		notFound();
	}

	const image = pageItem.image
		? images.generateSignedImageUrl({
				key: pageItem.image.key,
				options: imageGridOptions,
			})
		: null;

	const contentBlocks = await getEntityContentBlocks(pageItem.id);

	return (
		<PageItemDetails
			contentBlocks={contentBlocks}
			discardDraftAction={discardPageItemDraftAction}
			documentId={doc.id}
			hasDraft={draftId != null}
			isPublished={publishedId != null}
			pageItem={{
				...pageItem,
				image: pageItem.image ? { ...pageItem.image, url: image!.url } : null,
			}}
			publishAction={publishPageItemAction}
			selectedVersion={selectedVersion}
		/>
	);
}
