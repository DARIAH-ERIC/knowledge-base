"use client";

import { assetPrefixes } from "@dariah-eric/storage/config";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { AssetPreview } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/asset-preview";
import {
	EntityListHeader,
	EntityListPagination,
	EntityListSearchField,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { EditAssetMetadataDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/edit-asset-metadata-dialog";
import { UploadImageDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/upload-image-dialog";
import { dashboardPageSize } from "@/config/pagination.config";
import { useRouter } from "@/lib/navigation/navigation";

interface AssetItem {
	id: string;
	key: string;
	label: string;
	alt: string | null;
	caption: string | null;
	licenseId: string | null;
	mimeType: string;
	url: string;
}

interface LicenseOption {
	id: string;
	code: string;
	name: string;
}

interface AssetsPageProps {
	assets: {
		items: Array<AssetItem>;
		total: number;
	};
	licenses: Array<LicenseOption>;
	page: number;
	prefix: string;
	q: string;
}

const pageSize = dashboardPageSize;

export function AssetsPage(props: Readonly<AssetsPageProps>): ReactNode {
	const { assets, licenses, page: initialPage, prefix: initialPrefix, q: initialQ } = props;

	const t = useExtracted();
	const router = useRouter();
	const search = useUrlPaginatedSearch({
		filters: { prefix: initialPrefix },
		page: initialPage,
		q: initialQ,
	});
	const selectedPrefix = search.filters.prefix !== "" ? search.filters.prefix : "all";
	const totalPages = Math.max(1, Math.ceil(assets.total / pageSize));

	return (
		<Fragment>
			<EntityListHeader
				title={t("Assets")}
				description={t("Manage all images in the media library.")}
				action={
					<Fragment>
						<EntityListSearchField search={search} placeholder={t("Search by label")} />

						<Select
							aria-label={t("Filter by prefix")}
							onChange={(key) => {
								const value = String(key);
								search.setFilter("prefix", value === "all" ? "" : value);
							}}
							value={selectedPrefix}
						>
							<SelectTrigger />
							<SelectContent>
								<SelectItem id="all">{t("All prefixes")}</SelectItem>
								{assetPrefixes.map((prefix) => (
									<SelectItem key={prefix} id={prefix}>
										{prefix}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<UploadImageDialog
							licenses={licenses}
							onSuccess={() => {
								router.refresh();
							}}
						/>
					</Fragment>
				}
			/>

			{assets.items.length === 0 ? (
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-center text-muted-fg text-sm">
						{search.inputValue !== "" || selectedPrefix !== "all"
							? t("No images match your filters.")
							: t("No images found. Upload one to get started.")}
					</p>
				</div>
			) : (
				<ul className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-4 content-start">
					{assets.items.map((asset) => {
						const prefix = asset.key.split("/")[0] ?? "";
						return (
							<li key={asset.id}>
								<figure className="flex flex-col gap-y-2">
									<div className="relative overflow-hidden rounded-lg bg-muted aspect-square">
										<AssetPreview
											alt={asset.alt ?? asset.label}
											className="block-full inline-full"
											imageClassName="object-cover"
											kindLabelClassName="bg-background/90 text-xs"
											mimeType={asset.mimeType}
											src={asset.url}
											storageKey={asset.key}
										/>
										<EditAssetMetadataDialog
											asset={asset}
											licenses={licenses}
											onSuccess={() => {
												router.refresh();
											}}
										/>
									</div>
									<figcaption className="flex flex-col gap-y-0.5 px-0.5">
										<span className="truncate text-sm/tight font-medium">{asset.label}</span>
										<span className="text-xs text-muted-fg">{prefix}</span>
									</figcaption>
								</figure>
							</li>
						);
					})}
				</ul>
			)}

			{totalPages > 1 ? (
				<EntityListPagination search={search} total={assets.total} pageSize={pageSize} />
			) : null}
		</Fragment>
	);
}
