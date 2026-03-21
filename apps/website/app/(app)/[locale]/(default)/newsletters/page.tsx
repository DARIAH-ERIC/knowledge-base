import { Link } from "@dariah-eric/ui/link";
import type { Metadata, ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { mailchimp } from "@/lib/mailchimp";
import { createMetadata } from "@/lib/server/create-metadata";

interface NewslettersPageProps extends PageProps<"/[locale]/imprint"> {}

export async function generateMetadata(
	_props: Readonly<NewslettersPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("NewslettersPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default function NewslettersPage(_props: Readonly<NewslettersPageProps>): ReactNode {
	const t = useTranslations("NewslettersPage");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">{t("title")}</h1>
			</section>
			<NewslettersList />
		</Main>
	);
}

async function NewslettersList(): Promise<ReactNode> {
	const newsletters = (await mailchimp.get()).unwrap().data.campaigns;

	return (
		<ul role="list">
			{newsletters.map((newsletter) => {
				return (
					<li key={newsletter.id}>
						<article>
							<h2>
								<Link href={newsletter.archive_url}>{newsletter.settings.title}</Link>
							</h2>
						</article>
					</li>
				);
			})}
		</ul>
	);
}
