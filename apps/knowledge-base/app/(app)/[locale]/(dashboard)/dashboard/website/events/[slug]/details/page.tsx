import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { EventDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-details";
import { discardEventDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/discard-event-draft.action";
import { publishEventAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_lib/publish-event.action";
import { imageGridOptions } from "@/config/assets.config";
import { getEntityContentBlocks } from "@/lib/content-blocks-service";
import { getDocumentVersions } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteEventDetailsPageProps extends PageProps<"/[locale]/dashboard/website/events/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteEventDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Website dashboard - Event details"),
	});

	return metadata;
}

export default async function DashboardWebsiteEventDetailsPage(
	props: Readonly<DashboardWebsiteEventDetailsPageProps>,
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

	const event = await db.query.events.findFirst({
		where: { id: versionId },
		columns: {
			id: true,
			duration: true,
			location: true,
			title: true,
			summary: true,
			website: true,
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

	if (event == null) {
		notFound();
	}

	const image = images.generateSignedImageUrl({
		key: event.image.key,
		options: imageGridOptions,
	});

	const contentBlocks = await getEntityContentBlocks(event.id);

	return (
		<EventDetails
			contentBlocks={contentBlocks}
			discardDraftAction={discardEventDraftAction}
			documentId={doc.id}
			event={{ ...event, image: { ...event.image, url: image.url } }}
			hasDraft={draftId != null}
			isPublished={publishedId != null}
			publishAction={publishEventAction}
			selectedVersion={selectedVersion}
		/>
	);
}
