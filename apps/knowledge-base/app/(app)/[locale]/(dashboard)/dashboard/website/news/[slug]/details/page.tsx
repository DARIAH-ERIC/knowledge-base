import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { NewsItemDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/news/_components/news-details";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteNewsItemDetailsPageProps extends PageProps<"/[locale]/dashboard/website/news/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteNewsItemDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - News Item details"),
	});

	return metadata;
}

export default async function DashboardWebsiteNewsItemDetailsPage(
	props: Readonly<DashboardWebsiteNewsItemDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const newsItem = await db.query.news.findFirst({
		where: {
			entity: {
				slug,
			},
		},
		columns: {
			id: true,
			title: true,
			summary: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
				with: {
					status: {
						columns: {
							id: true,
							type: true,
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

	if (newsItem == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: newsItem.image.key,
		options: imageGridOptions,
	});

	const contentBlocks = await getEntityContentBlocks(newsItem.id);

	return (
		<NewsItemDetails
			contentBlocks={contentBlocks}
			newsItem={{ ...newsItem, image: { ...newsItem.image, url: image.url } }}
		/>
	);
}
