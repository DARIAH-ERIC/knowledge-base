import { db } from "@dariah-eric/database";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { SocialMediaEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_components/social-media-edit-form";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditSocialMediaPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditSocialMediaPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit social media"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditSocialMediaPage(
	props: Readonly<DashboardAdministratorEditSocialMediaPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const socialMedia = await db.query.socialMedia.findFirst({
		where: { id },
		columns: { id: true, name: true, url: true, duration: true },
		with: { type: { columns: { type: true } } },
	});

	if (socialMedia == null) {
		notFound();
	}

	const durationStart =
		socialMedia.duration?.start != null
			? socialMedia.duration.start.toISOString().slice(0, 10)
			: null;

	const durationEnd =
		socialMedia.duration?.end != null ? socialMedia.duration.end.toISOString().slice(0, 10) : null;

	return <SocialMediaEditForm socialMedia={{ ...socialMedia, durationStart, durationEnd }} />;
}
