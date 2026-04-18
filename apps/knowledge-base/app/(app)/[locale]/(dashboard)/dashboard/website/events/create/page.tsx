import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { EventCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/events/_components/event-create-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getAvailableEntities, getAvailableResources } from "@/lib/data/relations";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardWebsiteCreateEventPageProps extends PageProps<"/[locale]/dashboard/website/events/create"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteCreateEventPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Create event"),
	});

	return metadata;
}

export default async function DashboardWebsiteCreateEventPage(
	_props: Readonly<DashboardWebsiteCreateEventPageProps>,
): Promise<ReactNode> {
	const [{ items: initialAssets }, relatedEntities, relatedResources] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "images" }),
		getAvailableEntities(),
		getAvailableResources(),
	]);

	return (
		<EventCreateForm
			initialAssets={initialAssets}
			relatedEntities={relatedEntities}
			relatedResources={relatedResources}
		/>
	);
}
