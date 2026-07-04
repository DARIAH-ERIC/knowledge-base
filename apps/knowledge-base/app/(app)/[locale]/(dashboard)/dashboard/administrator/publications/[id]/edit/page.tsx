import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PublicationEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/publications/_components/publication-edit-form";
import { assertAuthenticated } from "@/lib/auth/session";
import {
	getPublicationByIdForAdmin,
	getPublicationFormOptionsForAdmin,
} from "@/lib/data/publications";
import { createMetadata } from "@/lib/server/create-metadata";

export async function generateMetadata(
	_props: unknown,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit publication"),
	});
}

export default async function Page(
	props: Readonly<PageProps<"/[locale]/dashboard/administrator/publications/[id]/edit">>,
): Promise<ReactNode> {
	const [{ id }, { user }] = await Promise.all([props.params, assertAuthenticated()]);
	const [publication, options] = await Promise.all([
		getPublicationByIdForAdmin(user, id),
		getPublicationFormOptionsForAdmin(user),
	]);
	if (publication == null) {
		notFound();
	}
	return <PublicationEditForm {...options} publication={publication} />;
}
