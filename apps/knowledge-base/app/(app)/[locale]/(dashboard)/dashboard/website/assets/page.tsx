import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { UploadImageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/upload-image-form";
import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { imageGridOptions } from "@/config/assets.config";
import { getAssets } from "@/lib/queries/assets";

interface DashboardWebsiteAssetsPageProps extends PageProps<"/[locale]/dashboard/website/assets"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteAssetsPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteAssetsPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardWebsiteAssetsPage(
	_props: Readonly<DashboardWebsiteAssetsPageProps>,
): ReactNode {
	const t = useTranslations("DashboardWebsiteAssetsPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>

			<UploadImageForm />

			<Suspense>
				<ImageGrid />
			</Suspense>
		</Main>
	);
}

async function ImageGrid(): Promise<ReactNode> {
	const urls = await getAssets(imageGridOptions);

	return (
		<ul
			className="grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-6 content-start"
			role="list"
		>
			{urls.map((url) => {
				return (
					<li key={url}>
						<figure>
							<img alt="" className="object-cover" src={url} />
						</figure>
					</li>
				);
			})}
		</ul>
	);
}
