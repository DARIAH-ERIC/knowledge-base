import { ButtonLink } from "@dariah-eric/ui/button-link";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { HeroSection, PublicContentBlocksView } from "@/components/content-blocks-view";
import { getCurrentSession } from "@/lib/auth/session";
import { findPublishedInternalPageContent } from "@/lib/data/cached/internal-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface IndexPageProps extends PageProps<"/[locale]"> {}

export async function generateMetadata(
	_props: Readonly<IndexPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		/**
		 * Fall back to `title.default` from `layout.tsx`.
		 *
		 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata#title}
		 */
	});

	return metadata;
}

export default async function IndexPage(_props: Readonly<IndexPageProps>): Promise<ReactNode> {
	const t = await getExtracted();
	const { session } = await getCurrentSession();
	const page = await findPublishedInternalPageContent("home");

	const cta =
		session == null
			? { href: "/auth/sign-in", label: t("Sign in") }
			: { href: "/dashboard", label: t("Go to dashboard") };

	/**
	 * The primary action is the one thing on this screen an editor cannot configure: where it goes
	 * and what it says depend on whether the visitor is signed in.
	 */
	const sessionCta = (
		<ButtonLink className="min-inline-40" href={cta.href} size="lg">
			{cta.label}
		</ButtonLink>
	);

	/**
	 * A leading hero block is the landing screen itself, so it supplies the `h1` in place of the page
	 * title and takes the session action into its button row. Any blocks after it read as the body of
	 * the page. Without one — an editor removed it — the page title carries the heading.
	 */
	const [leadingBlock, ...trailingBlocks] = page?.contentBlocks ?? [];
	const hero = leadingBlock?.type === "hero" ? leadingBlock : null;
	const bodyBlocks = hero != null ? trailingBlocks : (page?.contentBlocks ?? []);

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex min-block-full flex-col items-center justify-center gap-y-8 py-24">
				{hero != null ? (
					<HeroSection content={hero.content} ctaSlot={sessionCta} headingLevel="h1" />
				) : (
					<Fragment>
						<h1 className="text-center text-6xl font-extrabold tracking-tight text-text-strong">
							{page?.title ?? t("DARIAH Knowledge Base")}
						</h1>
						<div className="flex flex-col gap-3 sm:flex-row">{sessionCta}</div>
					</Fragment>
				)}
				{bodyBlocks.length > 0 ? (
					<div className="max-inline-(--breakpoint-md)">
						<PublicContentBlocksView contentBlocks={bodyBlocks} />
					</div>
				) : null}
			</section>
		</Main>
	);
}
