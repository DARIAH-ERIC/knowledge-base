import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/components/main";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("UnauthorizedPage");

	const metadata: Metadata = {
		title: t("meta.title"),
		/**
		 * Automatically set by next.js.
		 *
		 * @see {@link https://nextjs.org/docs/app/api-reference/functions/unauthorized}
		 */
		// robots: {
		// 	index: false,
		// },
	};

	return metadata;
}

export default function UnauthorizedPage(): ReactNode {
	const t = useTranslations("UnauthorizedPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
		</Main>
	);
}
