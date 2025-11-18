import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { MainContent } from "@/app/(app)/[locale]/(default)/_components/main-content";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("TermsOfUsePage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function TermsOfUsePage(): ReactNode {
	const t = useTranslations("TermsOfUsePage");

	return (
		<MainContent className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">{t("title")}</h1>
			</section>
		</MainContent>
	);
}
