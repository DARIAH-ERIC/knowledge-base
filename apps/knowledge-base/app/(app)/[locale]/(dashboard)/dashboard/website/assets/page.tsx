import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { getAssets } from "@/lib/queries/assets";

interface DashboardWebsiteAssetsPageProps extends PageProps<"/[locale]/dashboard/website/assets"> {}

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteAssetsPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardWebsiteAssetsPage(_props: Readonly<DashboardWebsiteAssetsPageProps>): ReactNode {

	const t = useTranslations("DashboardWebsiteAssetsPage");

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>
			<Suspense>
				<ImageGrid />
			</Suspense>
			<ImageUploadForm />
		</Main>
	);
}

async function ImageGrid(): Promise<ReactNode> {
	// TODO: image width config
	const urls = await getAssets();

	return (
		<ul className="grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-6" role="list">
			{urls.map((url) => {
				return (
					<li key={url}>
						<figure>
							<img alt="" src={url} />
						</figure>
					</li>
				);
			})}
		</ul>
	);
}

function ImageUploadForm(): ReactNode {
	return (
		<form>
			<label>
				<span>Upload file</span>
			<input type="file" />
			</label>
		</form>
	)
}
