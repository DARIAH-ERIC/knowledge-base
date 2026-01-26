import type { Metadata, ResolvingMetadata } from "next";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { createMetadata } from "@/lib/server/metadata";

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

export default function IndexPage(_props: Readonly<IndexPageProps>): ReactNode {
	const t = useTranslations("IndexPage");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex min-h-full flex-col items-center justify-center gap-y-4 py-24">
				<h1 className="text-center text-6xl font-extrabold tracking-tight text-text-strong">
					{t("title")}
				</h1>
				<p className="text-center text-2xl font-medium tracking-tight text-text-weak">
					{t("lead")}
				</p>
			</section>
		</Main>
	);
}
