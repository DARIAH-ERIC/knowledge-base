import type { Metadata, ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { createMetadata } from "@/lib/server/metadata";

interface TermsOfUsePageProps extends PageProps<"/[locale]/terms-of-use"> {}

export async function generateMetadata(
	_props: Readonly<TermsOfUsePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("TermsOfUsePage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default function TermsOfUsePage(_props: Readonly<TermsOfUsePageProps>): ReactNode {
	const t = useTranslations("TermsOfUsePage");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">{t("title")}</h1>
			</section>
		</Main>
	);
}
