import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { ContactForm } from "@/app/(app)/[locale]/(default)/contact/_components/contact-form";
import { PublicContentBlocksView } from "@/components/content-blocks-view";
import { findPublishedInternalPageContent } from "@/lib/data/cached/internal-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface ContactPageProps extends PageProps<"/[locale]/contact"> {}

export async function generateMetadata(
	_props: Readonly<ContactPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();
	const page = await findPublishedInternalPageContent("contact");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: page?.title ?? t("Contact"),
	});

	return metadata;
}

export default async function ContactPage(_props: Readonly<ContactPageProps>): Promise<ReactNode> {
	const t = await getExtracted();
	const page = await findPublishedInternalPageContent("contact");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex max-inline-(--breakpoint-md) flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">
					{page?.title ?? t("Contact")}
				</h1>
				{page != null && page.contentBlocks.length > 0 ? (
					<PublicContentBlocksView contentBlocks={page.contentBlocks} />
				) : null}
			</section>

			<section className="max-inline-(--breakpoint-md) py-6">
				<ContactForm />
			</section>
		</Main>
	);
}
