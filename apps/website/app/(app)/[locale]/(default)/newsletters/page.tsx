import { isErr } from "@acdh-oeaw/lib";
import type { Metadata, ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { Link } from "@/components/link";
import { client } from "@/lib/mailchimp/client";
import { createMetadata } from "@/lib/server/metadata";

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
	const result = await client.get();

	if (isErr(result)) {
		throw result.error;
	}

	const data = result.value.data;

	return (
		<ul role="list">
			{data.campaigns.map((campaign) => {
				return (
					<li key={campaign.id}>
						<article>
							<h2>
								<Link href={campaign.archive_url}>{campaign.settings.title}</Link>
							</h2>
						</article>
					</li>
				);
			})}
		</ul>
	);
}
