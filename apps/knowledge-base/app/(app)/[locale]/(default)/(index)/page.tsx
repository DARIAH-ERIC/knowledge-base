import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

export function generateMetadata(): Metadata {
	const metadata: Metadata = {
		/**
		 * Fall back to `title.default` from `layout.tsx`.
		 *
		 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata#title}
		 */
		// title: undefined,
	};

	return metadata;
}

export default function IndexPage(): ReactNode {
	const t = useTranslations("IndexPage");

	return (
		<Fragment>
			<h1>{t("title")}</h1>
			<p></p>
		</Fragment>
	);
}
