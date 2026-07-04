import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PublicationCreateForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_components/publication-create-form";
import { assertAuthenticated } from "@/lib/auth/session";
import { getPublicationFormOptionsForAdmin } from "@/lib/data/publications";
import { createMetadata } from "@/lib/server/create-metadata";

export async function generateMetadata(
	_props: unknown,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - New publication"),
	});
}

export default async function Page(): Promise<ReactNode> {
	const { user } = await assertAuthenticated();
	const options = await getPublicationFormOptionsForAdmin(user);
	return <PublicationCreateForm {...options} />;
}
