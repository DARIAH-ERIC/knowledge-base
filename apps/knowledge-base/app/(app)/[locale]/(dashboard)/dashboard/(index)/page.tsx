import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { MainContent } from "@/app/(app)/[locale]/(dashboard)/_components/main-content";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("DashboardPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardPage(): ReactNode {
	const t = useTranslations("DashboardPage");

	return (
		<MainContent className="flex-1">
			<section className="flex flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-fg">{t("title")}</h1>
			</section>
		</MainContent>
	);
}
