import { createUrlSearchParams } from "@acdh-oeaw/lib";
import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import * as v from "valibot";

import { ImageGrid } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/image-grid";
import { UploadImageForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/upload-image-form";
import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { Link } from "@/components/link";
import { imageGridOptions } from "@/config/assets.config";
import { getAssets } from "@/lib/data/cached/assets";
import { createHref } from "@/lib/navigation/create-href";
import { createMetadata } from "@/lib/server/metadata";

const SearchParamsSchema = v.object({
	limit: v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)), "10"),
	offset: v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(0)), "0"),
});

interface DashboardWebsiteAssetsPageProps extends PageProps<"/[locale]/dashboard/website/assets"> {}

export async function generateMetadata(
	_props: Readonly<DashboardWebsiteAssetsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("DashboardWebsiteAssetsPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function DashboardWebsiteAssetsPage(
	props: Readonly<DashboardWebsiteAssetsPageProps>,
): Promise<ReactNode> {
	const { searchParams } = props;

	const t = await getTranslations("DashboardWebsiteAssetsPage");

	const { limit, offset } = await v.parseAsync(SearchParamsSchema, await searchParams);

	const { urls, total } = await getAssets({ imageUrlOptions: imageGridOptions, limit, offset });

	return (
		<Main className="flex-1">
			<h1 className="px-2 text-3xl font-semibold tracking-tight text-text-strong">{t("title")}</h1>

			<UploadImageForm />

			<Suspense>
				<ImageGrid urls={urls} />
			</Suspense>

			<div className="flex items-center justify-between gap-x-6 py-2">
				<Link
					href={createHref({
						searchParams: createUrlSearchParams({
							limit,
							offset: Math.max(offset - limit, 0),
						}),
					})}
					// eslint-disable-next-line react/jsx-no-literals
				>
					Previous
				</Link>
				<Link
					href={createHref({
						searchParams: createUrlSearchParams({
							limit,
							offset: Math.min(offset + limit, total - 1),
						}),
					})}
					// eslint-disable-next-line react/jsx-no-literals
				>
					Next
				</Link>
			</div>
		</Main>
	);
}
