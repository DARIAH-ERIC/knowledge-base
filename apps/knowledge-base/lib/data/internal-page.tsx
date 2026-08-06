import type * as schema from "@dariah-eric/database/schema";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { PublicContentBlocksView } from "@/components/content-blocks-view";
import { getResolvedEntityContentBlocks } from "@/lib/content-blocks-service";
import { db } from "@/lib/db";

export async function findPublishedInternalPage(
	slug: string,
): Promise<Pick<schema.InternalPage, "id" | "title"> | null> {
	const page = await db.query.internalPages.findFirst({
		where: {
			entityVersion: {
				entity: {
					slug,
				},
				status: {
					type: "published",
				},
			},
		},
		columns: {
			id: true,
			title: true,
		},
	});

	return page ?? null;
}

export async function getPublishedInternalPage(
	slug: string,
): Promise<Pick<schema.InternalPage, "id" | "title">> {
	const page = await findPublishedInternalPage(slug);

	if (page == null) {
		notFound();
	}

	return page;
}

export interface PublishedInternalPageContent {
	title: string;
	contentBlocks: Array<ContentBlock>;
}

/**
 * For pages which are only partly editable — the contact page keeps its form, the home page keeps
 * its session-dependent call to action — and therefore must still render when their internal page
 * is unpublished, instead of `notFound()`.
 */
export async function findPublishedInternalPageContent(
	slug: string,
): Promise<PublishedInternalPageContent | null> {
	const page = await findPublishedInternalPage(slug);

	if (page == null) {
		return null;
	}

	return {
		title: page.title,
		contentBlocks: await getResolvedEntityContentBlocks(page.id, "content"),
	};
}

interface InternalPageViewProps {
	slug: string;
}

export async function InternalPageView(props: Readonly<InternalPageViewProps>): Promise<ReactNode> {
	const { slug } = props;

	const page = await getPublishedInternalPage(slug);
	const contentBlocks = await getResolvedEntityContentBlocks(page.id, "content");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex max-inline-(--breakpoint-md) flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">{page.title}</h1>
				{contentBlocks.length > 0 ? (
					<PublicContentBlocksView contentBlocks={contentBlocks} />
				) : null}
			</section>
		</Main>
	);
}
