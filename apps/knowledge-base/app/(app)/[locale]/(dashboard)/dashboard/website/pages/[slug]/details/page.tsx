import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PageItemDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/pages/_components/page-details";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
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
	const { params } = props;

	const { slug } = await params;

	const pageItem = await db.query.pages.findFirst({
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
			pageItem={{
				...pageItem,
				image: pageItem.image ? { ...pageItem.image, url: image!.url } : null,
			}}
		/>
	);
}
